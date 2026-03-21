import { NextResponse } from 'next/server'
import { api } from '@/lib/api'
import { PERMS } from '@/lib/perms'
import { prisma } from '@/lib/db'

const BACKLOG_DAYS = 5
const OLD_CERT_DAYS = 5
const MAX_LOOKBACK_DAYS = 90

export const GET = api(PERMS.captain_dashboard)(async ({ user, req }) => {
  const now = new Date()
  const fallbackSince = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  let since = fallbackSince
  const url = new URL(req.url)
  const sinceParam = url.searchParams.get('since')
  if (sinceParam) {
    const parsed = new Date(sinceParam)
    if (!Number.isNaN(parsed.getTime())) {
      const minSince = new Date(now.getTime() - MAX_LOOKBACK_DAYS * 24 * 60 * 60 * 1000)
      since = parsed < minSince ? minSince : parsed
    }
  }

  const backlogCutoff = new Date(now.getTime() - BACKLOG_DAYS * 24 * 60 * 60 * 1000)

  const reviewedSince = await prisma.shipCert.findMany({
    where: {
      status: { in: ['approved', 'rejected'] },
      reviewCompletedAt: { gte: since },
      reviewerId: { not: null },
    },
    select: {
      id: true,
      reviewerId: true,
      reviewCompletedAt: true,
      createdAt: true,
    },
  })

  const byReviewer: Record<number, { total: number; oldCerts: number }> = {}
  let oldCertsReviewedSince = 0
  const oldThresholdMs = OLD_CERT_DAYS * 24 * 60 * 60 * 1000

  for (const c of reviewedSince) {
    const rid = c.reviewerId!
    if (!byReviewer[rid]) byReviewer[rid] = { total: 0, oldCerts: 0 }
    byReviewer[rid].total += 1
    const ageAtReview = c.reviewCompletedAt
      ? c.reviewCompletedAt.getTime() - new Date(c.createdAt).getTime()
      : 0
    if (ageAtReview >= oldThresholdMs) {
      byReviewer[rid].oldCerts += 1
      oldCertsReviewedSince += 1
    }
  }

  const reviewerIds = Object.keys(byReviewer).map(Number)
  const reviewers =
    reviewerIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: reviewerIds } },
          select: { id: true, username: true },
        })
      : []

  const backlogCount = await prisma.shipCert.count({
    where: {
      status: { notIn: ['approved', 'rejected'] },
      createdAt: { lt: backlogCutoff },
      yswsReturnedAt: null,
    },
  })

  const returnedCount = await prisma.shipCert.count({
    where: {
      status: 'pending',
      yswsReturnedAt: { not: null },
    },
  })

  const byReviewerArray = reviewers
    .map((r) => ({
      reviewerId: r.id,
      username: r.username,
      total: byReviewer[r.id]?.total ?? 0,
      oldCerts: byReviewer[r.id]?.oldCerts ?? 0,
    }))
    .sort((a, b) =>
      b.total !== a.total ? b.total - a.total : a.username.localeCompare(b.username)
    )

  return NextResponse.json({
    since: since.toISOString(),
    backlogDays: BACKLOG_DAYS,
    oldCertDays: OLD_CERT_DAYS,
    reviewedSince: {
      total: reviewedSince.length,
      oldCertsReviewed: oldCertsReviewedSince,
      byReviewer: byReviewerArray,
    },
    backlogCount,
    returnedCount,
  })
})
