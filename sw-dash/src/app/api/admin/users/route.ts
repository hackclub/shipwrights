import { NextResponse } from 'next/server'
import { PERMS } from '@/lib/perms'
import { prisma } from '@/lib/db'
import { cache } from '@/lib/cache'
import { api } from '@/lib/api'

export const GET = api(PERMS.users_view)(async () => {
  try {
    const data = await cache('cache:users', 3600, async () => {
      const users = await prisma.user.findMany({
        select: {
          id: true,
          username: true,
          slackId: true,
          avatar: true,
          isActive: true,
          role: true,
          createdAt: true,
          skills: true,
        },
        orderBy: { username: 'asc' },
      })

      return { users }
    })

    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'shit broke' }, { status: 500 })
  }
})
