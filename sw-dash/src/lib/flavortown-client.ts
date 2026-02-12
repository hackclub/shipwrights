import { log } from './log'

export async function syncFt(
  ftProjectId: string,
  verdict: 'approved' | 'rejected' | 'pending',
  feedback: string,
  proofVideoUrl?: string,
  certId?: number,
  projectType?: string | null
): Promise<boolean> {
  const baseUrl = process.env.NEXT_PUBLIC_FLAVORTOWN_URL
  const apiKey = process.env.FLAVORTOWN_API_KEY

  if (!baseUrl || !apiKey) {
    console.error('ft config missing bruh')
    await log({
      action: 'ft_webhook_failed',
      status: 500,
      context: 'FT config missing (baseUrl or apiKey)',
      target: certId ? { type: 'ship_cert', id: certId } : undefined,
      meta: { ftProjectId, verdict },
    })
    return false
  }

  const url = `${baseUrl}/webhooks/ship_cert`
  const payload = {
    id: ftProjectId,
    status: verdict,
    reason: feedback,
    video_url: proofVideoUrl || null,
    project_type: projectType || null,
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const text = await response.text()
      console.error(`ft webhook shit failed: ${response.status} ${text}`)

      await log({
        action: 'ft_webhook_failed',
        status: response.status,
        context: `failed sending ${verdict} to FT`,
        target: certId ? { type: 'ship_cert', id: certId } : undefined,
        req: {
          method: 'POST',
          url,
          body: payload,
          headers: { 'x-api-key': '***' },
        },
        res: {
          status: response.status,
          body: text,
        },
        meta: {
          ftProjectId,
          verdict,
          httpStatus: response.status,
        },
      })
      return false
    }

    await log({
      action: 'ft_webhook_sent',
      status: 200,
      context: `sent ${verdict} to FT`,
      target: certId ? { type: 'ship_cert', id: certId } : undefined,
      req: {
        method: 'POST',
        url,
        body: payload,
      },
      meta: {
        ftProjectId,
        verdict,
        feedback: feedback.substring(0, 100),
        hasVideo: !!proofVideoUrl,
        projectType,
      },
    })
    return true
  } catch (error) {
    console.error('ft webhook borked:', error)

    await log({
      action: 'ft_webhook_failed',
      status: 500,
      context: 'FT webhook request crashed',
      target: certId ? { type: 'ship_cert', id: certId } : undefined,
      error: {
        name: error instanceof Error ? error.name : 'Error',
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      },
      meta: {
        ftProjectId,
        verdict,
        url,
      },
    })
    return false
  }
}
