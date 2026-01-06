import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { cache } from '@/lib/cache'
import { api } from '@/lib/api'

export const GET = api()(async () => {
  try {
    const data = await cache('cache:online', 30, async () => {
      const cutoff = new Date(Date.now() - 2 * 60 * 1000)

      const crew = await prisma.user.findMany({
        where: {
          lastSeen: { gte: cutoff },
        },
        select: {
          id: true,
          username: true,
          avatar: true,
          role: true,
        },
        orderBy: { lastSeen: 'desc' },
      })

      return { crew }
    })

    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'broke' }, { status: 500 })
  }
})
