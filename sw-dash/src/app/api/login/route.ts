import { NextResponse } from 'next/server'

export async function GET() {
  const slackClientId = process.env.SLACK_CLIENT_ID
  const redirectUri = `${process.env.NEXTAUTH_URL}/api/auth/slack/callback`

  if (!slackClientId) {
    return NextResponse.json({ error: 'slack setup is fucked' }, { status: 500 })
  }

  const scopes = 'openid,profile,email'

  const slackAuthUrl =
    `https://slack.com/openid/connect/authorize?` +
    `client_id=${slackClientId}&` +
    `scope=${encodeURIComponent(scopes)}&` +
    `response_type=code&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}`

  const response = NextResponse.redirect(slackAuthUrl)
  return response
}
