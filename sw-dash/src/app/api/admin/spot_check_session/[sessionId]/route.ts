import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withParams } from '@/lib/api'
import { PERMS } from '@/lib/perms'

export const GET = withParams<{ sessionId: string }>(PERMS.spot_check)(async ({ user, params }) => {
  const sessionId = parseInt(params.sessionId, 10)
  if (!Number.isFinite(sessionId)) {
    return NextResponse.json({ error: 'invalid session id' }, { status: 400 })
  }

  const session = await prisma.spotCheckSession.findFirst({
    where: {
      id: sessionId,
      staffId: user.id,
      status: { in: ['active', 'paused'] },
    },
    include: {
      certs: {
        include: {
          cert: {
            include: {
              reviewer: { select: { username: true, avatar: true } },
              assignments: { select: { demoUrl: true, repoUrl: true, description: true } },
            },
          },
        },
        orderBy: { addedAt: 'asc' },
      },
    },
  })

  if (!session) {
    return NextResponse.json({ error: 'session not found' }, { status: 404 })
  }

  const certs = session.certs.map((sc) => sc.cert)
  return NextResponse.json({
    session: {
      id: session.id,
      wrightId: session.wrightId,
      status: session.status,
      totalSecondsAccrued: session.totalSecondsAccrued,
      startedAt: session.startedAt.toISOString(),
      pausedAt: session.pausedAt?.toISOString() ?? null,
    },
    certs,
  })
})
