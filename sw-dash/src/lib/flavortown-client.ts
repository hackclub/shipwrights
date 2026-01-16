import { syslog } from './syslog'

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
    return false
  }

  const url = `${baseUrl}/webhooks/ship_cert`

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
      body: JSON.stringify({
        id: ftProjectId,
        status: verdict,
        reason: feedback,
        video_url: proofVideoUrl || null,
        project_type: projectType || null,
      }),
    })

    if (!response.ok) {
      const text = await response.text()
      console.error(`ft webhook shit failed: ${response.status} ${text}`)
      await syslog(
        'ft_webhook_send_failed',
        response.status,
        null,
        `failed to send ${verdict} to ft for ${ftProjectId}`,
        undefined,
        {
          targetId: certId,
          targetType: 'ship_cert',
          severity: 'error',
          metadata: {
            ftProjectId,
            verdict,
            httpStatus: response.status,
            error: text,
          },
        }
      )
      return false
    }

    await syslog(
      'ft_webhook_sent',
      200,
      null,
      `sent ${verdict} to ft for ${ftProjectId}`,
      undefined,
      {
        targetId: certId,
        targetType: 'ship_cert',
        metadata: {
          ftProjectId,
          verdict,
          feedback: feedback.substring(0, 100),
          hasVideo: !!proofVideoUrl,
        },
      }
    )
    return true
  } catch (error) {
    console.error('ft webhook borked:', error)
    await syslog(
      'ft_webhook_error',
      500,
      null,
      `ft webhook crashed for ${ftProjectId}`,
      undefined,
      {
        targetId: certId,
        targetType: 'ship_cert',
        severity: 'error',
        metadata: {
          ftProjectId,
          verdict,
          errorMsg: error instanceof Error ? error.message : String(error),
        },
      }
    )
    return false
  }
}
