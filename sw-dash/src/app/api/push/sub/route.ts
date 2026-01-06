import { NextRequest, NextResponse } from 'next/server'
import { needAuth } from '@/lib/auth'
import { save } from '@/lib/push-server'

export async function POST(req: NextRequest) {
  try {
    const { user, error } = await needAuth(req)
    if (error) {
      return NextResponse.json({ error: 'not logged in dumbass' }, { status: 401 })
    }

    const sub = await req.json()

    if (!sub.endpoint || !sub.keys) {
      return NextResponse.json({ error: 'invalid sub' }, { status: 400 })
    }

    await save(user.id, sub)

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('sub broke:', err)
    return NextResponse.json({ error: 'this shit broke' }, { status: 500 })
  }
}
