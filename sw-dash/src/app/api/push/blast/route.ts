import { NextRequest, NextResponse } from 'next/server'
import { needAuth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { push } from '@/lib/push-server'

export async function POST(req: NextRequest) {
  try {
    const { user, error } = await needAuth(req)
    if (error) {
      return NextResponse.json({ error: error.error }, { status: error.status })
    }

    if (!['megawright', 'captain', 'shipwright'].includes(user.role || '')) {
      return NextResponse.json({ error: 'not allowed' }, { status: 403 })
    }

    const { title, body, url, icon, tag } = await req.json()

    if (!title || !body) {
      return NextResponse.json({ error: 'missing shit' }, { status: 400 })
    }

    const subs = await prisma.pushSub.findMany({
      select: { userId: true },
      distinct: ['userId'],
    })

    const uids = subs.map((s) => s.userId)

    const results = await Promise.allSettled(
      uids.map((uid) => push(uid, { title, body, url, icon, tag }))
    )

    const sent = results.filter((r) => r.status === 'fulfilled').length

    return NextResponse.json({
      ok: true,
      sent,
      total: uids.length,
    })
  } catch (err) {
    console.error('blast broke:', err)
    return NextResponse.json({ error: 'this shit broke' }, { status: 500 })
  }
}
