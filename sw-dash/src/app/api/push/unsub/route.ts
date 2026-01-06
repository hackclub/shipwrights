import { NextRequest, NextResponse } from 'next/server'
import { needAuth } from '@/lib/auth'
import { del } from '@/lib/push-server'

export async function POST(req: NextRequest) {
  try {
    const { user, error } = await needAuth(req)
    if (error) {
      return NextResponse.json({ error: 'not logged in' }, { status: 401 })
    }

    const { endpoint } = await req.json()

    if (!endpoint) {
      return NextResponse.json({ error: 'no endpoint' }, { status: 400 })
    }

    await del(endpoint)

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('unsub broke:', err)
    return NextResponse.json({ error: 'unsub broke' }, { status: 500 })
  }
}
