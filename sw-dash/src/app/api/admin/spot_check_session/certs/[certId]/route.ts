import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withParams } from '@/lib/api'
import { PERMS } from '@/lib/perms'

export const DELETE = withParams<{ certId: string }>(PERMS.spot_check)(async ({ user, params }) => {
  const certId = parseInt(params.certId, 10)
  if (!Number.isFinite(certId)) {
    return NextResponse.json({ error: 'invalid certId' }, { status: 400 })
  }

  const session = await prisma.spotCheckSession.findFirst({
    where: {
      staffId: user.id,
      status: { in: ['active', 'paused'] },
    },
    orderBy: { startedAt: 'desc' },
  })
  if (!session) {
    return NextResponse.json({ error: 'no session' }, { status: 404 })
  }

  await prisma.spotCheckSessionCert.deleteMany({
    where: {
      sessionId: session.id,
      certId,
    },
  })
  return NextResponse.json({ removed: true })
})
