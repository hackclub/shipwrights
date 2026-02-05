import { NextResponse } from 'next/server'
import { yswsApiWithParams } from '@/lib/api'
import { PERMS } from '@/lib/perms'
import { prisma } from '@/lib/db'
import { bust } from '@/lib/cache'
import { getOne } from '@/lib/ysws'
import { syslog } from '@/lib/syslog'
import { parseId, idErr } from '@/lib/utils'
import { syncFt } from '@/lib/flavortown-client'

interface Decision {
  ftDevlogId: string
  status: string
  approvedMins: number | null
  notes: string | null
}

export const GET = yswsApiWithParams(PERMS.ysws_view)(async ({ params }) => {
  const yswsId = parseId(params.id, 'ysws')
  if (!yswsId) return idErr('ysws')

  const review = await getOne(yswsId)
  if (!review) return NextResponse.json({ error: 'not found' }, { status: 404 })

  return NextResponse.json(review)
})

export const PATCH = yswsApiWithParams(PERMS.ysws_edit)(async ({ user, req, params, ip, ua }) => {
  const yswsId = parseId(params.id, 'ysws')
  if (!yswsId) return idErr('ysws')

  const body = await req.json()
  const { action, devlogs: updates, returnReason } = body

  if (action === 'complete' || action === 'return') {
    const review = await prisma.yswsReview.findUnique({ where: { id: yswsId } })
    if (!review) return NextResponse.json({ error: 'not found' }, { status: 404 })

    let decisions = (review.decisions as Decision[] | null) || []

    if (updates && Array.isArray(updates)) {
      decisions = decisions.map((d) => {
        const upd = updates.find((u: { id: string }) => u.id === d.ftDevlogId)
        if (upd) {
          return {
            ...d,
            status: upd.status,
            approvedMins: upd.approvedMins,
            notes: upd.notes || null,
          }
        }
        return d
      })
    }

    await prisma.yswsReview.update({
      where: { id: yswsId },
      data: {
        status: action === 'complete' ? 'done' : 'returned',
        returnReason: action === 'return' ? returnReason : null,
        reviewerId: user.id,
        decisions: JSON.parse(JSON.stringify(decisions)),
      },
    })

    if (action === 'return') {
      await prisma.shipCert.update({
        where: { id: review.shipCertId },
        data: {
          status: 'pending',
          reviewCompletedAt: null,
          yswsReturnReason: returnReason,
          yswsReturnedBy: user.username,
          yswsReturnedAt: new Date(),
        },
      })
    }

    await syslog(
      action === 'complete' ? 'ysws_complete' : 'ysws_return',
      200,
      user,
      `${action}d ysws #${yswsId}`,
      { ip, userAgent: ua }
    )
    await bust('cache:ysws:*')
    await bust('cache:certs:*')
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'wtf action is that' }, { status: 400 })
})
