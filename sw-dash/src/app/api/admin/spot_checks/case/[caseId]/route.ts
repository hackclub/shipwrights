import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withParams } from '@/lib/api'
import { PERMS } from '@/lib/perms'
import { log } from '@/lib/log'

export const GET = withParams<{ caseId: string }>(PERMS.spot_check)(async ({ params }) => {
  try {
    const { caseId } = params

    const spot = await prisma.spotCheck.findUnique({
      where: { caseId },
      include: {
        staff: { select: { username: true, avatar: true } },
        reviewed: { select: { id: true, username: true, avatar: true, role: true } },
        resolver: { select: { username: true } },
        cert: {
          select: {
            id: true,
            ftProjectId: true,
            projectName: true,
            projectType: true,
            reviewFeedback: true,
            proofVideoUrl: true,
            repoUrl: true,
            demoUrl: true,
            description: true,
            status: true,
          },
        },
      },
    })

    if (!spot) return NextResponse.json({ error: 'case not found' }, { status: 404 })

    return NextResponse.json({ spot })
  } catch (e) {
    return NextResponse.json({ error: 'load failed' }, { status: 500 })
  }
})

export const PATCH = withParams<{ caseId: string }>(PERMS.spot_check)(async ({
  params,
  user,
  ip,
  ua,
}) => {
  try {
    const { caseId } = params

    const current = await prisma.spotCheck.findUnique({ where: { caseId } })
    if (!current) return NextResponse.json({ error: 'case not found' }, { status: 404 })

    const newStatus = current.status === 'resolved' ? 'unresolved' : 'resolved'

    const updated = await prisma.spotCheck.update({
      where: { caseId },
      data: {
        status: newStatus,
        resolvedAt: newStatus === 'resolved' ? new Date() : null,
        resolvedBy: newStatus === 'resolved' ? user.id : null,
      },
    })

    const cert = await prisma.shipCert.findUnique({
      where: { id: current.certId },
      select: { projectName: true, reviewerId: true },
    })

    await log({
      action: newStatus === 'resolved' ? 'case_resolved' : 'case_unresolved',
      status: 200,
      user,
      context: `${newStatus} ${caseId}`,
      target: { type: 'spot_check', id: updated.id },
      meta: {
        caseId,
        decision: current.decision,
        project: cert?.projectName,
        wrightId: cert?.reviewerId,
        ip,
        ua,
      },
    })

    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: 'update failed' }, { status: 500 })
  }
})
