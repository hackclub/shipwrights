import { prisma } from '@/lib/db'
import { cache, genKey } from '@/lib/cache'
import { fetchDevlogs, FtDevlog, getAiDecl } from './ft'
import { parseRepo, fetchCommits } from './gh'
import { grab, upload } from './r2'

const ftBase = process.env.NEXT_PUBLIC_FLAVORTOWN_URL || ''

interface Commit {
  sha: string
  msg: string
  author: string
  adds: number
  dels: number
  ts: string
}

interface Media {
  url: string
  type: string
}

interface FtDevlogData {
  ftDevlogId: string
  desc: string | null
  media: Media[]
  origSecs: number
  ftCreatedAt: string | null
}

interface Decision {
  ftDevlogId: string
  status: string
  approvedMins: number | null
  notes: string | null
}

interface CommitData {
  ftDevlogId: string
  commits: Commit[]
}

interface Filters {
  status?: string | null
  sortBy?: string
  lbMode?: string
  hours?: number | null
}

async function fetchYsws(filters: Filters = {}) {
  const { status, sortBy = 'newest' } = filters

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const now = new Date()

  const where: { status?: string; updatedAt?: { gte: Date } } = {}
  if (status && status !== 'all') where.status = status
  if (filters.hours) {
    where.updatedAt = { gte: new Date(Date.now() - filters.hours * 60 * 60 * 1000) }
  }

  const orderBy = { createdAt: sortBy === 'oldest' ? 'asc' : 'desc' } as const

  const reviews = await prisma.yswsReview.findMany({
    where,
    orderBy,
    include: {
      reviewer: { select: { id: true, username: true, avatar: true } },
      shipCert: {
        include: {
          reviewer: { select: { username: true } },
        },
      },
    },
  })

  const allReviews = await prisma.yswsReview.findMany({
    select: {
      id: true,
      status: true,
      devlogs: true,
      decisions: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  const pending = allReviews.filter((r) => r.status === 'pending').length
  const done = allReviews.filter((r) => r.status === 'done').length
  const returned = allReviews.filter((r) => r.status === 'returned').length
  const total = allReviews.length

  let hoursApproved = 0
  let hoursRejected = 0
  let hoursReduced = 0
  let hoursToReview = 0
  let totalHang = 0
  let hangCount = 0
  for (const r of allReviews) {
    const devs = (r.devlogs as FtDevlogData[] | null) || []
    const decs = (r.decisions as Decision[] | null) || []
    for (const d of decs) {
      const dev = devs.find((x) => x.ftDevlogId === d.ftDevlogId)
      const origHrs = dev ? dev.origSecs / 60 / 60 : 0
      const approvedHrs = (d.approvedMins || 0) / 60
      if (d.status === 'rejected') {
        hoursRejected += origHrs
      } else if (d.status === 'approved') {
        hoursApproved += approvedHrs
        if (approvedHrs < origHrs) hoursReduced += origHrs - approvedHrs
      } else if (d.status === 'pending') {
        hoursToReview += origHrs
      }
    }
    if (r.status !== 'pending') {
      totalHang += new Date(r.updatedAt).getTime() - new Date(r.createdAt).getTime()
      hangCount++
    }
  }
  const avgHangHrs = hangCount > 0 ? Math.round(totalHang / hangCount / 1000 / 60 / 60) : 0

  const lbMode = filters.lbMode || 'weekly'
  let lbWhere: { status: { in: string[] }; updatedAt?: { gte: Date; lt: Date } } = {
    status: { in: ['done', 'returned'] },
  }

  if (lbMode === 'weekly') {
    const day = now.getUTCDay()
    const weekStart = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - day, 0, 0, 0, 0)
    )
    const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000)
    lbWhere.updatedAt = { gte: weekStart, lt: weekEnd }
  }

  const lbStats = await prisma.yswsReview.groupBy({
    by: ['reviewerId'],
    where: lbWhere,
    _count: true,
  })

  const reviewerMap = new Map<number, string>()
  for (const r of reviews) {
    if (r.reviewer) reviewerMap.set(r.reviewer.id, r.reviewer.username)
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

  const mapped = reviews.map((r) => {
    const devlogs = (r.devlogs as FtDevlogData[] | null) || []
    return {
      id: r.id,
      shipCertId: r.shipCertId,
      status: r.status,
      project: r.shipCert.projectName,
      type: r.shipCert.projectType || 'unknown',
      submitter: r.shipCert.ftUsername,
      certifier: r.shipCert.reviewer?.username || '-',
      certifiedAt: r.shipCert.reviewCompletedAt?.toISOString() || '-',
      devlogCount: devlogs.length,
      totalTime: devlogs.reduce((sum, d) => sum + d.origSecs, 0),
      reviewer: r.reviewer?.username || null,
      createdAt: r.createdAt.toISOString(),
    }
  })

  if (sortBy === 'devlogs') mapped.sort((a, b) => b.devlogCount - a.devlogCount)
  if (sortBy === 'time') mapped.sort((a, b) => b.totalTime - a.totalTime)

  return {
    reviews: mapped,
    stats: {
      pending,
      done,
      returned,
      total,
      hoursApproved: Math.round(hoursApproved),
      hoursRejected: Math.round(hoursRejected),
      hoursReduced: Math.round(hoursReduced),
      hoursToReview: Math.round(hoursToReview),
      avgHangHrs,
    },
    leaderboard,
  }
}

export async function getYsws(filters: Filters = {}) {
  const key = genKey('ysws', {
    status: filters.status || null,
    sortBy: filters.sortBy || 'newest',
    lbMode: filters.lbMode || 'weekly',
    hours: filters.hours?.toString() || null,
  })
  return cache(key, 300, () => fetchYsws(filters))
}

async function pullMedia(ftMedia: FtDevlog['media']): Promise<Media[]> {
  const out: Media[] = []
  for (const m of ftMedia || []) {
    const url = m.url.startsWith('/') ? ftBase + m.url : m.url
    const file = await grab(url)
    if (!file) continue

    const ext = m.content_type.split('/')[1] || 'bin'
    const name = `${Date.now()}.${ext}`
    const r2Url = await upload('ysws-devlog-media', name, file.data, file.type)
    out.push({ url: r2Url, type: m.content_type })
  }
  return out
}

export async function create(shipCertId: number, ftProjectId: string, repoUrl: string | null) {
  const existing = await prisma.yswsReview.findFirst({
    where: {
      shipCert: {
        ftProjectId,
      },
    },
  })

  if (existing) {
    throw new Error(`ysws already exists for ft project ${ftProjectId}`)
  }

  const ftDevlogs = await fetchDevlogs(ftProjectId)

  const repo = repoUrl ? parseRepo(repoUrl) : null

  const sorted = ftDevlogs
    .filter((d) => d.created_at)
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())

  const devlogs: FtDevlogData[] = []
  const commits: CommitData[] = []
  const decisions: Decision[] = []

  if (sorted.length > 0 && repo) {
    const oldest = new Date(sorted[0].created_at)
    let prevTs = new Date(oldest.getTime() - 30 * 24 * 60 * 60 * 1000)

    for (const d of sorted) {
      const until = new Date(d.created_at)
      const ftDevlogId = String(d.id)

      const [fetched, media] = await Promise.all([
        fetchCommits(repo.owner, repo.repo, prevTs, until),
        pullMedia(d.media),
      ])

      devlogs.push({
        ftDevlogId,
        desc: d.body,
        media,
        origSecs: d.duration_seconds || 0,
        ftCreatedAt: d.created_at,
      })

      commits.push({
        ftDevlogId,
        commits: fetched.map((c) => ({
          sha: c.sha,
          msg: c.msg,
          author: c.author,
          adds: c.adds,
          dels: c.dels,
          ts: c.ts.toISOString(),
        })),
      })

      decisions.push({
        ftDevlogId,
        status: 'pending',
        approvedMins: null,
        notes: null,
      })

      prevTs = until
    }
  } else {
    for (const d of ftDevlogs) {
      const media = await pullMedia(d.media)
      const ftDevlogId = String(d.id)

      devlogs.push({
        ftDevlogId,
        desc: d.body,
        media,
        origSecs: d.duration_seconds || 0,
        ftCreatedAt: d.created_at || null,
      })

      commits.push({
        ftDevlogId,
        commits: [],
      })

      decisions.push({
        ftDevlogId,
        status: 'pending',
        approvedMins: null,
        notes: null,
      })
    }
  }

  const ysws = await prisma.yswsReview.create({
    data: {
      shipCertId,
      devlogs: JSON.parse(JSON.stringify(devlogs)),
      commits: JSON.parse(JSON.stringify(commits)),
      decisions: JSON.parse(JSON.stringify(decisions)),
    },
  })

  return ysws
}

export async function getOne(id: number) {
  const review = await prisma.yswsReview.findUnique({
    where: { id },
    include: {
      reviewer: { select: { id: true, username: true, avatar: true } },
      shipCert: {
        select: {
          id: true,
          ftProjectId: true,
          ftUsername: true,
          ftSlackId: true,
          projectName: true,
          projectType: true,
          description: true,
          demoUrl: true,
          repoUrl: true,
          readmeUrl: true,
          proofVideoUrl: true,
          devTime: true,
          reviewer: { select: { id: true, username: true } },
          reviewCompletedAt: true,
          createdAt: true,
        },
      },
    },
  })

  if (!review) return null

  const devlogs = (review.devlogs as FtDevlogData[] | null) || []
  const commits = (review.commits as CommitData[] | null) || []
  const decisions = (review.decisions as Decision[] | null) || []

  const merged = devlogs.map((d) => {
    const c = commits.find((x) => x.ftDevlogId === d.ftDevlogId)
    const dec = decisions.find((x) => x.ftDevlogId === d.ftDevlogId)
    return {
      id: d.ftDevlogId,
      ftDevlogId: d.ftDevlogId,
      desc: d.desc,
      media: d.media,
      origSecs: d.origSecs,
      ftCreatedAt: d.ftCreatedAt,
      commits: c?.commits || [],
      status: dec?.status || 'pending',
      approvedMins: dec?.approvedMins ?? null,
      notes: dec?.notes ?? null,
    }
  })

  const aiDeclaration = review.shipCert.ftProjectId
    ? await getAiDecl(review.shipCert.ftProjectId)
    : null

  let fraudUrls = null
  if (review.shipCert.ftSlackId) {
    const billy = process.env.BILLY_URL
    const joe = process.env.JOE_URL
    if (billy && joe) {
      fraudUrls = {
        billy: `${billy}/?u=${review.shipCert.ftSlackId}`,
        joe: `${joe}/profile/${review.shipCert.ftSlackId}`,
      }
    }
  }

  return {
    ...review,
    devlogs: merged,
    aiDeclaration,
    fraudUrls,
  }
}
