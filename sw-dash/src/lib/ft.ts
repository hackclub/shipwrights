import { syslog } from './syslog'

interface FtMedia {
  url: string
  content_type: string
}

export interface FtDevlog {
  id: number
  body: string
  duration_seconds: number
  scrapbook_url: string | null
  created_at: string
  updated_at: string
  media: FtMedia[]
}

async function getProj(ftProjectId: string) {
  const baseUrl = process.env.NEXT_PUBLIC_FLAVORTOWN_URL
  const apiKey = process.env.FLAVORTOWN_YSWS_API_KEY

  if (!baseUrl || !apiKey) return null

  const projectUrl = `${baseUrl}/api/v1/projects/${ftProjectId}`

  try {
    const projectRes = await fetch(projectUrl, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
    })

    if (!projectRes.ok) {
      const txt = await projectRes.text()
      await syslog(
        'ft_project_fetch_fail',
        projectRes.status,
        null,
        `couldnt fetch project ${ftProjectId}`,
        undefined,
        { metadata: { ftProjectId, url: projectUrl, error: txt }, severity: 'error' }
      )
      return null
    }

    return await projectRes.json()
  } catch {
    return null
  }
}

export async function fetchDevlogs(ftProjectId: string): Promise<FtDevlog[]> {
  const baseUrl = process.env.NEXT_PUBLIC_FLAVORTOWN_URL
  const apiKey = process.env.FLAVORTOWN_YSWS_API_KEY

  if (!baseUrl || !apiKey) {
    console.error('ft ysws config missing bruh')
    return []
  }

  const url = `${baseUrl}/api/v1/projects/${ftProjectId}/devlogs`

  try {
    const res = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
    })

    if (!res.ok) {
      const txt = await res.text()
      console.error(`ft devlog fetch borked: ${res.status} ${txt}`)
      await syslog(
        'ft_devlog_fetch_fail',
        res.status,
        null,
        `couldnt fetch devlogs for ${ftProjectId}`,
        undefined,
        { metadata: { ftProjectId, url, error: txt }, severity: 'error' }
      )
      return []
    }

    const data = await res.json()
    return data.devlogs || []
  } catch (e) {
    console.error('ft devlog fetch exploded:', e)
    await syslog(
      'ft_devlog_fetch_error',
      500,
      null,
      `devlog fetch crashed for ${ftProjectId}`,
      undefined,
      {
        metadata: { ftProjectId, error: e instanceof Error ? e.message : String(e) },
        severity: 'error',
      }
    )
    return []
  }
}

export async function getAiDecl(ftProjectId: string) {
  const project = await getProj(ftProjectId)
  return project?.ai_declaration || null
}
