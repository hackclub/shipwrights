export interface TypeCheckResult {
  type: string
  debug: {
    input: {
      title: string
      desc: string
      readmeUrl: string
      demoUrl: string
      repoUrl: string
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
  const input = {
    title: data.title,
    desc: data.desc,
    readmeUrl: data.readmeUrl || '',
    demoUrl: data.demoUrl || '',
    repoUrl: data.repoUrl || '',
  }

  try {
    const res = await fetch(process.env.SW_AI_URL + '/projects/type', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': process.env.SW_API_KEY || '',
      },
      body: JSON.stringify(input),
    })

    if (!res.ok) {
      const errorText = await res.text()
      try {
        const jsonError = JSON.parse(errorText)
        return {
          type: 'Unknown',
          debug: {
            input,
            request: input,
            response: jsonError,
            error: jsonError.error || `status ${res.status}`,
          },
        }
      } catch {
        return {
          type: 'Unknown',
          debug: {
            input,
            request: input,
            response: null,
            error: `status ${res.status}: ${errorText}`,
          },
        }
      }
    }

    const result = await res.json()
    return result as TypeCheckResult
  } catch (error) {
    return {
      type: 'Unknown',
      debug: {
        input,
        request: input,
        response: null,
        error: String(error),
      },
    }
  }
}
