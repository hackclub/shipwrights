import { NextResponse } from 'next/server'
import { api } from '@/lib/api'
import { PERMS } from '@/lib/perms'
import { getCerts } from '@/lib/certs'
import { getYsws } from '@/lib/ysws'
import { prisma } from '@/lib/db'

export const GET = api(PERMS.analytics_view)(async () => {
  const [certsData, yswsData, ticketStats] = await Promise.all([
    getCerts({ lbMode: 'alltime' }),
    getYsws({ lbMode: 'alltime' }),
    (async () => {
      const [total, open, closed] = await Promise.all([
        prisma.ticket.count(),
        prisma.ticket.count({ where: { status: 'open' } }),
        prisma.ticket.count({ where: { status: 'closed' } }),
      ])
      return { total, open, closed }
    })(),
  ])

  const now = new Date()
  const decisionsPerDay = []
  const approvalRatePerDay = []

  for (let i = 13; i >= 0; i--) {
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
      select: { status: true },
    })

    const approved = certs.filter((c) => c.status === 'approved').length
    const total = certs.length

    decisionsPerDay.push({
      date: day.toISOString().split('T')[0],
      decisions: total,
    })

    approvalRatePerDay.push({
      date: day.toISOString().split('T')[0],
      rate: total > 0 ? Math.round((approved / total) * 100) : 0,
    })
  }

  const yswsTrend = []
  const ticketTrend = []

  for (let i = 13; i >= 0; i--) {
    const day = new Date(now)
    day.setDate(day.getDate() - i)
    day.setHours(0, 0, 0, 0)
    const nextDay = new Date(day)
    nextDay.setDate(nextDay.getDate() + 1)

    const [yswsCount, ticketCount] = await Promise.all([
      prisma.yswsReview.count({
        where: {
          status: 'done',
          updatedAt: {
            gte: day,
            lt: nextDay,
          },
        },
      }),
      prisma.ticket.count({
        where: {
          createdAt: {
            gte: day,
            lt: nextDay,
          },
        },
      }),
    ])

    yswsTrend.push({
      date: day.toISOString().split('T')[0],
      count: yswsCount,
    })

    ticketTrend.push({
      date: day.toISOString().split('T')[0],
      count: ticketCount,
    })
  }

  return NextResponse.json({
    certs: {
      total: certsData.stats.totalJudged,
      approved: certsData.stats.approved,
      rejected: certsData.stats.rejected,
      pending: certsData.stats.pending,
      approvalRate: certsData.stats.approvalRate,
      decisionsToday: certsData.stats.decisionsToday,
      newToday: certsData.stats.newShipsToday,
      avgQueue: certsData.stats.avgQueueTime,
      leaderboard: certsData.leaderboard.slice(0, 5),
      trend: certsData.stats.avgWaitHistory,
      decisionsPerDay,
      approvalRatePerDay,
    },
    ysws: {
      total: yswsData.stats.total,
      pending: yswsData.stats.pending,
      done: yswsData.stats.done,
      returned: yswsData.stats.returned,
      hoursApproved: yswsData.stats.hoursApproved,
      hoursRejected: yswsData.stats.hoursRejected,
      hoursReduced: yswsData.stats.hoursReduced,
      avgHang: yswsData.stats.avgHangHrs,
      leaderboard: yswsData.leaderboard.slice(0, 5),
      trend: yswsTrend,
    },
    tickets: {
      ...ticketStats,
      trend: ticketTrend,
    },
  })
})
