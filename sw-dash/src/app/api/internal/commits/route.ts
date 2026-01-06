import { NextResponse } from 'next/server'

export const revalidate = 300

export async function GET() {
  const repo = process.env.GITHUB_REPO
  const token = process.env.GITHUB_TOKEN

  const headers: Record<string, string> = { Accept: 'application/vnd.github.v3+json' }
  if (token) headers['Authorization'] = `token ${token}`

  const resp = await fetch(`https://api.github.com/repos/${repo}/commits/main`, { headers })
  if (!resp.ok) return NextResponse.json({ error: 'github broke' }, { status: 500 })

  const data = await resp.json()
  return NextResponse.json({
    hash: data.sha.substring(0, 7),
    date: data.commit?.committer?.date || data.commit?.author?.date,
  })
}
