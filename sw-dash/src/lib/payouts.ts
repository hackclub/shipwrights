import { prisma } from './db'

const RATES: Record<string, number> = {
  'Web App': 0.75,
  'Chat Bot': 0.75,
  Extension: 1.0,
  CLI: 1.0,
  Cargo: 1.0,
  'Desktop App (Windows)': 1.2,
  'Minecraft Mods': 1.4,
  'Android App': 1.4,
  'iOS App': 1.4,
  'Steam Games': 1.0,
  PyPI: 1.5,
  'Desktop App (Linux)': 1.4,
  'Desktop App (macOS)': 1.4,
  Hardware: 1.0,
  Other: 1.4,
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

  const pos = lb.findIndex((r) => r.reviewerId === userId)
  if (pos < 0) return 1
  if (pos < 3) return MULTI[pos]
  return 1
}

export async function calc(params: {
  userId: number
  projectType: string | null
  customBounty?: number | null
}) {
  const { userId, projectType, customBounty } = params
  const base = getBounty(projectType)

  const rankMulti = await getMulti(userId)

  const total = base * rankMulti + (customBounty || 0)

  return {
    cookies: total,
    base,
    multi: rankMulti,
    customBounty: customBounty || 0,
  }
}

export { RATES }
