import { NextResponse } from 'next/server'
import { yswsApiWithParams } from '@/lib/api'
import { PERMS } from '@/lib/perms'
import { log } from '@/lib/log'
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
      body: JSON.stringify({
        details: details,
        reportedBy: user.ftuid,
        reason: 'YSWS project flag',
      }),
    })

    if (!response.ok) {
      const text = await response.text()
      console.error(`fraud report failed: ${response.status} ${text}`)
      await log({
        action: 'fraud_report_failed',
        status: response.status,
        user,
        context: `failed to report ${ftProjectId}`,
        target: { type: 'ysws_review', id: yswsId },
        res: {
          status: response.status,
          body: text,
        },
        meta: { ip, ua, ftProjectId, details },
      })
      return NextResponse.json({ error: 'report failed' }, { status: 500 })
    }

    await log({
      action: 'fraud_report_sent',
      status: 200,
      user,
      context: `reported ${ftProjectId} to fraud squad`,
      target: { type: 'ysws_review', id: yswsId },
      meta: { ip, ua, ftProjectId, details: details.substring(0, 100) },
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('fraud report borked:', error)
    await log({
      action: 'fraud_report_failed',
      status: 500,
      user,
      context: `fraud report crashed for ${ftProjectId}`,
      target: { type: 'ysws_review', id: yswsId },
      error: {
        name: error instanceof Error ? error.name : 'Error',
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      },
      meta: { ip, ua, ftProjectId },
    })
    return NextResponse.json({ error: 'report error' }, { status: 500 })
  }
})
