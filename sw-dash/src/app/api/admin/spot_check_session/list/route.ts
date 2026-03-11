import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { api } from '@/lib/api'
import { PERMS } from '@/lib/perms'

function elapsedSeconds(session: {
  startedAt: Date
  pausedAt: Date | null
  totalSecondsAccrued: number
  status: string
}) {
  if (session.status === 'paused' || session.status === 'ended') {
    return session.totalSecondsAccrued
  }
  const start = new Date(session.startedAt).getTime()
  return session.totalSecondsAccrued + Math.floor((Date.now() - start) / 1000)
}

export const GET = api(PERMS.spot_check)(async ({ user, req }) => {
  const { searchParams } = new URL(req.url)
  const wrightIdParam = searchParams.get('wrightId')
  const wrightId = wrightIdParam ? parseInt(wrightIdParam, 10) : null

  const where: { status: { in: string[] }; wrightId?: number } = {
    status: { in: ['active', 'paused'] },
  }
  if (wrightId != null && Number.isFinite(wrightId)) {
    where.wrightId = wrightId
  }

  const sessions = await prisma.spotCheckSession.findMany({
    where,
    include: {
      staff: { select: { id: true, username: true, avatar: true } },
      wright: { select: { id: true, username: true } },
      certs: { select: { certId: true } },
    },
    orderBy: { startedAt: 'desc' },
  })

  const list = sessions.map((s) => ({
    id: s.id,
    staffId: s.staffId,
    staffUsername: s.staff.username,
    staffAvatar: s.staff.avatar,
    wrightId: s.wrightId,
    wrightUsername: s.wright?.username ?? null,
    status: s.status,
    certCount: s.certs.length,
    totalSeconds: elapsedSeconds(s),
    startedAt: s.startedAt.toISOString(),
    isMine: s.staffId === user.id,
  }))

  return NextResponse.json({ sessions: list })
})
