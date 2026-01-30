import { NextRequest, NextResponse } from 'next/server'
import { getCerts } from '@/lib/certs'
import { prisma } from '@/lib/db'

export async function GET(req: NextRequest) {
  const key = req.headers.get('x-api-key')
  if (key !== process.env.FLAVORTOWN_API_KEY) {
    return NextResponse.json({ error: 'nah who tf are you' }, { status: 401 })
  }

  try {
    const data = await getCerts({})

    const pendingCerts = await prisma.shipCert.findMany({
      where: { status: 'pending' },
      orderBy: { createdAt: 'asc' },
      select: { createdAt: true },
    })

    let oldestWait = '-'
    let medianQueueTime = '-'

    if (pendingCerts.length > 0) {
      // Oldest is first due to orderBy
      const oldestDiff = Date.now() - pendingCerts[0].createdAt.getTime()
      const oldestDays = Math.floor(oldestDiff / (1000 * 60 * 60 * 24))
      const oldestHours = Math.floor((oldestDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      oldestWait = `${oldestDays}d ${oldestHours}h`

      // Calculate median wait time
      const waitTimes = pendingCerts
        .map((c) => Date.now() - c.createdAt.getTime())
        .sort((a: number, b: number) => a - b)

      const mid = Math.floor(waitTimes.length / 2)
      const medianMs =
        waitTimes.length % 2 === 0
          ? (waitTimes[mid - 1] + waitTimes[mid]) / 2
          : waitTimes[mid]

      const medianDays = Math.floor(medianMs / (1000 * 60 * 60 * 24))
      const medianHours = Math.floor((medianMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      medianQueueTime = `${medianDays}d ${medianHours}h`
    }

    const now = new Date()
    const avgQueue: Record<string, number> = {}

    for (let i = 6; i >= 0; i--) {
      const day = new Date(now)
      day.setDate(day.getDate() - i)
      day.setHours(0, 0, 0, 0)
      const nextDay = new Date(day)
      nextDay.setDate(nextDay.getDate() + 1)

      const certs = await prisma.shipCert.findMany({
        where: {
          status: { in: ['approved', 'rejected'] },
          reviewCompletedAt: {
            gte: day,
            lt: nextDay,
          },
        },
        select: {
          createdAt: true,
          reviewCompletedAt: true,
        },
      })

      if (certs.length > 0) {
        const total = certs.reduce((sum, c) => {
          if (!c.reviewCompletedAt) return sum
          return sum + (c.reviewCompletedAt.getTime() - c.createdAt.getTime())
        }, 0)
        avgQueue[day.toISOString().split('T')[0]] = Math.floor(total / certs.length / 1000)
      } else {
        avgQueue[day.toISOString().split('T')[0]] = 0
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
    })
  } catch {
    return NextResponse.json({ error: 'shit broke' }, { status: 500 })
  }
}
