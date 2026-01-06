import { NextRequest, NextResponse } from 'next/server'
import { needAuth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { parse } from '@/lib/ua'

export async function GET(request: NextRequest) {
  try {
    const { user, error } = await needAuth(request)

    if (error) {
      return NextResponse.json(error, { status: error.status })
    }

    const token = request.cookies.get('session_token')?.value

    const sessions = await prisma.session.findMany({
      where: {
        userId: user.id,
        expiresAt: {
          gt: new Date(),
        },
      },
      select: {
        id: true,
        token: true,
        device: true,
        ip: true,
        createdAt: true,
        expiresAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    const out = sessions.map((s) => {
      const parsed = parse(s.device)
      return {
        id: s.id,
        os: parsed.os,
        browser: parsed.browser,
        ip: s.ip || 'unknown',
        createdAt: s.createdAt,
        expiresAt: s.expiresAt,
        isCurrent: s.token === token,
      }
    })

    return NextResponse.json({ sessions: out })
  } catch {
    return NextResponse.json({ error: 'shit broke' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { user, error } = await needAuth(request)

    if (error) {
      return NextResponse.json(error, { status: error.status })
    }

    const { sessionId } = await request.json()

    if (!sessionId) {
      return NextResponse.json({ error: 'need session id dumbass' }, { status: 400 })
    }

    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      select: { userId: true },
    })

    if (!session) {
      return NextResponse.json({ error: 'session not found' }, { status: 404 })
    }

    if (session.userId !== user.id) {
      return NextResponse.json({ error: 'not ur session bozo' }, { status: 403 })
    }

    await prisma.session.delete({
      where: { id: sessionId },
    })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'kill failed' }, { status: 500 })
  }
}
