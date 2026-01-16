import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { PERMS } from '@/lib/perms'
import { cache, genKey } from '@/lib/cache'
import { api } from '@/lib/api'

export const GET = api(PERMS.support_view)(async ({ req }) => {
  const { searchParams } = new URL(req.url)
  const statusParam = searchParams.get('status') || 'all'

  const validStatuses = ['all', 'open', 'closed']
  if (!validStatuses.includes(statusParam)) {
    return NextResponse.json({ error: 'invalid status' }, { status: 400 })
  }

  const cacheKey = genKey('tickets', { status: statusParam })

  const tickets = await cache(cacheKey, 3600, async () => {
    const raw = (await prisma.$queryRawUnsafe(
      statusParam === 'all'
        ? `SELECT * FROM tickets ORDER BY createdAt DESC`
        : `SELECT * FROM tickets WHERE status = ? ORDER BY createdAt DESC`,
      ...(statusParam === 'all' ? [] : [statusParam])
    )) as Record<string, unknown>[]

    const allIds = new Set<number>()
    for (const t of raw) {
      const ids = t.assignees ? JSON.parse(t.assignees as string) : []
      ids.forEach((id: number) => allIds.add(id))
    }

    const users =
      allIds.size > 0
        ? await prisma.user.findMany({
            where: { id: { in: [...allIds] } },
            select: { id: true, username: true, avatar: true },
          })
        : []

    const userMap = new Map(users.map((u) => [u.id, u]))

    return raw.map((t) => {
      const ids = t.assignees ? JSON.parse(t.assignees as string) : []
      return {
        ...t,
        assignees: ids
          .map((id: number) => {
            const u = userMap.get(id)
            return u ? { id: u.id, name: u.username, avatar: u.avatar } : null
          })
          .filter(Boolean),
      }
    })
  })

  return NextResponse.json(tickets)
})
