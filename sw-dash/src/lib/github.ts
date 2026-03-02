import { log } from './log'

const GH_TOKEN = process.env.GITHUB_TOKEN

export function parseRepo(url: string): { owner: string; repo: string } | null {
  if (!url) return null
  const match = url.match(/github\.com[/:]([^/]+)\/([^/.\s]+)/)
  if (!match) return null
  return { owner: match[1], repo: match[2].replace(/\.git$/, '') }
}

interface Commit {
  sha: string
  msg: string
  author: string
  ts: Date
  adds: number
  dels: number
}

export async function fetchCommits(
  owner: string,
  repo: string,
  since: Date,
  until: Date
): Promise<Commit[]> {
  if (!GH_TOKEN) {
    console.error('no GH_TOKEN bruh')
    return []
  }

  const url = `https://api.github.com/repos/${owner}/${repo}/commits?since=${since.toISOString()}&until=${until.toISOString()}&per_page=100`

  try {
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${GH_TOKEN}`,
        Accept: 'application/vnd.github+json',
      },
    })

    if (!res.ok) {
      const txt = await res.text()
      console.error(`gh fetch borked: ${res.status} ${txt}`)
      return []
    }

    const commits = await res.json()
    const result: Commit[] = []

    for (const c of commits) {
      await new Promise((r) => setTimeout(r, 100))
      const stats = await fetchStats(owner, repo, c.sha)
      result.push({
        sha: c.sha,
        msg: c.commit.message.split('\n')[0].slice(0, 200),
        author: c.commit.author?.name || c.author?.login || 'unknown',
        ts: new Date(c.commit.author?.date),
        adds: stats.adds,
        dels: stats.dels,
      })
    }

    return result
  } catch (e) {
    console.error('gh fetch exploded:', e)
    await log({
      action: 'gh_fetch_failed',
      status: 500,
      context: `gh fetch crashed for ${owner}/${repo}`,
      error: {
        name: e instanceof Error ? e.name : 'Error',
        message: e instanceof Error ? e.message : String(e),
        stack: e instanceof Error ? e.stack : undefined,
      },
      meta: { owner, repo },
    })
    return []
  }
}

async function fetchStats(
  owner: string,
  repo: string,
  sha: string
): Promise<{ adds: number; dels: number }> {
  try {
    const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/commits/${sha}`, {
      headers: {
        Authorization: `Bearer ${GH_TOKEN}`,
        Accept: 'application/vnd.github+json',
      },
    })
    if (!res.ok) return { adds: 0, dels: 0 }
    const data = await res.json()
    return { adds: data.stats?.additions || 0, dels: data.stats?.deletions || 0 }
  } catch {
    return { adds: 0, dels: 0 }
  }
}
