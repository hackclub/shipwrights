import { NextRequest, NextResponse } from 'next/server'
import { runPgSync } from '@/lib/pg-sync'
import { safeCompare } from '@/lib/utils'

export async function GET(req: NextRequest) {
  const key = req.headers.get('authorization')?.replace('Bearer ', '')
  const cronSecret = process.env.CRON_SECRET

  if (!key || !cronSecret || !safeCompare(key, cronSecret)) {
    return NextResponse.json({ error: 'nope' }, { status: 401 })
  }

  try {
    const result = await runPgSync()
    return NextResponse.json({
      ok: true,
      syncedAt: new Date().toISOString(),
      ...result,
    })
  } catch (err) {
    console.error('[pg-sync] failed:', err)
    return NextResponse.json(
      { error: 'pg sync shit the bed', detail: String(err) },
      { status: 500 }
    )
  }
}
