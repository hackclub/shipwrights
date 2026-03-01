import { NextRequest, NextResponse } from 'next/server'
import { bust } from '@/lib/cache'

export async function POST(req: NextRequest) {
  if (req.headers.get('x-api-key') !== process.env.SW_BOT_KEY) {
    return NextResponse.json({ error: 'nope' }, { status: 401 })
  }
  await bust('cache:tickets*')
  return NextResponse.json({ ok: true })
}
