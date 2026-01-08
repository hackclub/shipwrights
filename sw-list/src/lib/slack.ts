const TOKEN = process.env.SLACK_BOT_TOKEN

export interface SlackProfile {
  id: string
  name: string
  realName?: string
  title?: string
  avatar?: string
  pronouns?: string
}

export async function getProfile(slackId: string): Promise<SlackProfile | null> {
  if (!TOKEN) return null

  try {
    const res = await fetch(`https://slack.com/api/users.info?user=${slackId}`, {
      headers: { Authorization: `Bearer ${TOKEN}` },
      next: { revalidate: 300 },
    })

    const data = await res.json()
    if (!data.ok || !data.user) return null

    const u = data.user
    return {
      id: u.id,
      name: u.profile?.display_name || u.real_name || u.name,
      realName: u.real_name,
      title: u.profile?.title || null,
      avatar: u.profile?.image_192 || u.profile?.image_72,
      pronouns: u.profile?.pronouns || null,
    }
  } catch {
    return null
  }
}

export async function getProfiles(slackIds: string[]): Promise<Map<string, SlackProfile>> {
  const profiles = new Map<string, SlackProfile>()

  const chunks = []
  for (let i = 0; i < slackIds.length; i += 10) {
    chunks.push(slackIds.slice(i, i + 10))
  }

  for (const chunk of chunks) {
    const results = await Promise.all(chunk.map((id) => getProfile(id)))
    results.forEach((profile, i) => {
      if (profile) profiles.set(chunk[i], profile)
    })
  }

  return profiles
}
