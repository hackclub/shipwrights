import { NextResponse, after } from 'next/server'
import { can, PERMS } from '@/lib/perms'
import { prisma } from '@/lib/db'
import { log } from '@/lib/log'
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

export const GET = withParams(PERMS.certs_view)(async ({ user, params }) => {
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
        claimer: {
          select: {
            id: true,
            username: true,
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

    let claimedBy: string | null = null
    let canEditClaim = true

    if (cert.status === 'pending' && cert.reviewStartedAt && cert.claimerId) {
      const now = new Date()
      const thirtyMinsAgo = new Date(now.getTime() - 30 * 60 * 1000)
      if (cert.reviewStartedAt > thirtyMinsAgo) {
        claimedBy = cert.claimer?.username || 'someone'
        canEditClaim = cert.claimerId === user.id || user.role === 'megawright'
      }
    }

    const history = cert.ftProjectId
      ? await prisma.shipCert.findMany({
          where: {
            ftProjectId: cert.ftProjectId,
            id: { not: cert.id },
            status: { in: ['approved', 'rejected'] },
          },
          include: {
            reviewer: {
              select: {
                username: true,
              },
            },
          },
          orderBy: { reviewCompletedAt: 'desc' },
          take: 10,
        })
      : []

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
      claimedBy,
      claimedAt: cert.reviewStartedAt?.toISOString() || null,
      canEditClaim,
      aiSummary: cert.aiSummary,
      history: history.map((h) => ({
        id: h.id,
        verdict: h.status,
        certifier: h.reviewer?.username || 'unknown',
        completedAt: h.reviewCompletedAt?.toISOString() || null,
        feedback: h.reviewFeedback,
      })),
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
      await log({
        action: 'ship_cert_type_override',
        status: 200,
        user,
        context: `type changed to ${projectType}`,
        target: { type: 'ship_cert', id: shipId },
        changes: { projectType: { before: cert.projectType, after: projectType } },
        meta: { ip, ua },
      })
    }

    if (customBounty !== undefined) {
      if (!can(user.role, PERMS.certs_bounty)) {
        return NextResponse.json({ error: 'u aint got bounty perms' }, { status: 403 })
      }
      updateData.customBounty = customBounty

      await log({
        action: 'ship_cert_bounty_set',
        status: 200,
        user,
        context: `custom bounty set to ${customBounty || 'null'}`,
        target: { type: 'ship_cert', id: shipId },
        changes: { customBounty: { before: cert.customBounty, after: customBounty } },
        meta: { ip, ua },
      })
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

    if (verdict) {
      const getESTComponents = (date: Date) => {
        const parts = new Intl.DateTimeFormat('en-US', {
          timeZone: 'America/New_York',
          year: 'numeric',
          month: 'numeric',
          day: 'numeric',
          hour: 'numeric',
          hourCycle: 'h23',
        }).formatToParts(date)
        const getVal = (type: string) => parseInt(parts.find((p) => p.type === type)?.value || '0')

        return {
          y: getVal('year'),
          m: getVal('month') - 1,
          d: getVal('day'),
          h: getVal('hour'),
        }
      }

      const now = new Date()
      const { y, m, d } = getESTComponents(now)

      const cand1 = new Date(Date.UTC(y, m, d, 5, 0, 0, 0)) // 5 AM UTC
      const cand2 = new Date(Date.UTC(y, m, d, 4, 0, 0, 0)) // 4 AM UTC

      const check1 = getESTComponents(cand1)

      let startOfTodayUTC = cand1
      if (check1.h !== 0) {
        startOfTodayUTC = cand2
      }

      const todayCount = await prisma.shipCert.count({
        where: {
          reviewerId: certifierId !== undefined ? certifierId : user.id,
          status: { in: ['approved', 'rejected'] },
          reviewCompletedAt: {
            gte: startOfTodayUTC,
          },
        },
      })

      if (todayCount >= 7) {
        const userIdToUpdate = certifierId !== undefined ? certifierId : user.id
        const currentUser = await prisma.user.findUnique({
          where: { id: userIdToUpdate },
          select: { streak: true, lastReviewDate: true },
        })

        if (currentUser) {
          let newStreak = currentUser.streak
          let shouldUpdate = false

          const todayNormalized = new Date(Date.UTC(y, m, d))
          const yesterdayNormalized = new Date(todayNormalized)
          yesterdayNormalized.setDate(yesterdayNormalized.getDate() - 1)

          let lastReviewNormalized = null
          if (currentUser.lastReviewDate) {
            const ld = currentUser.lastReviewDate

            lastReviewNormalized = new Date(
              Date.UTC(ld.getUTCFullYear(), ld.getUTCMonth(), ld.getUTCDate())
            )
          }

          if (
            !lastReviewNormalized ||
            lastReviewNormalized.getTime() < yesterdayNormalized.getTime()
          ) {
            newStreak = 1
            shouldUpdate = true
          } else if (lastReviewNormalized.getTime() === yesterdayNormalized.getTime()) {
            newStreak += 1
            shouldUpdate = true
          } else if (lastReviewNormalized.getTime() === todayNormalized.getTime()) {
            shouldUpdate = false
          }

          if (shouldUpdate) {
            await prisma.user.update({
              where: { id: userIdToUpdate },
              data: {
                streak: newStreak,
                lastReviewDate: todayNormalized,
              },
            })
          }
        }
      }
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

    if (verdict) {
      const action = `ship_cert_${verdict.toLowerCase()}`
      await log({
        action,
        status: 200,
        user,
        context: reviewFeedback || `cert ${verdict.toLowerCase()}`,
        target: { type: 'ship_cert', id: shipId },
        changes: {
          status: { before: cert.status, after: verdict.toLowerCase() },
          ...(proofVideoUrl
            ? { proofVideoUrl: { before: cert.proofVideoUrl, after: proofVideoUrl } }
            : {}),
        },
        meta: {
          ip,
          ua,
          ftProjectId: updated.ftProjectId,
          projectName: updated.projectName,
          proofVideoUrl,
          feedback: reviewFeedback,
          cookiesEarned: updateData.cookiesEarned,
          payoutMulti: updateData.payoutMulti,
        },
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
