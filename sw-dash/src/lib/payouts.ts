import { prisma } from './db'

const RATES: Record<string, number> = {
  'Web App': 0.75,
  'Chat Bot': 0.75,
  Extension: 0.94,
  CLI: 1,
  Cargo: 1,
  'Desktop App (Windows)': 1.25,
  'Minecraft Mods': 1,
  'Android App': 1,
  'iOS App': 1,
  'Steam Games': 1,
  PyPI: 1,
  'Desktop App (Linux)': 1.4,
  'Desktop App (macOS)': 1.4,
  Hardware: 1.4,
  Other: 1.4,
}

const MULTI = [1.75, 1.5, 1.25]
const PAYOUT_LB_MODE: 'daily' | 'weekly' = 'daily'

export function getBounty(type: string | null): number {
  if (!type) return 1
  return RATES[type] ?? 1
}

export async function getMulti(userId: number): Promise<number> {
  const now = new Date()
  let periodStart: Date
  let periodEnd: Date

  if (PAYOUT_LB_MODE === 'weekly') {
    const day = now.getDay()
    periodStart = new Date(now)
    periodStart.setDate(now.getDate() - day)
    periodStart.setHours(0, 0, 0, 0)
    periodEnd = new Date(periodStart)
    periodEnd.setDate(periodStart.getDate() + 7)
  } else {
    // then it's daily mode: 12:00 UTC to 23:59 UTC
    periodStart = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 12, 0, 0, 0)
    )

    if (now.getUTCHours() < 12) {
      periodStart.setUTCDate(periodStart.getUTCDate() - 1)
    }

    periodEnd = new Date(periodStart)
    periodEnd.setUTCDate(periodStart.getUTCDate() + 1)
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

export async function calc(userId: number, type: string | null, customBounty?: number | null) {
  const bounty = getBounty(type)
  const multi = await getMulti(userId)
  const base = bounty * multi
  const total = customBounty ? base + customBounty : base
  return { cookies: total, multi, bounty, customBounty: customBounty || 0 }
}

export { RATES }
