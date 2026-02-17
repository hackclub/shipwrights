import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { bust } from '@/lib/cache'
import { log } from '@/lib/log'
import { checkType } from '@/lib/typecheck'

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
  const userAgent = request.headers.get('user-agent') || 'unknown'

  let body: any
  try {
    body = await request.json()
  } catch (e) {
    await log({
      action: 'ft_ship_failed',
      status: 400,
      context: 'json broke',
      meta: { ip, ua: userAgent },
    })
    return NextResponse.json({ error: 'json broke' }, { status: 400 })
  }

  try {
    const apiKey = request.headers.get('x-api-key')
    if (apiKey !== process.env.FLAVORTOWN_API_KEY) {
      await log({
        action: 'ft_ship_blocked',
        status: 401,
        context: 'wrong api key',
        meta: { ip, ua: userAgent, keyPrefix: apiKey?.substring(0, 8) },
      })
      return NextResponse.json({ error: 'who tf are you' }, { status: 401 })
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
    } = body || {}

    if (!ftProjectId || !projectName || !submittedBy?.slackId) {
      await log({
        action: 'ft_ship_failed',
        status: 400,
        context: 'missing core fields',
        meta: {
          ip,
          ua: userAgent,
          missing: { id: !ftProjectId, name: !projectName, slack: !submittedBy?.slackId },
        },
      })
      return NextResponse.json({ error: 'missing project ID, name, or slack ID' }, { status: 400 })
    }

    if (!description || !links?.repo || !links?.demo || !links?.readme) {
      await log({
        action: 'ft_ship_failed',
        status: 400,
        context: 'missing links or description',
        meta: {
          ip,
          ua: userAgent,
          missing: {
            desc: !description,
            repo: !links?.repo,
            demo: !links?.demo,
            readme: !links?.readme,
          },
        },
      })
      return NextResponse.json({ error: 'missing description or links' }, { status: 400 })
    }

    const existing = await prisma.shipCert.findFirst({
      where: {
        ftProjectId: String(ftProjectId),
        status: { in: ['pending', 'approved'] },
      },
    })

    if (existing) {
      await log({
        action: 'ft_ship_blocked',
        status: 409,
        context: 'duplicate ship - already exists',
        target: { type: 'ship_cert', id: existing.id },
        meta: {
          ip,
          ua: userAgent,
          ftProjectId,
          projectName,
          existingCertId: existing.id,
          existingStatus: existing.status,
          submitter: submittedBy.slackId,
        },
      })
      return NextResponse.json(
        { error: 'duplicate ship - already in queue', shipCertId: existing.id },
        { status: 409 }
      )
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

    await log({
      action: 'ft_ship_submitted',
      status: 201,
      context: `new ship from FT: ${projectName}`,
      target: { type: 'ship_cert', id: cert.id },
      meta: {
        ip,
        ua: userAgent,
        ftProjectId,
        projectName,
        projectType,
        ftType,
        submitterSlackId: submittedBy.slackId,
        submitterUsername: submittedBy.username,
      },
    })

    await bust('cache:certs:*')

    checkType({
      title: projectName,
      desc: description || '',
      readmeUrl: links?.readme || '',
      demoUrl: links?.demo || '',
      repoUrl: links?.repo || '',
    })
      .then(async (result) => {
        if (!result.debug.error) {
          await prisma.shipCert.update({
            where: { id: cert.id },
            data: { projectType: result.type },
          })
          await log({
            action: 'ship_cert_type_checked',
            status: 200,
            context: `type detected: ${result.type}`,
            target: { type: 'ship_cert', id: cert.id },
            meta: { projectName, detectedType: result.type },
          })
        }
      })
      .catch(async (e) => {
        await log({
          action: 'ship_cert_type_check_failed',
          status: 500,
          context: 'type check crashed',
          target: { type: 'ship_cert', id: cert.id },
          error: {
            name: (e as Error).name || 'Error',
            message: (e as Error).message || 'unknown',
            stack: (e as Error).stack,
          },
        })
      })

    return NextResponse.json({ status: 'ok', shipCertId: cert.id }, { status: 201 })
  } catch (error: any) {
    await log({
      action: 'ft_ship_failed',
      status: 500,
      context: 'shit exploded',
      error: {
        name: error?.name || 'Error',
        message: error?.message || 'unknown',
        stack: error?.stack,
      },
      meta: { ip, ua: userAgent },
    })
    return NextResponse.json({ error: 'oops server broke' }, { status: 500 })
  }
}
