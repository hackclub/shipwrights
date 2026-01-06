import { NextRequest, NextResponse } from 'next/server'
import { cleanExpired } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const key = req.headers.get('authorization')?.replace('Bearer ', '')

  if (key !== process.env.CRON_SECRET && process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'nope' }, { status: 401 })
  }

  try {
    await cleanExpired()
    return NextResponse.json({ ok: true, cleaned: new Date().toISOString() })
  } catch {
    return NextResponse.json({ error: 'cleanup shit the bed' }, { status: 500 })
  }
}
