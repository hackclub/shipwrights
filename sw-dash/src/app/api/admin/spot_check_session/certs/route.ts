import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { api } from '@/lib/api'
import { PERMS } from '@/lib/perms'

export const POST = api(PERMS.spot_check)(async ({ user, req }) => {
  const body = await req.json().catch(() => ({}))
  const certId = typeof body.certId === 'number' ? body.certId : parseInt(String(body.certId), 10)
  const wrightId = body.wrightId != null ? parseInt(String(body.wrightId), 10) : null
  const validWrightId = Number.isFinite(wrightId) ? wrightId : null

  if (!Number.isFinite(certId)) {
    return NextResponse.json({ error: 'certId required' }, { status: 400 })
  }

  let session = await prisma.spotCheckSession.findFirst({
    where: {
      staffId: user.id,
      status: { in: ['active', 'paused'] },
    },
    orderBy: { startedAt: 'desc' },
  })

  if (!session) {
    session = await prisma.spotCheckSession.create({
      data: {
        staffId: user.id,
        wrightId: validWrightId,
        status: 'active',
      },
    })
  }

  const existing = await prisma.spotCheckSessionCert.findUnique({
    where: {
      sessionId_certId: { sessionId: session.id, certId },
    },
  })
  if (existing) {
    return NextResponse.json({ added: true, alreadyInSession: true })
  }

  await prisma.spotCheckSessionCert.create({
    data: {
      sessionId: session.id,
      certId,
    },
  })
  return NextResponse.json({ added: true })
})
