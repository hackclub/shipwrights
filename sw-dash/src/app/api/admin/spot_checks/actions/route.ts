import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withParams } from '@/lib/api'
import { PERMS } from '@/lib/perms'
import { log } from '@/lib/log'

export const POST = withParams<Record<string, never>>(PERMS.spot_check)(async ({
  req,
  user,
  ip,
  ua,
}) => {
  try {
    const { action, ...data } = await req.json()

    if (action === 'start') {
      const { wrightId } = data

      const count = await prisma.shipCert.count({
        where: {
          reviewerId: wrightId,
          status: { in: ['approved', 'rejected'] },
          spotChecked: false,
        },
      })

      if (count === 0) return NextResponse.json({ cert: null })

      const skip = Math.floor(Math.random() * count)
      const cert = await prisma.shipCert.findFirst({
        where: {
          reviewerId: wrightId,
          status: { in: ['approved', 'rejected'] },
          spotChecked: false,
        },
        skip,
        include: {
          reviewer: { select: { username: true, avatar: true } },
          assignments: { select: { demoUrl: true, repoUrl: true, description: true } },
        },
      })

      return NextResponse.json({ cert })
    }

    if (action === 'decide') {
      const { certId, decision, why, notes, wrightId } = data

      if (!certId || !decision) return NextResponse.json({ error: 'missing data' }, { status: 400 })

      const result = await prisma.$transaction(async (tx) => {
        let caseId = null

        if (decision === 'rejected') {
          caseId = `SC-${Math.floor(1000 + Math.random() * 9000)}`

          await tx.spotCheck.create({
            data: {
              caseId,
              certId,
              staffId: user.id,
              reviewerId: wrightId,
              decision: 'rejected',
              status: 'unresolved',
              notes,
              reasoning: why,
              lbRemoved: true,
            },
          })

          await tx.shipCert.update({
            where: { id: certId },
            data: {
              spotChecked: true,
              spotCheckedAt: new Date(),
              spotCheckedBy: user.id,
              spotPassed: false,
              spotRemoved: true,
            },
          })
        } else {
          await tx.spotCheck.create({
            data: {
              caseId: `PASS-${Date.now()}`,
              certId,
              staffId: user.id,
              reviewerId: wrightId,
              decision: 'approved',
              status: 'resolved',
              lbRemoved: false,
            },
          })

          await tx.shipCert.update({
            where: { id: certId },
            data: {
              spotChecked: true,
              spotCheckedAt: new Date(),
              spotCheckedBy: user.id,
              spotPassed: true,
              spotRemoved: false,
            },
          })
        }

        return caseId
      })

      await log({
        action: 'spot_check',
        status: 200,
        user,
        context: `${decision} cert #${certId}`,
        target: { type: 'cert', id: certId },
        meta: { decision, wrightId, ip, ua },
      })

      return NextResponse.json({ ok: true, caseId: result })
    }

    return NextResponse.json({ error: 'invalid action' }, { status: 400 })
  } catch (e) {
    return NextResponse.json({ error: 'action failed' }, { status: 500 })
  }
})
