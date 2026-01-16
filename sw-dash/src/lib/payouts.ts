import { prisma } from './db'

const RATES: Record<string, number> = {
  'Web App': 0.6,
  'Chat Bot': 0.6,
  Extension: 0.75,
  CLI: 0.8,
  Cargo: 0.8,
  'Desktop App (Windows)': 1,
  'Minecraft Mods': 0.8,
  'Android App': 0.8,
  'iOS App': 0.8,
  'Steam Games': 0.8,
  PyPI: 0.8,
  'Desktop App (Linux)': 1.1,
  'Desktop App (macOS)': 1.1,
  Hardware: 1.1,
  Other: 1.1,
}

const MULTI = [1.75, 1.5, 1.25]

export function getBounty(type: string | null): number {
  if (!type) return 1
  return RATES[type] ?? 1
}

export async function getMulti(userId: number): Promise<number> {
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

  const lb = await prisma.shipCert.groupBy({
    by: ['reviewerId'],
    where: {
      status: { in: ['approved', 'rejected'] },
      reviewCompletedAt: { gte: weekStart, lt: nextSunday },
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
