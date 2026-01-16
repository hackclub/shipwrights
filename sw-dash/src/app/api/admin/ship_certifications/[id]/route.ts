import { NextResponse, after } from 'next/server'
import { can, PERMS } from '@/lib/perms'
import { prisma } from '@/lib/db'
import { syslog } from '@/lib/syslog'
import { parseId, idErr } from '@/lib/utils'
import { syncFt } from '@/lib/flavortown-client'
import { bust } from '@/lib/cache'
import { calc } from '@/lib/payouts'
import { withParams } from '@/lib/api'
import { create as createYsws } from '@/lib/ysws'

interface InternalNote {
  id: string
  userId: number
  username: string
  avatar: string | null
  note: string
  createdAt: string
}

export const GET = withParams(PERMS.certs_view)(async ({ params }) => {
  try {
    const shipId = parseId(params.id, 'ship ID')

    if (!shipId) {
      return idErr('ship ID')
    }

    const cert = await prisma.shipCert.findUnique({
      where: { id: shipId },
      include: {
        reviewer: {
          select: {
            id: true,
            username: true,
            avatar: true,
          },
        },
        assignments: {
          select: {
            id: true,
            status: true,
            createdAt: true,
            assignee: {
              select: {
                username: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    })

    if (!cert) {
      return NextResponse.json({ error: 'ship doesnt exist dipshit' }, { status: 404 })
    }

    let internalNotes: InternalNote[] = []
    if (cert.internalNotes) {
      try {
        internalNotes = JSON.parse(cert.internalNotes)
      } catch {
        internalNotes = []
      }
    }

    return NextResponse.json({
      id: cert.id,
      ftId: cert.ftProjectId,
      project: cert.projectName,
      type: cert.projectType,
      desc: cert.description,
      devTime: cert.devTime,
      submitter: {
        slackId: cert.ftSlackId,
        username: cert.ftUsername,
      },
      links: {
        demo: cert.demoUrl,
        repo: cert.repoUrl,
        readme: cert.readmeUrl,
      },
      status: cert.status,
      feedback: cert.reviewFeedback,
      proofVideo: cert.proofVideoUrl,
      reviewer: cert.reviewer
        ? {
            username: cert.reviewer.username,
            avatar: cert.reviewer.avatar,
          }
        : null,
      syncedToFt: cert.syncedToFt,
      assignment: cert.assignments[0]
        ? {
            id: cert.assignments[0].id,
            status: cert.assignments[0].status,
            assignee: cert.assignments[0].assignee?.username || null,
            createdAt: cert.assignments[0].createdAt.toISOString(),
          }
        : null,
      notes: internalNotes.map((note) => ({
        id: note.id,
        text: note.note,
        createdAt: note.createdAt,
        author: {
          username: note.username,
          avatar: note.avatar,
        },
      })),
      createdAt: cert.createdAt.toISOString(),
      updatedAt: cert.updatedAt.toISOString(),
      customBounty: cert.customBounty,
    })
  } catch {
    return NextResponse.json({ error: 'shit hit the fan loading ship details' }, { status: 500 })
  }
})

export const PATCH = withParams(PERMS.certs_edit)(async ({ user, req, params, ip, ua }) => {
  try {
    const shipId = parseId(params.id, 'ship ID')
    const body = await req.json()

    if (!shipId) {
      return idErr('ship ID')
    }

    const { verdict, certifierId, proofVideoUrl, reviewFeedback, projectType, customBounty } = body

    const updateData: {
      status?: string
      reviewCompletedAt?: Date
      reviewStartedAt?: Date
      reviewerId?: number
      claimerId?: number | null
      proofVideoUrl?: string
      reviewFeedback?: string
      syncedToFt?: boolean
      cookiesEarned?: number
      payoutMulti?: number
      projectType?: string
      customBounty?: number | null
    } = {}

    const cert = await prisma.shipCert.findUnique({
      where: { id: shipId },
    })

    if (!cert) {
      return NextResponse.json({ error: 'ship doesnt exist dipshit' }, { status: 404 })
    }

    if (verdict && cert.status !== 'pending') {
      if (!can(user.role, PERMS.certs_override)) {
        return NextResponse.json({ error: 'nah, u cant override decisions' }, { status: 403 })
      }
    }

    if (verdict && cert.status === 'pending') {
      const now = new Date()
      const thirtyMinsAgo = new Date(now.getTime() - 30 * 60 * 1000)

      if (cert.reviewStartedAt && cert.claimerId) {
        if (cert.reviewStartedAt > thirtyMinsAgo) {
          if (cert.claimerId !== user.id && user.role !== 'megawright') {
            return NextResponse.json(
              {
                error: "it's already claimed!",
              },
              { status: 423 }
            )
          }
        }
      }
    }

    if (verdict) {
      updateData.status = verdict.toLowerCase()
      updateData.reviewCompletedAt = new Date()
      updateData.reviewerId = user.id
      updateData.claimerId = null

      if (!cert.reviewStartedAt) {
        updateData.reviewStartedAt = new Date()
      }

      if (verdict.toLowerCase() === 'approved' || verdict.toLowerCase() === 'rejected') {
        const payout = await calc(user.id, cert.projectType, cert.customBounty)
        updateData.cookiesEarned = payout.cookies
        updateData.payoutMulti = payout.multi
      }
    }

    if (certifierId !== undefined) {
      updateData.reviewerId = certifierId
    }

    if (proofVideoUrl !== undefined) {
      updateData.proofVideoUrl = proofVideoUrl
    }

    if (reviewFeedback) {
      updateData.reviewFeedback = reviewFeedback
    }

    if (projectType !== undefined) {
      updateData.projectType = projectType
      await syslog(
        'certs_type_override',
        200,
        user,
        `type -> ${projectType}`,
        { ip, userAgent: ua },
        { targetId: shipId, targetType: 'ship_cert' }
      )
    }

    if (customBounty !== undefined) {
      if (!can(user.role, PERMS.certs_bounty)) {
        return NextResponse.json({ error: 'u aint got bounty perms' }, { status: 403 })
      }
      updateData.customBounty = customBounty
    }

    const updated = await prisma.shipCert.update({
      where: { id: shipId },
      data: updateData,
      include: {
        reviewer: true,
      },
    })

    if (updateData.cookiesEarned && updateData.cookiesEarned > 0) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          cookieBalance: { increment: updateData.cookiesEarned },
          cookiesEarned: { increment: updateData.cookiesEarned },
        },
      })
    }

    if (
      verdict &&
      (verdict.toLowerCase() === 'approved' ||
        verdict.toLowerCase() === 'rejected' ||
        verdict.toLowerCase() === 'pending')
    ) {
      if (updated.ftProjectId) {
        try {
          const synced = await syncFt(
            updated.ftProjectId,
            verdict.toLowerCase() as 'approved' | 'rejected' | 'pending',
            updated.reviewFeedback || '',
            updated.proofVideoUrl || undefined,
            updated.id,
            updated.projectType
          )
          if (synced) {
            await prisma.shipCert.update({
              where: { id: shipId },
              data: { syncedToFt: true },
            })
          }
        } catch (err) {
          console.error('flavortown sync failed:', err)
        }
      }

      if (verdict.toLowerCase() === 'approved' && updated.ftProjectId) {
        const ftId = updated.ftProjectId
        after(async () => {
          try {
            await createYsws(updated.id, ftId, updated.repoUrl)
            await bust('cache:ysws:*')
          } catch (e) {
            console.error('ysws creation shat itself:', e)
          }
        })
      }
    }

    const logContext = []
    if (verdict) logContext.push(`verdict: ${verdict}`)
    if (proofVideoUrl) logContext.push('uploaded proof video')
    if (reviewFeedback) logContext.push(`feedback: ${reviewFeedback}`)

    if (logContext.length > 0) {
      await syslog('certs_decision', 200, user, `ship #${shipId} - ${logContext.join(', ')}`, {
        ip,
        userAgent: ua,
      })
    }

    await bust('cache:certs:*')

    return NextResponse.json({
      success: true,
      ship: updated,
    })
  } catch {
    return NextResponse.json({ error: 'shit hit the fan updating ship' }, { status: 500 })
  }
})
