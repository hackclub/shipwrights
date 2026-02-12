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
