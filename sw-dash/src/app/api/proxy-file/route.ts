import { NextResponse } from 'next/server'
import { api } from '@/lib/api'
import { PERMS } from '@/lib/perms'

export const GET = api(PERMS.support_view)(async ({ req }) => {
  const url = req.nextUrl.searchParams.get('url')

  if (!url) {
    return NextResponse.json({ error: 'no url' }, { status: 400 })
  }

  if (!url.startsWith('https://files.slack.com/')) {
    return NextResponse.json({ error: 'bad url' }, { status: 400 })
  }

  const token = process.env.SLACK_API_KEY
  if (!token) {
    return NextResponse.json({ error: 'slack token missing' }, { status: 500 })
  }

  const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
  if (!r.ok) return NextResponse.json({ error: 'slack fetch died' }, { status: r.status })

  const buf = await r.arrayBuffer()

  return new NextResponse(buf, {
    headers: {
      'Content-Type': r.headers.get('Content-Type') || 'application/octet-stream',
      'Cache-Control': 'private, no-store',
    },
  })
})
