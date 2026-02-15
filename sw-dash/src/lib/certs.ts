import { prisma } from '@/lib/db'
import { cache, genKey } from '@/lib/cache'

interface Filters {
  type?: string | null
  status?: string | null
  sortBy?: string
  lbMode?: string
}

type StatsRow = {
  approved: bigint
  rejected: bigint
  pending: bigint
  decisionsToday: bigint
  newShipsToday: bigint
  decisionsYesterday: bigint
  newShipsYesterday: bigint
  approvedBeforeToday: bigint
  rejectedBeforeToday: bigint
  queueCount: bigint
  queueOldestId: number | null
  queueOldestCreatedAt: Date | null
  avgWaitSeconds: number | null
}

type LeaderRow = {
  reviewerId: number
  username: string | null
  currentCount: bigint
  prevCount: bigint
  streak?: number
}

type TypeGroup = {
  projectType: string | null
  _count: number
}

function fmtDuration(seconds: number): string {
  const days = Math.floor(seconds / (60 * 60 * 24))
  const hours = Math.floor((seconds % (60 * 60 * 24)) / (60 * 60))
  return `${days}d ${hours}h`
}

// Fetch stats separately - cached independently of sortBy
async function fetchStats(lbMode: string) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const now = new Date()

  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  // Leaderboard date windows
  let weekStart: Date | null = null
  let weekEnd: Date | null = null
  let yesterdayEndUTC: Date | null = null

  if (lbMode === 'weekly') {
    const n = new Date()
    const day = n.getUTCDay()
    weekStart = new Date(
      Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate() - day, 0, 0, 0, 0)
    )
    weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000)
    yesterdayEndUTC = new Date(
      Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate(), 0, 0, 0, 0)
    )
  }

  const [historyRows, statsRows, leaderRows] = await Promise.all([
    // Historical avg wait (last 14 days) - for trend chart
    prisma.$queryRaw<{ date: Date; avgWaitSeconds: number }[]>`
      SELECT 
        DATE(reviewCompletedAt) as date,
        AVG(TIMESTAMPDIFF(SECOND, createdAt, reviewCompletedAt)) as avgWaitSeconds
      FROM ship_certs
      WHERE reviewCompletedAt >= DATE_SUB(CURDATE(), INTERVAL 14 DAY)
        AND status IN ('approved', 'rejected')
      GROUP BY DATE(reviewCompletedAt)
      ORDER BY date ASC
    `,

    // Stats + queue in ONE SQL query
    prisma.$queryRaw<StatsRow[]>`
      SELECT
        SUM(status = 'approved') AS approved,
        SUM(status = 'rejected') AS rejected,
        SUM(status = 'pending') AS pending,
        SUM(reviewCompletedAt IS NOT NULL AND reviewCompletedAt >= ${today}) AS decisionsToday,
        SUM(createdAt >= ${today}) AS newShipsToday,
        SUM(reviewCompletedAt IS NOT NULL AND reviewCompletedAt >= ${yesterday} AND reviewCompletedAt < ${today}) AS decisionsYesterday,
        SUM(createdAt >= ${yesterday} AND createdAt < ${today}) AS newShipsYesterday,
        SUM(status = 'approved' AND reviewCompletedAt IS NOT NULL AND reviewCompletedAt < ${today}) AS approvedBeforeToday,
        SUM(status = 'rejected' AND reviewCompletedAt IS NOT NULL AND reviewCompletedAt < ${today}) AS rejectedBeforeToday,
        (SELECT COUNT(*) FROM ship_certs WHERE status = 'pending' AND yswsReturnedAt IS NULL) AS queueCount,
        (SELECT id FROM ship_certs WHERE status = 'pending' AND yswsReturnedAt IS NULL ORDER BY createdAt ASC LIMIT 1) AS queueOldestId,
        (SELECT MIN(createdAt) FROM ship_certs WHERE status = 'pending' AND yswsReturnedAt IS NULL) AS queueOldestCreatedAt,
        (SELECT AVG(TIMESTAMPDIFF(SECOND, createdAt, ${now})) FROM ship_certs WHERE status = 'pending' AND yswsReturnedAt IS NULL) AS avgWaitSeconds
      FROM ship_certs
    `,

    // Leaderboard with usernames + rank comparison in ONE query
    lbMode === 'weekly'
      ? prisma.$queryRaw<LeaderRow[]>`
          SELECT
            sc.reviewerId AS reviewerId,
            u.username AS username,
            u.streak AS streak,
            SUM(CASE WHEN sc.reviewCompletedAt >= ${weekStart} AND sc.reviewCompletedAt < ${weekEnd} THEN 1 ELSE 0 END) AS currentCount,
            SUM(CASE WHEN sc.reviewCompletedAt >= ${weekStart} AND sc.reviewCompletedAt < ${yesterdayEndUTC} THEN 1 ELSE 0 END) AS prevCount
          FROM ship_certs sc
          LEFT JOIN users u ON u.id = sc.reviewerId
          WHERE sc.reviewerId IS NOT NULL
            AND sc.status IN ('approved', 'rejected')
            AND sc.spotRemoved = false
            AND sc.reviewCompletedAt >= ${weekStart}
            AND sc.reviewCompletedAt < ${weekEnd}
          GROUP BY sc.reviewerId, u.username, u.streak
        `
      : prisma.$queryRaw<LeaderRow[]>`
          SELECT
            sc.reviewerId AS reviewerId,
            u.username AS username,
            u.streak AS streak,
            COUNT(*) AS currentCount,
            SUM(CASE WHEN sc.reviewCompletedAt < ${yesterday} THEN 1 ELSE 0 END) AS prevCount
          FROM ship_certs sc
          LEFT JOIN users u ON u.id = sc.reviewerId
          WHERE sc.reviewerId IS NOT NULL
            AND sc.status IN ('approved', 'rejected')
            AND sc.spotRemoved = false
            AND sc.reviewCompletedAt IS NOT NULL
          GROUP BY sc.reviewerId, u.username, u.streak
        `,
  ])

  // Process stats
  const statsRow = statsRows[0]
  const toNum = (val: bigint | null | undefined) => Number(val ?? 0)
  const approved = toNum(statsRow?.approved)
  const rejected = toNum(statsRow?.rejected)
  const pending = toNum(statsRow?.pending)
  const totalJudged = approved + rejected
  const approvalRate = totalJudged > 0 ? Number(((approved / totalJudged) * 100).toFixed(1)) : 0

  const decisionsToday = toNum(statsRow?.decisionsToday)
  const newShipsToday = toNum(statsRow?.newShipsToday)
  const netFlow = decisionsToday - newShipsToday

  const decisionsYesterday = toNum(statsRow?.decisionsYesterday)
  const newShipsYesterday = toNum(statsRow?.newShipsYesterday)
  const netFlowYesterday = decisionsYesterday - newShipsYesterday
  const pendingYesterday = pending + decisionsToday - newShipsToday

  const approvedBeforeToday = toNum(statsRow?.approvedBeforeToday)
  const rejectedBeforeToday = toNum(statsRow?.rejectedBeforeToday)
  const totalJudgedYesterday = approvedBeforeToday + rejectedBeforeToday
  const approvalRateYesterday =
    totalJudgedYesterday > 0
      ? Number(((approvedBeforeToday / totalJudgedYesterday) * 100).toFixed(1))
      : 0

  const calcDelta = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0
    return Number((((current - previous) / previous) * 100).toFixed(1))
  }

  const deltas = {
    pending: calcDelta(pending, pendingYesterday),
    decisions: calcDelta(decisionsToday, decisionsYesterday),
    intake: calcDelta(newShipsToday, newShipsYesterday),
    netFlow: netFlow - netFlowYesterday,
    approvalRate: Number((approvalRate - approvalRateYesterday).toFixed(1)),
  }

  // Queue stats
  const queueCount = toNum(statsRow?.queueCount)
  let avgQueueTime = '-'
  let oldestInQueue = '-'
  const oldestInQueueId: number | null = statsRow?.queueOldestId ?? null

  if (queueCount > 0) {
    const avgWaitSeconds = statsRow?.avgWaitSeconds
    if (avgWaitSeconds != null) avgQueueTime = fmtDuration(avgWaitSeconds)

    const oldestCreatedAt = statsRow?.queueOldestCreatedAt
    if (oldestCreatedAt) {
      const oldestSeconds = Math.floor((now.getTime() - oldestCreatedAt.getTime()) / 1000)
      oldestInQueue = fmtDuration(oldestSeconds)
    }
  }

  // Build leaderboard
  const norm = (x: bigint | null | undefined) => Number(x ?? 0)

  const prevLeaderboard = leaderRows
    .map((r) => ({ id: r.reviewerId, name: r.username || 'unknown', count: norm(r.prevCount) }))
    .filter((r) => lbMode !== 'weekly' || r.name !== 'System')
    .sort((a, b) => b.count - a.count)

  const prevRankMap = new Map<number, number>()
  prevLeaderboard.forEach((r, i) => prevRankMap.set(r.id, i + 1))

  const currentLeaderboard = leaderRows
    .map((r) => ({
      id: r.reviewerId,
      name: r.username || 'unknown',
      count: norm(r.currentCount),
      streak: r.streak || 0,
    }))
    .filter((r) => lbMode !== 'weekly' || r.name !== 'System')
    .sort((a, b) => b.count - a.count)

  const leaderboard = currentLeaderboard.map((r, i) => {
    const currentRank = i + 1
    const prevRank = prevRankMap.get(r.id)
    const rankChange = prevRank !== undefined ? prevRank - currentRank : undefined
    return {
      name: r.name,
      count: r.count,
      rankChange: rankChange === 0 ? undefined : rankChange,
      streak: r.streak,
    }
  })

  // Format history for chart
  const avgWaitHistory = historyRows.map((r) => ({
    date: r.date instanceof Date ? r.date.toISOString().split('T')[0] : String(r.date),
    avgWaitHours: r.avgWaitSeconds ? Math.round(Number(r.avgWaitSeconds) / 3600) : 0,
  }))

  return {
    stats: {
      totalJudged,
      approved,
      rejected,
      pending,
      approvalRate,
      avgQueueTime,
      oldestInQueue,
      oldestInQueueId,
      decisionsToday,
      newShipsToday,
      netFlow,
      deltas,
      avgWaitHistory,
    },
    leaderboard,
  }
}

// Fetch list and type counts - cached with sortBy
async function fetchList(filters: Filters) {
  const { type, status, sortBy = 'newest' } = filters
  const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000)

  const where: { projectType?: string; status?: string } = {}
  if (type && type !== 'all') where.projectType = type
  if (status && status !== 'all') where.status = status

  const orderBy = { createdAt: sortBy === 'oldest' ? 'asc' : 'desc' } as const

  const [certs, typeGroups] = await Promise.all([
    prisma.shipCert.findMany({
      where,
      orderBy,
      select: {
        id: true,
        ftProjectId: true,
        projectName: true,
        projectType: true,
        ftType: true,
        status: true,
        createdAt: true,
        devTime: true,
        ftUsername: true,
        syncedToFt: true,
        reviewStartedAt: true,
        claimerId: true,
        yswsReturnedAt: true,
        yswsReturnReason: true,
        yswsReturnedBy: true,
        customBounty: true,
        reviewer: { select: { id: true, username: true, avatar: true } },
        claimer: { select: { id: true, username: true } },
      },
    }),

    prisma.shipCert.groupBy({
      by: ['projectType'],
      where: status && status !== 'all' ? { status } : {},
      _count: true,
    }),
  ])

  const typeCounts = typeGroups.map((g) => ({ type: g.projectType || 'unknown', count: g._count }))

  return {
    certifications: certs.map((c) => {
      let claimedBy = null
      let unlocksAt = null

      if (c.status === 'pending' && c.reviewStartedAt && c.claimerId) {
        if (c.reviewStartedAt > thirtyMinsAgo) {
          claimedBy = c.claimer?.username || 'someone'
          unlocksAt = c.reviewStartedAt.getTime() + 30 * 60 * 1000
        }
      }

      return {
        id: c.id,
        ftProjectId: c.ftProjectId,
        project: c.projectName,
        type: c.projectType || 'unknown',
        ftType: c.ftType || null,
        verdict: c.status.toUpperCase(),
        certifier: c.reviewer?.username || '-',
        createdAt: c.createdAt.toISOString(),
        devTime: c.devTime || '-',
        submitter: c.ftUsername,
        syncedToFt: c.syncedToFt,
        claimedBy,
        unlocksAt,
        yswsReturned: !!c.yswsReturnedAt,
        yswsReturnReason: c.yswsReturnReason,
        yswsReturnedBy: c.yswsReturnedBy,
        customBounty: c.customBounty,
      }
    }),
    typeCounts,
  }
}

// Cached stats fetcher - independent of sortBy
async function getStats(lbMode: string) {
  const key = genKey('certs-stats', { lbMode })
  return cache(key, 15, () => fetchStats(lbMode))
}

// Cached list fetcher - includes sortBy
async function getList(filters: Filters) {
  const key = genKey('certs-list', {
    type: filters.type || null,
    status: filters.status || null,
    sortBy: filters.sortBy || 'newest',
  })
  return cache(key, 15, () => fetchList(filters))
}

export async function getCerts(filters: Filters = {}) {
  const lbMode = filters.lbMode || 'weekly'

  // Fetch stats and list in parallel with separate caches
  const [statsData, listData] = await Promise.all([getStats(lbMode), getList(filters)])

  return {
    certifications: listData.certifications,
    stats: statsData.stats,
    leaderboard: statsData.leaderboard,
    typeCounts: listData.typeCounts,
  }
}

export async function searchCerts(q: string) {
  const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000)

  const certs = await prisma.shipCert.findMany({
    where: {
      OR: [{ ftProjectId: q }, { ftSlackId: q }],
    },
    select: {
      id: true,
      ftProjectId: true,
      projectName: true,
      projectType: true,
      ftType: true,
      status: true,
      createdAt: true,
      devTime: true,
      ftUsername: true,
      syncedToFt: true,
      reviewStartedAt: true,
      claimerId: true,
      yswsReturnedAt: true,
      yswsReturnReason: true,
      yswsReturnedBy: true,
      customBounty: true,
      reviewer: { select: { id: true, username: true, avatar: true } },
      claimer: { select: { id: true, username: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return {
    certifications: certs.map((c) => {
      let claimedBy = null
      let unlocksAt = null

      if (c.status === 'pending' && c.reviewStartedAt && c.claimerId) {
        if (c.reviewStartedAt > thirtyMinsAgo) {
          claimedBy = c.claimer?.username || 'someone'
          unlocksAt = c.reviewStartedAt.getTime() + 30 * 60 * 1000
        }
      }

      return {
        id: c.id,
        ftProjectId: c.ftProjectId,
        project: c.projectName,
        type: c.projectType || 'unknown',
        ftType: c.ftType || null,
        verdict: c.status.toUpperCase(),
        certifier: c.reviewer?.username || '-',
        createdAt: c.createdAt.toISOString(),
        devTime: c.devTime || '-',
        submitter: c.ftUsername,
        syncedToFt: c.syncedToFt,
        claimedBy,
        unlocksAt,
        yswsReturned: !!c.yswsReturnedAt,
        yswsReturnReason: c.yswsReturnReason,
        yswsReturnedBy: c.yswsReturnedBy,
        customBounty: c.customBounty,
      }
    }),
  }
}
