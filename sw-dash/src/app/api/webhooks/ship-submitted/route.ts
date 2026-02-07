import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { bust } from '@/lib/cache'
import { syslog } from '@/lib/syslog'
import { checkType } from '@/lib/typecheck'

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
  const userAgent = request.headers.get('user-agent') || 'unknown'

  let body: any
  try {
    body = await request.json()
  } catch (e) {
    await syslog(
      'ft_err',
      400,
      null,
      'json parse broke',
      { ip, userAgent },
      { severity: 'warn', metadata: { reason: 'parse', body: null } }
    )
    return NextResponse.json({ error: 'json broke' }, { status: 400 })
  }

  try {
    const apiKey = request.headers.get('x-api-key')
    if (apiKey !== process.env.FLAVORTOWN_API_KEY) {
      await syslog(
        'ft_err',
        401,
        null,
        'wrong api key',
        { ip, userAgent },
        { severity: 'warn', metadata: { reason: 'auth', body, key: apiKey?.substring(0, 8) } }
      )
      return NextResponse.json({ error: 'nah who tf are you' }, { status: 401 })
    }

    const { event, data } = body

    if (event !== 'ship.submitted') {
      await syslog(
        'ft_err',
        400,
        null,
        'unknown event',
        { ip, userAgent },
        { severity: 'warn', metadata: { reason: 'event', body, event } }
      )
      return NextResponse.json({ error: 'bruh what event is this' }, { status: 400 })
    }

    const {
      id: ftProjectId,
      projectName,
      projectType,
      description,
      submittedBy,
      links,
      metadata,
      type: ftType,
    } = data || {}

    if (!ftProjectId || !projectName || !submittedBy?.slackId) {
      await syslog(
        'ft_err',
        400,
        null,
        'missing core fields',
        { ip, userAgent },
        {
          severity: 'warn',
          metadata: {
            reason: 'fields',
            body,
            has: { id: !!ftProjectId, name: !!projectName, slack: !!submittedBy?.slackId },
          },
        }
      )
      return NextResponse.json(
        { error: 'missing project ID, Project name, and submitted By slack ID fields' },
        { status: 400 }
      )
    }

    if (!description || !links?.repo || !links?.demo || !links?.readme) {
      await syslog(
        'ft_err',
        400,
        null,
        'missing links/desc',
        { ip, userAgent },
        {
          severity: 'warn',
          metadata: {
            reason: 'links',
            body,
            has: {
              desc: !!description,
              repo: !!links?.repo,
              demo: !!links?.demo,
              readme: !!links?.readme,
            },
          },
        }
      )
      return NextResponse.json({ error: 'missing description and links' }, { status: 400 })
    }

    const existing = await prisma.shipCert.findFirst({
      where: {
        ftProjectId: String(ftProjectId),
        status: 'pending',
      },
    })

    if (existing) {
      await syslog(
        'ft_dup_blocked',
        403,
        null,
        `dup blocked: ${projectName} (ft#${ftProjectId}) - already pending`,
        { ip, userAgent },
        { metadata: { ftProjectId, existingCertId: existing.id } }
      )
      return NextResponse.json({ error: 'duplicate ship, already in the queue!' }, { status: 403 })
    }

    const cert = await prisma.shipCert.create({
      data: {
        ftProjectId: String(ftProjectId),
        ftSlackId: submittedBy.slackId,
        ftUsername: submittedBy.username || 'unknown',
        ftType: ftType || null,
        projectName,
        projectType: projectType || null,
        description: description || null,
        demoUrl: links?.demo || null,
        repoUrl: links?.repo || null,
        readmeUrl: links?.readme || null,
        devTime: metadata?.devTime
          ? `${Math.floor(metadata.devTime / 3600)}h ${Math.floor((metadata.devTime % 3600) / 60)}m`
          : null,
        status: 'pending',
      },
    })

    await syslog(
      'ft_webhook_received',
      200,
      null,
      `new ship cert from ft: ${projectName}`,
      { ip, userAgent },
      {
        targetId: cert.id,
        targetType: 'ship_cert',
        metadata: {
          ftProjectId,
          projectName,
          projectType,
          slackId: submittedBy.slackId,
          username: submittedBy.username,
          demo: links?.demo,
          repo: links?.repo,
          readme: links?.readme,
        },
      }
    )
    await bust('cache:certs:*')

    try {
      const result = await checkType({
        title: projectName,
        desc: description || '',
        readmeUrl: links?.readme || '',
        demoUrl: links?.demo || '',
        repoUrl: links?.repo || '',
      })
      if (!result.debug.error) {
        await prisma.shipCert.update({ where: { id: cert.id }, data: { projectType: result.type } })
        await syslog(
          'type_check_done',
          200,
          null,
          `${projectName} -> ${result.type}`,
          {},
          { targetId: cert.id, targetType: 'ship_cert', metadata: result.debug }
        )
      } else {
        await syslog(
          'type_check_fail',
          500,
          null,
          `failed: ${projectName}`,
          {},
          { targetId: cert.id, targetType: 'ship_cert', severity: 'error', metadata: result.debug }
        )
      }
    } catch (e) {
      await syslog(
        'type_check_crash',
        500,
        null,
        `type check crashed for ${projectName}`,
        {},
        {
          targetId: cert.id,
          targetType: 'ship_cert',
          severity: 'error',
          metadata: { error: (e as Error).message },
        }
      )
    }

    return NextResponse.json({ status: 'ok' })
  } catch (error: any) {
    await syslog(
      'ft_err',
      500,
      null,
      'handler exploded',
      { ip, userAgent },
      { severity: 'error', metadata: { reason: 'crash', body, error: error?.message } }
    )
    return NextResponse.json({ error: 'something broke on our end' }, { status: 500 })
  }
}
