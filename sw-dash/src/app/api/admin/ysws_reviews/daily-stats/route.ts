import { NextResponse } from 'next/server'
import { yswsApi } from '@/lib/api'
import { prisma } from '@/lib/db'

interface Decision {
  ftDevlogId: string
  status: string
  approvedMins: number | null
  notes: string | null
}

// Helper function to convert Date to Eastern Time date string (YYYY-MM-DD)
function toEasternDate(date: Date): string {
  const easternDate = new Date(date.toLocaleString('en-US', { timeZone: 'America/New_York' }))
  const year = easternDate.getFullYear()
  const month = String(easternDate.getMonth() + 1).padStart(2, '0')
  const day = String(easternDate.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export const GET = yswsApi(async (req) => {
  const params = req.nextUrl.searchParams
  const status = params.get('status') || 'done' // default to only completed reviews

  // Build the where clause
  const where: { status?: string; reviewerId?: { not: null } } = {
    reviewerId: { not: null }, // only reviews that have a reviewer
  }

  if (status && status !== 'all') {
    where.status = status
  }

  // Fetch all reviews with their reviewers and decisions
  const reviews = await prisma.yswsReview.findMany({
    where,
    select: {
      id: true,
      reviewerId: true,
      decisions: true,
      status: true,
      updatedAt: true, // Use updatedAt as the review completion date
      reviewer: {
        select: {
          id: true,
          username: true,
          avatar: true,
        },
      },
    },
  })

  // Map to track daily stats
  const dailyStats = new Map<
    string, // key: date
    {
      date: string
      reviewers: Map<
        number, // reviewerId
        {
          reviewerId: number
          username: string
          avatar: string | null
          devlogCount: number
        }
      >
      approvalCount: number
    }
  >()

  for (const review of reviews) {
    if (!review.reviewerId || !review.reviewer) continue

    const date = toEasternDate(review.updatedAt)
    const decisions = (review.decisions as Decision[] | null) || []
    const approvedDevlogs = decisions.filter((d) => d.status === 'approved').length
    const totalDevlogs = decisions.length

    // Initialize date entry if it doesn't exist
    if (!dailyStats.has(date)) {
      dailyStats.set(date, {
        date,
        reviewers: new Map(),
        approvalCount: 0,
      })
    }

    const dayStats = dailyStats.get(date)!

    // Track devlogs reviewed per person for this day
    if (!dayStats.reviewers.has(review.reviewerId)) {
      dayStats.reviewers.set(review.reviewerId, {
        reviewerId: review.reviewerId,
        username: review.reviewer.username,
        avatar: review.reviewer.avatar,
        devlogCount: 0,
      })
    }
    dayStats.reviewers.get(review.reviewerId)!.devlogCount += totalDevlogs

    // Track total approvals for this day
    dayStats.approvalCount += approvedDevlogs
  }

  // Convert to final array format
  const result = Array.from(dailyStats.values())
    .map((dayStats) => ({
      date: dayStats.date,
      leaderboard: Array.from(dayStats.reviewers.values()).sort(
        (a, b) => b.devlogCount - a.devlogCount
      ),
      devlogtotal: dayStats.approvalCount,
    }))
    .sort((a, b) => b.date.localeCompare(a.date))

  return NextResponse.json(result)
})
