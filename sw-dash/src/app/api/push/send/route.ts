import { NextRequest, NextResponse } from 'next/server'
import { needAuth } from '@/lib/auth'
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

    const { userId, title, body, url, icon, tag } = await req.json()

    if (!userId || !title || !body) {
      return NextResponse.json({ error: 'missing shit' }, { status: 400 })
    }

    const results = await push(userId, { title, body, url, icon, tag })

    return NextResponse.json({
      ok: true,
      results: results.map((r) => r.status),
    })
  } catch (err) {
    console.error('push broke:', err)
    return NextResponse.json({ error: 'this shit broke' }, { status: 500 })
  }
}
