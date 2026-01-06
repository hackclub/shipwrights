import { NextResponse } from 'next/server'
import { api } from '@/lib/api'

export const GET = api()(async ({ user, req }) => {
  if (user.role !== 'fraudster' && user.role !== 'megawright') {
    return NextResponse.json({ error: 'no access' }, { status: 403 })
  }

  const slackId = req.nextUrl.searchParams.get('slackId')
  if (!slackId) {
    return NextResponse.json({ error: 'slackId required' }, { status: 400 })
  }

  const billyUrl = process.env.BILLY_URL
  const joeUrl = process.env.JOE_URL

  if (!billyUrl || !joeUrl) {
    return NextResponse.json({ error: 'fraud urls not configured' }, { status: 500 })
  }

  return NextResponse.json({
    billy: `${billyUrl}/?u=${slackId}`,
    joe: `${joeUrl}/profile/${slackId}`,
  })
})
