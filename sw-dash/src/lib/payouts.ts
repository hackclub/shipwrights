import { prisma } from './db'

const RATES: Record<string, number> = {
  'Web App': 0.5,
  'Chat Bot': 0.5,
  Extension: 0.7,
  CLI: 0.75,
  Cargo: 0.75,
  'Desktop App (Windows)': 0.75,
  'Minecraft Mods': 0.75,
  'Android App': 0.75,
  'iOS App': 0.75,
  'Steam Games': 0.75,
  PyPI: 0.75,
  'Desktop App (Linux)': 1,
  'Desktop App (macOS)': 1,
  Hardware: 1,
  Other: 1,
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

export async function calc(userId: number, type: string | null) {
  const bounty = getBounty(type)
  const multi = await getMulti(userId)
  return { cookies: bounty * multi, multi, bounty }
}

export { RATES }
