import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { api } from '@/lib/api'

export const GET = api()(async () => {
  const logs = await prisma.shipCert.findMany({
    where: {
      status: {
        in: ['approved', 'rejected'],
      },
    },
    orderBy: {
      reviewCompletedAt: 'desc',
    },
    include: {
      reviewer: {
        select: {
          id: true,
          username: true,
          avatar: true,
        },
      },
    },
    take: 300,
  })

  const stats = await prisma.shipCert.groupBy({
    by: ['status'],
    _count: true,
  })

  const totalJudged = await prisma.shipCert.count({
    where: {
      status: {
        not: 'pending',
      },
    },
  })

  const approved = stats.find((s) => s.status === 'approved')?._count || 0
  const rejected = stats.find((s) => s.status === 'rejected')?._count || 0

  const approvalRate = totalJudged > 0 ? ((approved / totalJudged) * 100).toFixed(1) : 0

  const completedReviews = await prisma.shipCert.findMany({
    where: {
      status: {
        in: ['approved', 'rejected'],
      },
      reviewStartedAt: { not: null },
      reviewCompletedAt: { not: null },
    },
    select: {
      reviewStartedAt: true,
      reviewCompletedAt: true,
    },
  })

  let avgDecisionTime = '-'
  if (completedReviews.length > 0) {
    const totalDecisionTime = completedReviews.reduce((sum, review) => {
      if (!review.reviewStartedAt || !review.reviewCompletedAt) return sum
      return sum + (review.reviewCompletedAt.getTime() - review.reviewStartedAt.getTime())
    }, 0)
    const avgMs = totalDecisionTime / completedReviews.length
    const days = Math.floor(avgMs / (1000 * 60 * 60 * 24))
    const hours = Math.floor((avgMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    avgDecisionTime = `${days}d ${hours}h`
  }

  const reviewerCounts = await prisma.shipCert.groupBy({
    by: ['reviewerId'],
    where: {
      reviewerId: {
        not: null,
      },
    },
    _count: true,
    orderBy: {
      _count: {
        reviewerId: 'desc',
      },
    },
    take: 10,
  })

  const reviewerIds = reviewerCounts.map((r) => r.reviewerId).filter(Boolean) as number[]
  const reviewers = await prisma.user.findMany({
    where: {
      id: {
        in: reviewerIds,
      },
    },
    select: {
      id: true,
      username: true,
    },
  })

  const reviewerMap = new Map(reviewers.map((r) => [r.id, r.username]))

  return NextResponse.json({
    logs: logs.map((log) => ({
      shipId: log.id,
      ftProjectId: log.ftProjectId,
      project: log.projectName,
      type: log.projectType,
      certifier: log.reviewer?.username || '-',
      verdict: log.status.charAt(0).toUpperCase() + log.status.slice(1),
      decisionMade: log.reviewCompletedAt?.toISOString() || '-',
      notes: log.reviewFeedback || 'no notes',
      syncedToFt: log.syncedToFt,
    })),
    stats: {
      totalJudged,
      approved,
      rejected,
      approvalRate,
      avgDecisionTime,
    },
    reviewers: reviewerCounts.map((rc) => ({
      name: reviewerMap.get(rc.reviewerId!) || 'Unknown',
      count: rc._count,
    })),
  })
})
