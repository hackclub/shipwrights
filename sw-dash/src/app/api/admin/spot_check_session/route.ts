import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { api } from '@/lib/api'
import { PERMS } from '@/lib/perms'

async function getCurrentSession(userId: number) {
  return prisma.spotCheckSession.findFirst({
    where: {
      staffId: userId,
      status: { in: ['active', 'paused'] },
    },
    include: {
      certs: {
        include: {
          cert: {
            select: {
              id: true,
              projectName: true,
              status: true,
            },
          },
        },
        orderBy: { addedAt: 'asc' },
      },
    },
    orderBy: { startedAt: 'desc' },
  })
}

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
  const now = Date.now()
  return session.totalSecondsAccrued + Math.floor((now - start) / 1000)
}

export const GET = api(PERMS.spot_check)(async ({ user }) => {
  const session = await getCurrentSession(user.id)
  if (!session) {
    return NextResponse.json({ session: null })
  }
  const totalSeconds = elapsedSeconds(session)
  return NextResponse.json({
    session: {
      id: session.id,
      wrightId: session.wrightId,
      status: session.status,
      startedAt: session.startedAt.toISOString(),
      pausedAt: session.pausedAt?.toISOString() ?? null,
      totalSecondsAccrued: session.totalSecondsAccrued,
      totalSeconds,
      certs: session.certs.map((sc) => ({
        certId: sc.certId,
        projectName: sc.cert.projectName,
        status: sc.cert.status,
        addedAt: sc.addedAt.toISOString(),
      })),
    },
  })
})

export const POST = api(PERMS.spot_check)(async ({ user, req }) => {
  const body = await req.json().catch(() => ({}))
  const wrightId = typeof body.wrightId === 'number' ? body.wrightId : body.wrightId != null ? parseInt(String(body.wrightId), 10) : undefined
  const validWrightId = wrightId != null && Number.isFinite(wrightId) ? wrightId : null

  const existing = await getCurrentSession(user.id)
  if (existing) {
    const totalSeconds = elapsedSeconds(existing)
    return NextResponse.json({
      session: {
        id: existing.id,
        wrightId: existing.wrightId,
        status: existing.status,
        startedAt: existing.startedAt.toISOString(),
        pausedAt: existing.pausedAt?.toISOString() ?? null,
        totalSecondsAccrued: existing.totalSecondsAccrued,
        totalSeconds,
        certs: existing.certs.map((sc) => ({
          certId: sc.certId,
          projectName: sc.cert.projectName,
          status: sc.cert.status,
          addedAt: sc.addedAt.toISOString(),
        })),
      },
    })
  }
  try {
    const session = await prisma.spotCheckSession.create({
      data: {
        staffId: user.id,
        wrightId: validWrightId,
        status: 'active',
      },
      include: {
        certs: {
          include: {
            cert: {
              select: {
                id: true,
                projectName: true,
                status: true,
              },
            },
          },
        },
      },
    })
    return NextResponse.json({
      session: {
        id: session.id,
        wrightId: session.wrightId,
        status: session.status,
        startedAt: session.startedAt.toISOString(),
        pausedAt: null,
        totalSecondsAccrued: 0,
        totalSeconds: 0,
        certs: [],
      },
    })
  } catch (err) {
    console.error('spot_check_session create failed', err)
    return NextResponse.json(
      { error: 'Failed to create session', details: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    )
  }
})

export const PATCH = api(PERMS.spot_check)(async ({ user, req }) => {
  const body = await req.json().catch(() => ({}))
  const action = body.action as string // 'pause' | 'resume' | 'end'

  const session = await getCurrentSession(user.id)
  if (!session) {
    return NextResponse.json({ error: 'no active or paused session' }, { status: 404 })
  }

  const now = new Date()

  if (action === 'pause') {
    if (session.status !== 'active') {
      return NextResponse.json({ error: 'session not active' }, { status: 400 })
    }
    const startMs = new Date(session.startedAt).getTime()
    const added = Math.floor((now.getTime() - startMs) / 1000)
    await prisma.spotCheckSession.update({
      where: { id: session.id },
      data: {
        status: 'paused',
        pausedAt: now,
        totalSecondsAccrued: session.totalSecondsAccrued + added,
      },
    })
    const updated = await getCurrentSession(user.id)
    if (!updated) throw new Error('unexpected')
    return NextResponse.json({
      session: {
        id: updated.id,
        status: updated.status,
        startedAt: updated.startedAt.toISOString(),
        pausedAt: updated.pausedAt?.toISOString() ?? null,
        totalSecondsAccrued: updated.totalSecondsAccrued,
        totalSeconds: updated.totalSecondsAccrued,
        certs: updated.certs.map((sc) => ({
          certId: sc.certId,
          projectName: sc.cert.projectName,
          status: sc.cert.status,
          addedAt: sc.addedAt.toISOString(),
        })),
      },
    })
  }

  if (action === 'resume') {
    if (session.status !== 'paused') {
      return NextResponse.json({ error: 'session not paused' }, { status: 400 })
    }
    await prisma.spotCheckSession.update({
      where: { id: session.id },
      data: {
        status: 'active',
        startedAt: now,
        pausedAt: null,
      },
    })
    const updated = await getCurrentSession(user.id)
    if (!updated) throw new Error('unexpected')
    return NextResponse.json({
      session: {
        id: updated.id,
        status: updated.status,
        startedAt: updated.startedAt.toISOString(),
        pausedAt: null,
        totalSecondsAccrued: updated.totalSecondsAccrued,
        totalSeconds: updated.totalSecondsAccrued,
        certs: updated.certs.map((sc) => ({
          certId: sc.certId,
          projectName: sc.cert.projectName,
          status: sc.cert.status,
          addedAt: sc.addedAt.toISOString(),
        })),
      },
    })
  }

  if (action === 'end') {
    let totalSeconds = session.totalSecondsAccrued
    if (session.status === 'active') {
      const startMs = new Date(session.startedAt).getTime()
      totalSeconds += Math.floor((now.getTime() - startMs) / 1000)
    }
    await prisma.spotCheckSession.update({
      where: { id: session.id },
      data: {
        status: 'ended',
        endedAt: now,
        pausedAt: session.status === 'active' ? null : session.pausedAt,
        totalSecondsAccrued: totalSeconds,
      },
    })
    const ended = await prisma.spotCheckSession.findUnique({
      where: { id: session.id },
      include: {
        certs: {
          include: {
            cert: {
              select: {
                id: true,
                projectName: true,
                status: true,
              },
            },
          },
          orderBy: { addedAt: 'asc' },
        },
      },
    })
    if (!ended) throw new Error('unexpected')
    const sessionCertIds = ended.certs.map((c) => c.certId)
    const reviewedRows = await prisma.spotCheck.findMany({
      where: { staffId: user.id, certId: { in: sessionCertIds } },
      select: { certId: true },
      distinct: ['certId'],
    })
    const reviewedCount = reviewedRows.length
    const leftCount = ended.certs.length - reviewedCount
    return NextResponse.json({
      summary: {
        totalSeconds,
        certCount: ended.certs.length,
        reviewedCount,
        leftCount,
        certs: ended.certs.map((sc) => ({
          certId: sc.certId,
          projectName: sc.cert.projectName,
          status: sc.cert.status,
        })),
      },
    })
  }

  return NextResponse.json({ error: 'invalid action' }, { status: 400 })
})
