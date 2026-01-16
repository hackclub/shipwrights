const TYPES = [
  'CLI',
  'Cargo',
  'Web App',
  'Chat Bot',
  'Extension',
  'Desktop App (Windows)',
  'Desktop App (Linux)',
  'Desktop App (macOS)',
  'Minecraft Mods',
  'Hardware',
  'Android App',
  'iOS App',
  'Other',
]

async function grabReadme(url: string): Promise<string> {
  if (!url) return ''
  try {
    const raw = url.replace('github.com', 'raw.githubusercontent.com').replace('/blob/', '/')
    const res = await fetch(raw, { signal: AbortSignal.timeout(10000) })
    if (res.ok) return await res.text()
    if (res.status === 404) return "Readme doesn't exist"
    return ''
  } catch {
    return ''
  }
}

interface RelData {
  has: boolean
  files: string[]
  notes: string
  hints: string[]
}

async function getRel(url: string): Promise<RelData> {
  const empty: RelData = { has: false, files: [], notes: '', hints: [] }
  if (!url || !url.includes('github.com')) return empty

  try {
    const m = url.match(/github\.com\/([^\/]+)\/([^\/]+)/)
    if (!m) return empty
    const [, owner, repo] = m

    const res = await fetch(
      `https://api.github.com/repos/${owner}/${repo.replace(/\.git$/, '')}/releases?per_page=3`,
      {
        signal: AbortSignal.timeout(10000),
        headers: { Accept: 'application/vnd.github.v3+json' },
      }
    )

    if (!res.ok) return empty
    const rels = await res.json()
    if (!rels.length) return empty

    const files: string[] = []
    const hints: string[] = []
    let notes = ''

    for (const r of rels) {
      if (r.body) notes += r.body.substring(0, 500) + '\n'
      for (const a of r.assets || []) {
        const n = a.name.toLowerCase()
        files.push(n)

        if (
          n.endsWith('.exe') ||
          n.includes('windows') ||
          n.includes('win64') ||
          n.includes('win32')
        )
          hints.push('win')
        if (n.endsWith('.dmg') || n.endsWith('.pkg') || n.includes('macos') || n.includes('darwin'))
          hints.push('mac')
        if (
          n.endsWith('.deb') ||
          n.endsWith('.rpm') ||
          n.endsWith('.appimage') ||
          n.includes('linux')
        )
          hints.push('linux')
        if (n.endsWith('.apk') || n.includes('android')) hints.push('android')
        if (n.endsWith('.ipa') || n.includes('ios')) hints.push('ios')
        if (n.endsWith('.jar') || n.includes('fabric') || n.includes('forge')) hints.push('mc-mod')
        if (n.endsWith('.vsix') || n.endsWith('.xpi') || n.endsWith('.crx')) hints.push('ext')
      }
    }

    return {
      has: true,
      files: [...new Set(files)],
      notes: notes.substring(0, 1000),
      hints: [...new Set(hints)],
    }
  } catch {
    return empty
  }
}

export interface TypeCheckResult {
  type: string
  debug: {
    input: {
      title: string
      desc: string
      readmeUrl: string
      demoUrl: string
      repoUrl: string
      readmeContent: string
      rel: RelData
    }
    request: object
    response: object | null
    error: string | null
  }
}

export async function checkType(data: {
  title: string
  desc: string
  readmeUrl?: string
  demoUrl?: string
  repoUrl?: string
}): Promise<TypeCheckResult> {
  const key = process.env.OPENROUTER_KEY
  const [readme, rel] = await Promise.all([
    grabReadme(data.readmeUrl || ''),
    getRel(data.repoUrl || ''),
  ])

  const input = {
    title: data.title,
    desc: data.desc,
    readmeUrl: data.readmeUrl || '',
    demoUrl: data.demoUrl || '',
    repoUrl: data.repoUrl || '',
    readmeContent: readme.substring(0, 2000),
    rel: rel,
  }

  if (!key) {
    return {
      type: 'Unknown',
      debug: { input, request: {}, response: null, error: 'no OPENROUTER_KEY' },
    }
  }

  let ctx = ''
  if (rel.has) {
    ctx = `\n\nFILES: ${rel.files.join(', ')}`
    if (rel.hints.length) ctx += `\nHINTS: ${rel.hints.join(', ')}`
    if (rel.notes) ctx += `\nNOTES:\n${rel.notes}`
  }

  const reqBody = {
    model: 'google/gemini-2.5-flash-lite',
    messages: [
      {
        role: 'system',
        content: `You are a project classifier. Classify projects into EXACTLY one of these categories: ${TYPES.join(', ')}. Respond with ONLY valid JSON: {"type": "category", "confidence": 0.0-1.0}. No markdown, no explanation, no thinking tags.`,
      },
      {
        role: 'user',
        content: `Title: ${data.title}\nDescription: ${data.desc}\nDemo URL: ${data.demoUrl || ''}\nRepo: ${data.repoUrl || ''}\n\nREADME:\n${readme}${ctx}`,
      },
    ],
  }

  for (let i = 0; i < 3; i++) {
    try {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(reqBody),
      })

      const json = await res.json()

      if (!res.ok) {
        if (i < 2) {
          await new Promise((r) => setTimeout(r, 5000))
          continue
        }
        return {
          type: 'Unknown',
          debug: { input, request: reqBody, response: json, error: `status ${res.status}` },
        }
      }

      let content = json.choices?.[0]?.message?.content || ''
      content = content
        .replace(/```json/g, '')
        .replace(/```/g, '')
        .trim()
      if (content.includes('<think>')) {
        content = content.split('</think>').pop()?.trim() || ''
      }

      const result = JSON.parse(content)
      const finalType = result.confidence >= 0.8 ? result.type : 'Unknown'

      return {
        type: finalType,
        debug: { input, request: reqBody, response: json, error: null },
      }
    } catch (e) {
      if (i < 2) {
        await new Promise((r) => setTimeout(r, 5000))
        continue
      }
      return {
        type: 'Unknown',
        debug: { input, request: reqBody, response: null, error: String(e) },
      }
    }
  }

  return {
    type: 'Unknown',
    debug: { input, request: reqBody, response: null, error: 'max retries' },
  }
}
