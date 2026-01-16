export async function getSlackUser(slackId: string) {
  const token = process.env.SLACK_API_KEY
  if (!token) throw new Error('slack token missing')

  const res = await fetch(`https://slack.com/api/users.info?user=${slackId}`, {
    headers: { Authorization: `Bearer ${token}` },
  })

  const data = await res.json()
  if (!data.ok) throw new Error(data.error || 'slack broke')

  return data.user
}
