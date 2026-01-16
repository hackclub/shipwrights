import { NextResponse } from 'next/server'
import { can, PERMS } from '@/lib/perms'
import { prisma } from '@/lib/db'
import { reportError } from '@/lib/error-tracking'
import { cache } from '@/lib/cache'
import { api } from '@/lib/api'

export const GET = api()(async ({ user }) => {
  try {
    const cacheKey = `cache:admin:${user.id}:${user.role}`

    const data = await cache(cacheKey, 3600, async () => {
      const attempts = can(user.role, PERMS.eng_full)
        ? await prisma.loginLog.findMany({
            orderBy: { createdAt: 'desc' },
            take: 50,
          })
        : []

      const users = can(user.role, PERMS.eng_full)
        ? await prisma.user.findMany({
            select: {
              id: true,
              username: true,
              slackId: true,
              avatar: true,
              role: true,
              isActive: true,
              createdAt: true,
            },
            orderBy: { createdAt: 'desc' },
          })
        : []

      return {
        attempts,
        users,
        currentUser: {
          id: user.id,
          username: user.username,
          slackId: user.slackId,
          avatar: user.avatar,
          role: user.role,
          isActive: user.isActive,
        },
      }
    })

    return NextResponse.json(data)
  } catch (e) {
    reportError(e as Error, { route: '/api/admin', userId: user.id })
    return NextResponse.json({ error: 'this shit is broken asf' }, { status: 500 })
  }
})
