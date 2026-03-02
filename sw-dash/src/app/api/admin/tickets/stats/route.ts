import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { PERMS } from '@/lib/perms'
import { api } from '@/lib/api'

export const GET = api(PERMS.support_view)(async () => {
  const [created, closed] = await Promise.all([
    prisma.$queryRawUnsafe<{ day: string; count: bigint }[]>(
      `SELECT DATE(createdAt) as day, COUNT(*) as count
       FROM tickets WHERE createdAt >= DATE_SUB(NOW(), INTERVAL 30 DAY)
       GROUP BY DATE(createdAt) ORDER BY day`
    ),
    prisma.$queryRawUnsafe<{ day: string; count: bigint }[]>(
      `SELECT DATE(closedAt) as day, COUNT(*) as count
       FROM tickets WHERE closedAt >= DATE_SUB(NOW(), INTERVAL 30 DAY)
       GROUP BY DATE(closedAt) ORDER BY day`
    ),
  ])

  return NextResponse.json({
    created: created.map((r) => ({ date: String(r.day), count: Number(r.count) })),
    closed: closed.map((r) => ({ date: String(r.day), count: Number(r.count) })),
  })
})
