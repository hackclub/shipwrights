import { NextRequest, NextResponse } from 'next/server'
import { getCerts } from '@/lib/certs'
import { prisma } from '@/lib/db'
import { reportError } from '@/lib/error-tracking'

export async function GET(req: NextRequest) {
  const key = req.headers.get('x-api-key')
  if (key !== process.env.FLAVORTOWN_API_KEY) {
    return NextResponse.json({ error: 'nah who tf are you' }, { status: 401 })
  }

  try {
    const now = new Date()
    const windowStart = new Date(now)
    windowStart.setDate(windowStart.getDate() - 6)
    windowStart.setHours(0, 0, 0, 0)

    const [data, pendingCerts, reviewStats, shipStats] = await Promise.all([
      getCerts({}),
      prisma.shipCert.findMany({
        where: { status: 'pending', yswsReturnedAt: null },
        orderBy: { createdAt: 'asc' },
        select: { createdAt: true },
      }),
      prisma.$queryRaw<{ date: Date; avgWaitSeconds: number | null; reviewCount: bigint }[]>`
        SELECT 
          DATE(reviewCompletedAt) as date,
          AVG(TIMESTAMPDIFF(SECOND, createdAt, reviewCompletedAt)) as avgWaitSeconds,
          COUNT(*) as reviewCount
        FROM ship_certs
        WHERE reviewCompletedAt >= ${windowStart}
          AND status IN ('approved', 'rejected')
        GROUP BY DATE(reviewCompletedAt)
        ORDER BY date ASC
      `,
      prisma.$queryRaw<{ date: Date; shipCount: bigint }[]>`
        SELECT 
          DATE(createdAt) as date,
          COUNT(*) as shipCount
        FROM ship_certs
        WHERE createdAt >= ${windowStart}
        GROUP BY DATE(createdAt)
        ORDER BY date ASC
      `,
    ])

    let oldestWait = '-'
    let medianQueueTime = '-'

    if (pendingCerts.length > 0) {
      const oldestDiff = Date.now() - pendingCerts[0].createdAt.getTime()
      const oldestDays = Math.floor(oldestDiff / (1000 * 60 * 60 * 24))
      const oldestHours = Math.floor((oldestDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      oldestWait = `${oldestDays}d ${oldestHours}h`

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

    for (let i = 6; i >= 0; i--) {
      const day = new Date(now)
      day.setDate(day.getDate() - i)
      day.setHours(0, 0, 0, 0)
      const dateKey = day.toISOString().split('T')[0]
      avgQueue[dateKey] = 0
      reviewsPerDay[dateKey] = 0
      shipsPerDay[dateKey] = 0
    }

    for (const row of reviewStats) {
      const dateKey = new Date(row.date).toISOString().split('T')[0]
      if (dateKey in avgQueue) {
        avgQueue[dateKey] = row.avgWaitSeconds != null ? Math.floor(row.avgWaitSeconds) : 0
        reviewsPerDay[dateKey] = Number(row.reviewCount)
      }
    }

    for (const row of shipStats) {
      const dateKey = new Date(row.date).toISOString().split('T')[0]
      if (dateKey in shipsPerDay) {
        shipsPerDay[dateKey] = Number(row.shipCount)
      }
    }

    return NextResponse.json({
      totalJudged: data.stats.totalJudged,
      approved: data.stats.approved,
      rejected: data.stats.rejected,
      pending: data.stats.pending,
      approvalRate: data.stats.approvalRate,
      avgQueueTime: avgQueue,
      medianQueueTime: medianQueueTime,
      decisionsToday: data.stats.decisionsToday,
      newShipsToday: data.stats.newShipsToday,
      oldestInQueue: oldestWait,
      reviewsPerDay: reviewsPerDay,
      shipsPerDay: shipsPerDay,
    })
  } catch (err) {
    reportError(err instanceof Error ? err : new Error(String(err)), { endpoint: 'ship-certs' })
    return NextResponse.json({ error: 'shit broke' }, { status: 500 })
  }
}
