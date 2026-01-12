import { prisma } from '@/lib/db'
import { cache, genKey } from '@/lib/cache'

interface Filters {
  type?: string | null
  status?: string | null
  sortBy?: string
  lbMode?: string
}

async function fetchCerts(filters: Filters = {}) {
  const { type, status, sortBy = 'newest' } = filters

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const now = new Date()
  const thirtyMinsAgo = new Date(now.getTime() - 30 * 60 * 1000)

  const where: { projectType?: string; status?: string } = {}
  if (type && type !== 'all') where.projectType = type
  if (status && status !== 'all') where.status = status

  const orderBy = { createdAt: sortBy === 'oldest' ? 'asc' : 'desc' } as const

  const [certs, typeGroups] = await Promise.all([
    prisma.shipCert.findMany({
      where,
      orderBy,
      include: {
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

  type StatCert = { id: number; status: string; createdAt: Date; reviewCompletedAt: Date | null }
  let statCerts: StatCert[] = certs
  if (status && status !== 'all') {
    statCerts = await prisma.shipCert.findMany({
      select: { id: true, status: true, createdAt: true, reviewCompletedAt: true },
    })
  }

  const approved = statCerts.filter((c) => c.status === 'approved').length
  const rejected = statCerts.filter((c) => c.status === 'rejected').length
  const pending = statCerts.filter((c) => c.status === 'pending').length
  const totalJudged = approved + rejected
  const approvalRate = totalJudged > 0 ? Number(((approved / totalJudged) * 100).toFixed(1)) : 0

  const decisionsToday = statCerts.filter(
    (c) => c.reviewCompletedAt && c.reviewCompletedAt >= today
  ).length
  const newShipsToday = statCerts.filter((c) => c.createdAt >= today).length

  const pendingShips = statCerts.filter((c) => c.status === 'pending')
  let avgQueueTime = '-'
  if (pendingShips.length > 0) {
    const totalWait = pendingShips.reduce(
      (sum, s) => sum + (now.getTime() - s.createdAt.getTime()),
      0
    )
    const avgMs = totalWait / pendingShips.length
    const days = Math.floor(avgMs / (1000 * 60 * 60 * 24))
    const hours = Math.floor((avgMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    avgQueueTime = `${days}d ${hours}h`
  }

  const lbMode = filters.lbMode || 'weekly'

  let lbWhere: { status: { in: string[] }; reviewCompletedAt?: { gte: Date; lt: Date } } = {
    status: { in: ['approved', 'rejected'] },
  }

  if (lbMode === 'weekly') {
    const now = new Date()
    const day = now.getUTCDay()
    const weekStart = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - day, 0, 0, 0, 0)
    )
    const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000)
    lbWhere.reviewCompletedAt = { gte: weekStart, lt: weekEnd }
  }

  const lbStats = await prisma.shipCert.groupBy({
    by: ['reviewerId'],
    where: lbWhere,
    _count: true,
  })

  const reviewerMap = new Map<number, string>()
  for (const c of certs) {
    if (c.reviewer) reviewerMap.set(c.reviewer.id, c.reviewer.username)
  }

  const missingIds = lbStats
    .map((r) => r.reviewerId)
    .filter((id): id is number => id !== null && !reviewerMap.has(id))

  if (missingIds.length > 0) {
    const missing = await prisma.user.findMany({
      where: { id: { in: missingIds } },
      select: { id: true, username: true },
    })
    for (const u of missing) reviewerMap.set(u.id, u.username)
  }

  const leaderboard = lbStats
    .filter((r) => r.reviewerId)
    .map((r) => ({
      name: reviewerMap.get(r.reviewerId!) || 'unknown',
      count: r._count,
    }))
    .sort((a, b) => b.count - a.count)

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
    stats: {
      totalJudged,
      approved,
      rejected,
      pending,
      approvalRate,
      avgQueueTime,
      decisionsToday,
      newShipsToday,
    },
    leaderboard,
    typeCounts,
  }
}

export async function getCerts(filters: Filters = {}) {
  const key = genKey('certs', {
    type: filters.type || null,
    status: filters.status || null,
    sortBy: filters.sortBy || 'newest',
    lbMode: filters.lbMode || 'weekly',
  })
  return cache(key, 3600, () => fetchCerts(filters))
}

export async function searchCerts(q: string) {
  const now = new Date()
  const thirtyMinsAgo = new Date(now.getTime() - 30 * 60 * 1000)

  const certs = await prisma.shipCert.findMany({
    where: {
      OR: [{ ftProjectId: q }, { ftSlackId: q }],
    },
    include: {
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
