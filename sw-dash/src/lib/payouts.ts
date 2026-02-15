import { prisma } from './db'

const RATES: Record<string, number> = {
  'Desktop App (Windows)': 1.5,
  'Desktop App (Linux)': 1.5,
  'Desktop App (macOS)': 1.5,
  'Android App': 1.5,
  'iOS App': 1.5,
  Other: 1.5,
  CLI: 1,
  Cargo: 1,
  'Minecraft Mods': 1,
  'Steam Games': 1,
  PyPI: 1,
  Hardware: 1,
  Extension: 1,
  'Web App': 0.6,
  'Chat Bot': 0.6,
}

const RANK_MULTI = [1.75, 1.5, 1.25]

export function getBounty(type: string | null): number {
  if (!type) return 1
  return RATES[type] ?? 1
}

function getESTComponents(date: Date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    hourCycle: 'h23',
  }).formatToParts(date)
  const getVal = (type: string) => parseInt(parts.find((p) => p.type === type)?.value || '0')
  return { y: getVal('year'), m: getVal('month') - 1, d: getVal('day'), h: getVal('hour') }
}

function getStartOfTodayUTC(): Date {
  const now = new Date()
  const { y, m, d } = getESTComponents(now)
  const cand1 = new Date(Date.UTC(y, m, d, 5, 0, 0, 0))
  const cand2 = new Date(Date.UTC(y, m, d, 4, 0, 0, 0))
  const check1 = getESTComponents(cand1)
  return check1.h !== 0 ? cand2 : cand1
}

type WaitTier = 'new' | 'normal' | 'old' | 'ancient'

function classifyWait(createdAt: Date): WaitTier {
  const ageMs = Date.now() - createdAt.getTime()
  const ageH = ageMs / (1000 * 60 * 60)
  if (ageH < 8) return 'new'
  if (ageH <= 24) return 'normal'
  if (ageH <= 7 * 24) return 'old'
  return 'ancient'
}

async function getWaitMulti(tier: WaitTier): Promise<number> {
  if (tier === 'normal') return 1
  if (tier === 'old') return 1.2
  if (tier === 'ancient') return 1.5

  // For "new" projects, only penalise if there are ≥ 7 old/ancient pending
  const eightHoursAgo = new Date(Date.now() - 8 * 60 * 60 * 1000)
  const oldCount = await prisma.shipCert.count({
    where: {
      status: 'pending',
      createdAt: { lt: eightHoursAgo },
    },
  })
  return oldCount >= 7 ? 0.8 : 1
}

async function getRankMulti(userId: number): Promise<number> {
  const now = new Date()
  const day = now.getDay()
  const weekStart = new Date(now)
  weekStart.setDate(now.getDate() - day)
  weekStart.setHours(0, 0, 0, 0)
  const nextSunday = new Date(weekStart)
  nextSunday.setDate(weekStart.getDate() + 7)

  const myCount = await prisma.shipCert.count({
    where: {
      reviewerId: userId,
      status: { in: ['approved', 'rejected'] },
      reviewCompletedAt: { gte: weekStart, lt: nextSunday },
    },
  })

  if (myCount === 0) return 1

  const sysUser = await prisma.user.findFirst({
    where: { username: 'System' },
    select: { id: true },
  })

  const lb = await prisma.shipCert.groupBy({
    by: ['reviewerId'],
    where: {
      status: { in: ['approved', 'rejected'] },
      reviewCompletedAt: { gte: weekStart, lt: nextSunday },
      reviewerId: sysUser ? { not: sysUser.id } : undefined,
    },
    _count: true,
    orderBy: { _count: { reviewerId: 'desc' } },
  })

  const pos = lb.findIndex((r) => r.reviewerId === userId)
  if (pos < 0) return 1
  if (pos < 3) return RANK_MULTI[pos]
  return 1
}

async function getStreakMulti(userId: number): Promise<number> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { streak: true },
  })
  if (!user || user.streak <= 0) return 1
  return 1 + user.streak * 0.05
}

async function getDailyMulti(userId: number): Promise<number> {
  const startOfToday = getStartOfTodayUTC()

  const todayCount = await prisma.shipCert.count({
    where: {
      reviewerId: userId,
      status: { in: ['approved', 'rejected'] },
      reviewCompletedAt: { gte: startOfToday },
    },
  })

  if (todayCount === 0) return 1.5 // first review of the day
  if (todayCount >= 15) return 1.3
  if (todayCount >= 7) return 1.2
  return 1
}

export interface CalcInput {
  userId: number
  projectType: string | null
  verdict: 'approved' | 'rejected'
  certCreatedAt: Date
  customBounty?: number | null
}

export interface CalcResult {
  cookies: number
  base: number
  waitMulti: number
  verdictMulti: number
  rankMulti: number
  streakMulti: number
  dailyMulti: number
  customBounty: number
}

export async function calc(input: CalcInput): Promise<CalcResult> {
  const { userId, projectType, verdict, certCreatedAt, customBounty } = input

  const base = getBounty(projectType)

  const waitTier = classifyWait(certCreatedAt)
  const waitMulti = await getWaitMulti(waitTier)

  const verdictMulti = verdict === 'rejected' ? 0.8 : 1

  const rankMulti = await getRankMulti(userId)
  const streakMulti = 1 // unused for now

  const dailyMulti = await getDailyMulti(userId)

  const computed = base * waitMulti * verdictMulti * rankMulti * dailyMulti

  const flat = customBounty || 0
  const total = computed + flat

  return {
    cookies: total,
    base,
    waitMulti,
    verdictMulti,
    rankMulti,
    streakMulti,
    dailyMulti,
    customBounty: flat,
  }
}

export { RATES }
export { getRankMulti as getMulti }
