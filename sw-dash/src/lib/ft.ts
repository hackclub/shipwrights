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
  const project = await getProj(ftProjectId)
  if (!project) return []

  const baseUrl = process.env.NEXT_PUBLIC_FLAVORTOWN_URL
  const apiKey = process.env.FLAVORTOWN_YSWS_API_KEY
  if (!baseUrl || !apiKey) return []

  const devlogIds = project.devlog_ids || []
  if (!devlogIds.length) return []

  const devlogs = await Promise.all(
    devlogIds.map(async (id: number) => {
      const devlogUrl = `${baseUrl}/api/v1/devlogs/${id}`
      try {
        const devlogRes = await fetch(devlogUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
        })

        if (!devlogRes.ok) {
          console.error(`ft devlog ${id} fetch borked: ${devlogRes.status}`)
          return null
        }

        return await devlogRes.json()
      } catch (e) {
        console.error(`ft devlog ${id} fetch exploded:`, e)
        return null
      }
    })
  )

  return devlogs.filter((d): d is FtDevlog => d !== null)
}

export async function getAiDecl(ftProjectId: string) {
  const project = await getProj(ftProjectId)
  return project?.ai_declaration || null
}
