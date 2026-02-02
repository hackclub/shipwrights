import { NextResponse } from 'next/server'
import { yswsApiWithParams } from '@/lib/api'
import { PERMS } from '@/lib/perms'
import { syslog } from '@/lib/syslog'
import { parseId, idErr } from '@/lib/utils'

export const POST = yswsApiWithParams(PERMS.ysws_view)(async ({ user, req, params, ip, ua }) => {
  const yswsId = parseId(params.id, 'ysws')
  if (!yswsId) return idErr('ysws')

  const body = await req.json()
  const { ftProjectId, details } = body

  if (!ftProjectId || !details) {
    return NextResponse.json({ error: 'missing ftProjectId or details' }, { status: 400 })
  }

  const baseUrl = process.env.NEXT_PUBLIC_FLAVORTOWN_URL
  const reportKey = process.env.FLAVORTOWN_REPORT_KEY

  if (!baseUrl || !reportKey) {
    console.error('flavortown report config missing')
    return NextResponse.json({ error: 'report config missing' }, { status: 500 })
  }

  try {
    const response = await fetch(`${baseUrl}/api/v1/projects/${ftProjectId}/report`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${reportKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ details }),
    })

    if (!response.ok) {
      const text = await response.text()
      console.error(`fraud report failed: ${response.status} ${text}`)
      await syslog('fraud_report_failed', response.status, user, `failed to report ${ftProjectId}`, {
        ip,
        userAgent: ua,
      })
      return NextResponse.json({ error: 'report failed' }, { status: 500 })
    }

    await syslog('fraud_report_sent', 200, user, `reported ${ftProjectId} to fraud squad`, {
      ip,
      userAgent: ua,
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('fraud report borked:', error)
    await syslog('fraud_report_error', 500, user, `fraud report crashed for ${ftProjectId}`, {
      ip,
      userAgent: ua,
    })
    return NextResponse.json({ error: 'report error' }, { status: 500 })
  }
})
