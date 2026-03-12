import { prisma } from '@/lib/db'

type ReviewsByWeekRow = {
  weekStart: Date
  total: bigint
  approved: bigint
  rejected: bigint
}

type SpotChecksByWeekRow = {
  weekStart: Date
  passed: bigint
  failed: bigint
}

type ProjectTypeRow = {
  projectType: string
  total: bigint
}

export type MemberActivityData = {
  user: { id: number; username: string | null; avatar: string | null; role: string }
  summary: {
    reviewsThisWeek: number
    reviewsLastWeek: number
    reviewsAllTime: number
    spotChecksPassed: number
    spotChecksFailed: number
    spotChecksPassRate: number
  }
  reviewsByWeek: { weekStart: string; total: number; approved: number; rejected: number }[]
  /** One entry per day for the last 12 weeks (up to 84 days), for GitHub-style activity grid */
  reviewsByDay: { date: string; count: number }[]
  spotChecksByWeek: { weekStart: string; passed: number; failed: number }[]
  /** Top project types reviewed in the last 12 weeks */
  projectTypes: { projectType: string; total: number }[]
}

type ReviewsByDayRow = {
  day: Date
  total: bigint
}

export async function getMemberActivity(userId: number): Promise<MemberActivityData | null> {
  const twelveWeeksAgo = new Date()
  twelveWeeksAgo.setDate(twelveWeeksAgo.getDate() - 12 * 7)

  const [user, reviewsByWeekRaw, reviewsByDayRaw, spotChecksByWeekRaw, reviewsAllTime, projectTypesRaw] =
    await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, username: true, avatar: true, role: true },
      }),
      prisma.$queryRaw<ReviewsByWeekRow[]>`
        SELECT
          DATE(DATE_SUB(reviewCompletedAt, INTERVAL WEEKDAY(reviewCompletedAt) DAY)) AS weekStart,
          COUNT(*) AS total,
          SUM(status = 'approved') AS approved,
          SUM(status = 'rejected') AS rejected
        FROM ship_certs
        WHERE reviewerId = ${userId}
          AND status IN ('approved', 'rejected')
          AND reviewCompletedAt IS NOT NULL
          AND reviewCompletedAt >= ${twelveWeeksAgo}
        GROUP BY weekStart
        ORDER BY weekStart ASC
      `,
      prisma.$queryRaw<ReviewsByDayRow[]>`
        SELECT DATE(reviewCompletedAt) AS day, COUNT(*) AS total
        FROM ship_certs
        WHERE reviewerId = ${userId}
          AND status IN ('approved', 'rejected')
          AND reviewCompletedAt IS NOT NULL
          AND reviewCompletedAt >= ${twelveWeeksAgo}
        GROUP BY day
        ORDER BY day ASC
      `,
      prisma.$queryRaw<SpotChecksByWeekRow[]>`
      SELECT
        DATE(DATE_SUB(createdAt, INTERVAL WEEKDAY(createdAt) DAY)) AS weekStart,
        SUM(decision = 'approved') AS passed,
        SUM(decision = 'rejected') AS failed
      FROM spot_checks
      WHERE reviewerId = ${userId}
        AND createdAt >= ${twelveWeeksAgo}
      GROUP BY weekStart
      ORDER BY weekStart ASC
    `,
    prisma.shipCert.count({
      where: {
        reviewerId: userId,
        status: { in: ['approved', 'rejected'] },
      },
    }),
    prisma.$queryRaw<ProjectTypeRow[]>`
      SELECT projectType, COUNT(*) AS total
      FROM ship_certs
      WHERE reviewerId = ${userId}
        AND status IN ('approved', 'rejected')
        AND reviewCompletedAt >= ${twelveWeeksAgo}
        AND projectType IS NOT NULL
      GROUP BY projectType
      ORDER BY total DESC
      LIMIT 8
    `,
  ])

  if (!user) return null

  const reviewsByWeek = reviewsByWeekRaw.map((r) => ({
    weekStart: r.weekStart.toISOString().split('T')[0],
    total: Number(r.total),
    approved: Number(r.approved),
    rejected: Number(r.rejected),
  }))

  const dayCountMap = new Map<string, number>()
  for (const r of reviewsByDayRaw) {
    const key = r.day.toISOString().split('T')[0]
    dayCountMap.set(key, Number(r.total))
  }
  const toDateStr = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  const reviewsByDay: { date: string; count: number }[] = []
  // Start on Sunday so the activity grid shows real calendar weeks (Sun–Sat)
  const start = new Date(twelveWeeksAgo)
  start.setHours(0, 0, 0, 0)
  start.setDate(start.getDate() - start.getDay())
  for (let i = 0; i < 84; i++) {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    const key = toDateStr(d)
    reviewsByDay.push({ date: key, count: dayCountMap.get(key) ?? 0 })
  }

  const spotChecksByWeek = spotChecksByWeekRaw.map((r) => ({
    weekStart: r.weekStart.toISOString().split('T')[0],
    passed: Number(r.passed),
    failed: Number(r.failed),
  }))

  const now = new Date()
  const getMonday = (d: Date) => {
    const copy = new Date(d.getFullYear(), d.getMonth(), d.getDate())
    const day = copy.getDay()
    const diff = day === 0 ? -6 : 1 - day
    copy.setDate(copy.getDate() + diff)
    return copy
  }
  const toLocalDateStr = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  const thisMonday = getMonday(now)
  const thisMondayStr = toLocalDateStr(thisMonday)
  const lastMonday = new Date(thisMonday)
  lastMonday.setDate(lastMonday.getDate() - 7)
  const lastMondayStr = toLocalDateStr(lastMonday)

  const thisWeekBucket = reviewsByWeek.find((b) => b.weekStart === thisMondayStr)
  const lastWeekBucket = reviewsByWeek.find((b) => b.weekStart === lastMondayStr)
  const reviewsThisWeek = thisWeekBucket?.total ?? 0
  const reviewsLastWeek = lastWeekBucket?.total ?? 0

  const spotChecksAll = spotChecksByWeek.reduce(
    (a, b) => ({
      passed: a.passed + b.passed,
      failed: a.failed + b.failed,
    }),
    { passed: 0, failed: 0 }
  )
  const spotTotal = spotChecksAll.passed + spotChecksAll.failed
  const passRate =
    spotTotal > 0 ? Number(((spotChecksAll.passed / spotTotal) * 100).toFixed(1)) : 0

  const projectTypes = projectTypesRaw.map((r) => ({
    projectType: r.projectType,
    total: Number(r.total),
  }))

  return {
    user: {
      id: user.id,
      username: user.username,
      avatar: user.avatar,
      role: user.role,
    },
    summary: {
      reviewsThisWeek,
      reviewsLastWeek,
      reviewsAllTime,
      spotChecksPassed: spotChecksAll.passed,
      spotChecksFailed: spotChecksAll.failed,
      spotChecksPassRate: passRate,
    },
    reviewsByWeek,
    reviewsByDay,
    spotChecksByWeek,
    projectTypes,
  }
}

export type TeamMemberRow = {
  id: number
  username: string
  avatar: string | null
  totalReviews: number
  lastReviewAt: string | null
}

export async function getTeamList(): Promise<TeamMemberRow[]> {
  const ninetyDaysAgo = new Date()
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

  const rows = await prisma.$queryRaw<
    { reviewerId: number; totalReviews: bigint; lastReviewAt: Date | null }[]
  >`
    SELECT
      reviewerId AS reviewerId,
      COUNT(*) AS totalReviews,
      MAX(reviewCompletedAt) AS lastReviewAt
    FROM ship_certs
    WHERE reviewerId IS NOT NULL
      AND status IN ('approved', 'rejected')
      AND reviewCompletedAt >= ${ninetyDaysAgo}
    GROUP BY reviewerId
    ORDER BY totalReviews DESC
  `

  const ids = rows.map((r) => r.reviewerId)
  if (ids.length === 0) return []

  const users = await prisma.user.findMany({
    where: { id: { in: ids } },
    select: { id: true, username: true, avatar: true },
  })
  const byId = new Map(users.map((u) => [u.id, u]))

  return rows.map((r) => {
    const u = byId.get(r.reviewerId)
    return {
      id: r.reviewerId,
      username: u?.username ?? `User #${r.reviewerId}`,
      avatar: u?.avatar ?? null,
      totalReviews: Number(r.totalReviews),
      lastReviewAt: r.lastReviewAt ? r.lastReviewAt.toISOString() : null,
    }
  })
}
