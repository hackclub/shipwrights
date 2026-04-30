import { NextRequest, NextResponse } from 'next/server'
import { getStats } from '@/lib/certs'
import { prisma } from '@/lib/db'
import { reportError } from '@/lib/sentry-server'
import { safeCompare } from '@/lib/utils'

export async function GET(req: NextRequest) {
  const key = req.headers.get('x-api-key')
  const ftKey = process.env.FLAVORTOWN_API_KEY
  if (!key || !ftKey || !safeCompare(key, ftKey)) {
    return NextResponse.json({ error: 'nah who tf are you' }, { status: 401 })
  }

  try {
    const now = new Date()
    const windowStart = new Date(now)
    windowStart.setDate(windowStart.getDate() - 29)
    windowStart.setHours(0, 0, 0, 0)
    const metricsWindowStart = new Date(now)
    metricsWindowStart.setDate(metricsWindowStart.getDate() - 30)
    const npsWindowStart = new Date(now)
    npsWindowStart.setDate(npsWindowStart.getDate() - 7 * 52)
    npsWindowStart.setHours(0, 0, 0, 0)
    const [
      statsData,
      pendingCerts,
      reviewStats,
      shipStats,
      metricsHistory,
      npsWeeklyStats,
      allTicketFeedback,
      stickerRequests,
    ] = await Promise.all([
      getStats('weekly'),
      prisma.shipCert.findMany({
        where: {
          status: 'pending',
          yswsReturnedAt: null,
          OR: [{ ftType: { not: 'reship' } }, { ftType: null }],
        },
        orderBy: { createdAt: 'asc' },
        select: { createdAt: true },
      }),
      prisma.$queryRaw<
        {
          date: Date
          status: string
          rejectionReason: string | null
          avgWaitSeconds: number | null
          count: bigint
        }[]
      >`
        SELECT 
          DATE(reviewCompletedAt) as date,
          status,
          rejectionReason,
          AVG(TIMESTAMPDIFF(SECOND, createdAt, reviewCompletedAt)) as avgWaitSeconds,
          COUNT(*) as count
        FROM ship_certs
        WHERE reviewCompletedAt >= ${windowStart}
          AND status IN ('approved', 'rejected')
          AND (ftType IS NULL OR ftType != 'reship')
        GROUP BY DATE(reviewCompletedAt), status, rejectionReason
        ORDER BY date ASC
      `,
      prisma.$queryRaw<{ date: Date; shipCount: bigint }[]>`
        SELECT 
          DATE(createdAt) as date,
          COUNT(*) as shipCount
        FROM ship_certs
        WHERE createdAt >= ${windowStart}
          AND (ftType IS NULL OR ftType != 'reship')
        GROUP BY DATE(createdAt)
        ORDER BY date ASC
      `,
      prisma.metricsHistory.findMany({
        where: {
          createdAt: {
            gte: metricsWindowStart,
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 30,
        select: {
          id: true,
          createdAt: true,
          output: true,
        },
      }),
      prisma.$queryRaw<{ week: string; avgRating: number }[]>`
        SELECT 
          DATE_FORMAT(createdAt, '%x-W%v') as week,
          AVG(rating) as avgRating
        FROM ticket_feedback
        WHERE createdAt >= ${npsWindowStart}
        GROUP BY DATE_FORMAT(createdAt, '%x-W%v')
        ORDER BY week ASC
      `,
      prisma.ticketFeedback.findMany({
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          ticketId: true,
          rating: true,
          comment: true,
          createdAt: true,
        },
      }),
      prisma.stickerRequest.findMany({
        select: {
          ftProjectId: true,
          requester: { select: { ftuid: true } },
        },
      }),
    ])

    let medianQueueTime = '-'

    if (pendingCerts.length > 0) {
      const waitTimes = pendingCerts
        .map((c: { createdAt: Date }) => Date.now() - c.createdAt.getTime())
        .sort((a: number, b: number) => a - b)

      const mid = Math.floor(waitTimes.length / 2)
      const medianMs =
        waitTimes.length % 2 === 0 ? (waitTimes[mid - 1] + waitTimes[mid]) / 2 : waitTimes[mid]

      const medianDays = Math.floor(medianMs / (1000 * 60 * 60 * 24))
      const medianHours = Math.floor((medianMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      medianQueueTime = `${medianDays}d ${medianHours}h`
    }

    const avgQueue: Record<string, number> = {}
    const reviewsPerDay: Record<string, number> = {}
    const shipsPerDay: Record<string, number> = {}
    const pendingPerDay: Record<string, number> = {}
    const approvedPerDay: Record<string, number> = {}
    const rejectedPerDay: Record<string, number> = {}
    const totalDecisionsPerDay: Record<string, number> = {}

    for (let i = 29; i >= 0; i--) {
      const day = new Date(now)
      day.setDate(day.getDate() - i)
      day.setHours(0, 0, 0, 0)
      const dateKey = day.toISOString().split('T')[0]
      avgQueue[dateKey] = 0
      reviewsPerDay[dateKey] = 0
      shipsPerDay[dateKey] = 0
      pendingPerDay[dateKey] = 0
      approvedPerDay[dateKey] = 0
      rejectedPerDay[dateKey] = 0
      totalDecisionsPerDay[dateKey] = 0
    }

    const avgQueueAccum: Record<string, { totalSeconds: number; count: number }> = {}
    const rejectionReasonsByDay: Record<string, Record<string, number>> = {}

    for (const row of reviewStats) {
      const dateKey = new Date(row.date).toISOString().split('T')[0]
      const count = Number(row.count)

      if (dateKey in approvedPerDay) {
        if (row.status === 'approved') {
          approvedPerDay[dateKey] += count
        } else {
          rejectedPerDay[dateKey] += count
          const reason = row.rejectionReason ?? 'unknown'
          if (!rejectionReasonsByDay[dateKey]) rejectionReasonsByDay[dateKey] = {}
          rejectionReasonsByDay[dateKey][reason] =
            (rejectionReasonsByDay[dateKey][reason] || 0) + count
        }
        totalDecisionsPerDay[dateKey] += count
      }

      if (dateKey in avgQueue) {
        reviewsPerDay[dateKey] += count
        if (row.avgWaitSeconds != null) {
          if (!avgQueueAccum[dateKey]) avgQueueAccum[dateKey] = { totalSeconds: 0, count: 0 }
          avgQueueAccum[dateKey].totalSeconds += row.avgWaitSeconds * count
          avgQueueAccum[dateKey].count += count
        }
      }
    }

    for (const [dateKey, accum] of Object.entries(avgQueueAccum)) {
      avgQueue[dateKey] = accum.count > 0 ? Math.floor(accum.totalSeconds / accum.count) : 0
    }

    for (const row of shipStats) {
      const dateKey = new Date(row.date).toISOString().split('T')[0]
      if (dateKey in shipsPerDay) {
        shipsPerDay[dateKey] = Number(row.shipCount)
      }
    }

    let currentPending = statsData.stats.pending
    for (let i = 0; i < 30; i++) {
      const day = new Date(now)
      day.setDate(day.getDate() - i)
      day.setHours(0, 0, 0, 0)
      const dateKey = day.toISOString().split('T')[0]
      if (dateKey in pendingPerDay) {
        pendingPerDay[dateKey] = currentPending
        currentPending =
          currentPending - (shipsPerDay[dateKey] || 0) + (reviewsPerDay[dateKey] || 0)
        if (currentPending < 0) currentPending = 0
      }
    }

    const weeklyNps: Record<string, number> = {}
    for (const row of npsWeeklyStats) {
      weeklyNps[row.week] = Number(row.avgRating) || 0
    }

    const makeTheirDayProjects = [
      ...new Map(
        stickerRequests.map((r) => [
          r.ftProjectId,
          { ftProjectId: r.ftProjectId, requesterFtuid: r.requester.ftuid ?? null },
        ])
      ).values(),
    ]

    const overallNpsMean =
      allTicketFeedback.length > 0
        ? allTicketFeedback.reduce((sum, f) => sum + f.rating, 0) / allTicketFeedback.length
        : 0

    return NextResponse.json({
      totalJudged: statsData.stats.totalJudged,
      approved: statsData.stats.approved,
      rejected: statsData.stats.rejected,
      approvalRate: statsData.stats.approvalRate,
      avgQueueTime: avgQueue,
      medianQueueTime: medianQueueTime,
      decisionsToday: statsData.stats.decisionsToday,
      newShipsToday: statsData.stats.newShipsToday,
      oldestInQueue: statsData.stats.oldestInQueue,
      reviewsPerDay: reviewsPerDay,
      shipsPerDay: shipsPerDay,
      pendingPerDay: pendingPerDay,
      metricsHistory: metricsHistory,
      overallNpsMean: overallNpsMean,
      weeklyNps: weeklyNps,
      allTicketFeedback: allTicketFeedback,
      approvedPerDay: approvedPerDay,
      rejectedPerDay: rejectedPerDay,
      totalDecisionsPerDay: totalDecisionsPerDay,
      rejectionReasonsByDay: rejectionReasonsByDay,
      makeTheirDayProjects: makeTheirDayProjects,
    })
  } catch (err) {
    reportError(err instanceof Error ? err : new Error(String(err)), { endpoint: 'ship-certs' })
    return NextResponse.json({ error: 'shit broke' }, { status: 500 })
  }
}
