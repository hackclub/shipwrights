import { NextResponse } from 'next/server'
import { PERMS } from '@/lib/perms'
import { api } from '@/lib/api'
import { getSlackUser } from '@/lib/slack'

async function getTrust(slackId: string) {
  try {
    const res = await fetch(`https://hackatime.hackclub.com/api/v1/users/${slackId}/trust_factor`, {
      cache: 'no-store',
    })

    if (!res.ok) return { status: 'unknown', color: 'blue' }

    const data = await res.json()
    const level = data.trust_level || 'blue'

    const statusMap: Record<string, string> = {
      green: 'trusted',
      blue: 'unchecked',
      yellow: 'suspected',
      red: 'yoinked',
    }

    return {
      status: statusMap[level] || 'unchecked',
      color: level,
    }
  } catch {
    return { status: 'unchecked', color: 'blue' }
  }
}

export const POST = api(PERMS.users_view)(async ({ req }) => {
  try {
    const { slackId } = await req.json()
    if (!slackId) {
      return NextResponse.json({ error: 'need slack id' }, { status: 400 })
    }

    const [slack, trust] = await Promise.all([getSlackUser(slackId), getTrust(slackId)])

    return NextResponse.json({
      slackId,
      username: slack.real_name || slack.name || 'unknown',
      displayName: slack.profile?.display_name || slack.name || 'unknown',
      avatar: slack.profile?.image_512 || slack.profile?.image_192 || null,
      email: slack.profile?.email || null,
      title: slack.profile?.title || null,
      phone: slack.profile?.phone || null,
      statusText: slack.profile?.status_text || null,
      statusEmoji: slack.profile?.status_emoji || null,
      isBot: slack.is_bot || false,
      timezone: slack.tz_label || null,
      trust: trust.status,
      trustColor: trust.color,
    })
  } catch {
    return NextResponse.json({ error: 'failed to fetch user info' }, { status: 500 })
  }
})
