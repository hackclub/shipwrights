import { log } from './log'

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
      if (projectRes.status === 404) return null

      const txt = await projectRes.text()
      await log({
        action: 'ft_project_fetch_failed',
        status: projectRes.status,
        context: `couldnt fetch project ${ftProjectId}`,
        res: {
          status: projectRes.status,
          body: txt,
        },
        meta: { ftProjectId, url: projectUrl },
      })
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
      await log({
        action: 'ft_devlog_fetch_failed',
        status: res.status,
        context: `couldnt fetch devlogs for ${ftProjectId}`,
        res: {
          status: res.status,
          body: txt,
        },
        meta: { ftProjectId, url },
      })
      return []
    }

    const data = await res.json()
    return data.devlogs || []
  } catch (e) {
    console.error('ft devlog fetch exploded:', e)
    await log({
      action: 'ft_devlog_fetch_failed',
      status: 500,
      context: `devlog fetch crashed for ${ftProjectId}`,
      error: {
        name: e instanceof Error ? e.name : 'Error',
        message: e instanceof Error ? e.message : String(e),
        stack: e instanceof Error ? e.stack : undefined,
      },
      meta: { ftProjectId },
    })
    return []
  }
}

export async function getAiDecl(ftProjectId: string) {
  const project = await getProj(ftProjectId)
  return project?.ai_declaration || null
}
