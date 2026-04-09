import { prisma } from './db'

const RATES: Record<string, number> = {
  'Web App': 0.6,
  'Chat Bot': 0.6,
  Extension: 1.0,
  CLI: 1.0,
  Cargo: 1.0,
  'Desktop App (Windows)': 1.5,
  'Minecraft Mods': 1.5,
  'Android App': 1.5,
  'iOS App': 1.5,
  'Steam Games': 1.0,
  PyPI: 1.5,
  'Desktop App (Linux)': 1.5,
  'Desktop App (macOS)': 1.5,
  Hardware: 1.0,
  Other: 1.5,
}

const MULTI = [1.75, 1.5, 1.25]
const PAYOUT_LB_MODE: 'daily' | 'weekly' = 'daily'

export function getBounty(type: string | null): number {
  if (!type) return 1
  return RATES[type] ?? 1
}

export function getDailyPeriod(): { start: Date; end: Date } {
  const now = new Date()
  const start = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 12, 0, 0, 0)
  )
  if (now.getUTCHours() < 12) {
    start.setUTCDate(start.getUTCDate() - 1)
  }
  const end = new Date(start)
  end.setUTCDate(start.getUTCDate() + 1)
  return { start, end }
}

export async function getMulti(userId: number): Promise<number> {
  const now = new Date()
  let periodStart: Date
  let periodEnd: Date

  if (PAYOUT_LB_MODE === 'weekly') {
    const day = now.getUTCDay()
    periodStart = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - day, 0, 0, 0, 0)
    )
    periodEnd = new Date(periodStart)
    periodEnd.setUTCDate(periodStart.getUTCDate() + 7)
  } else {
    // daily mode: 12:00 UTC to 11:59:59 UTC next day
    const daily = getDailyPeriod()
    periodStart = daily.start
    periodEnd = daily.end
  }

  const myCount = await prisma.shipCert.count({
    where: {
      reviewerId: userId,
      status: { in: ['approved', 'rejected'] },
      reviewCompletedAt: { gte: periodStart, lt: periodEnd },
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
      reviewCompletedAt: { gte: periodStart, lt: periodEnd },
      reviewerId: sysUser ? { not: sysUser.id } : undefined,
    },
    _count: true,
    orderBy: { _count: { reviewerId: 'desc' } },
  })

  const pos = lb.findIndex((r: any) => r.reviewerId === userId)
  if (pos < 0) return 1
  if (pos < 3) return MULTI[pos]
  return 1
}

export async function calc(params: {
  userId: number
  projectType: string | null
  certCreatedAt: Date
  customBounty?: number | null
  status: 'approved' | 'rejected'
}) {
  const { userId, projectType, certCreatedAt, customBounty, status } = params
  const base = getBounty(projectType)

  const rankMulti = await getMulti(userId)

  const { start: periodStart, end: periodEnd } = getDailyPeriod()

  const myCountToday = await prisma.shipCert.count({
    where: {
      reviewerId: userId,
      status: { in: ['approved', 'rejected'] },
      reviewCompletedAt: { gte: periodStart, lt: periodEnd },
    },
  })

  // First Review
  let firstReviewMulti = 1
  if (myCountToday === 0) {
    firstReviewMulti = 1.5
  }

  // Daily Grind
  let dailyGrindMulti = 1
  if (myCountToday >= 15) {
    dailyGrindMulti = 1.3
  } else if (myCountToday >= 7) {
    dailyGrindMulti = 1.2
  }

  // Rejection penalty
  let rejectionMulti = 1
  if (status === 'rejected') {
    rejectionMulti = 0.8
  }

  // Old Projects
  let oldProjectMulti = 1
  const hoursOld = (Date.now() - certCreatedAt.getTime()) / (1000 * 60 * 60)
  if (hoursOld > 4 * 24) {
    oldProjectMulti = 1.5
  } else if (hoursOld > 24) {
    oldProjectMulti = 1.2
  }

  // Skip queue bonus
  let queueMulti = 1
  if (hoursOld <= 24) {
    const oldPendingCount = await prisma.shipCert.count({
      where: {
        status: 'pending',
        createdAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    })
    if (oldPendingCount > 10) {
      queueMulti = 0.9
    }
  }

  const totalMulti =
    rankMulti * firstReviewMulti * dailyGrindMulti * rejectionMulti * oldProjectMulti * queueMulti

  const total = base * totalMulti + (customBounty || 0)

  return {
    cookies: total,
    base,
    multi: totalMulti,
    customBounty: customBounty || 0,
  }
}

export { RATES }
