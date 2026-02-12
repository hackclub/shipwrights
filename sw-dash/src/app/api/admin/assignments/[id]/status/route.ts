import { NextResponse } from 'next/server'
import { can, PERMS } from '@/lib/perms'
import { prisma } from '@/lib/db'
import { reportError } from '@/lib/error-tracking'
import { log } from '@/lib/log'
import { withParams } from '@/lib/api'

export const PATCH = withParams()(async ({ user, req, params, ip, ua }) => {
  try {
    const numId = parseInt(params.id, 10)
    if (isNaN(numId)) {
      return NextResponse.json({ error: 'bad id' }, { status: 400 })
    }

    const assignment = await prisma.assignment.findFirst({
      where: { id: numId },
    })

    if (!assignment) {
      return NextResponse.json({ error: 'assignment doesnt exist dipshit' }, { status: 404 })
    }

    const { status: newStatus } = await req.json()

    const validStatuses = ['pending', 'in_progress', 'completed']
    if (!validStatuses.includes(newStatus)) {
      return NextResponse.json({ error: 'status is fucked up' }, { status: 400 })
    }

    const isOwner = assignment.assigneeId === user.id
    const hasEditPerm = can(user.role, PERMS.assign_edit)
    const hasOverride = can(user.role, PERMS.assign_override)

    if (!((isOwner && hasEditPerm) || hasOverride)) {
      return NextResponse.json(
        { error: 'you can only update assignments assigned to you' },
        { status: 403 }
      )
    }

    const oldStatus = assignment.status

    const updated = await prisma.assignment.update({
      where: { id: numId },
      data: {
        status: newStatus,
        updatedAt: new Date(),
      },
    })

    await log({
      action: 'assignment_status_updated',
      status: 200,
      user,
      context: `changed status: ${oldStatus} -> ${newStatus}`,
      target: { type: 'assignment', id: numId },
      changes: {
        status: { before: oldStatus, after: newStatus },
      },
      meta: {
        ip,
        ua,
        oldStatus,
        newStatus,
        assigneeId: assignment.assigneeId,
        userId: assignment.userId,
      },
    })

    return NextResponse.json({
      success: true,
      assignment: updated,
    })
  } catch (e) {
    reportError(e instanceof Error ? e : new Error(String(e)), {
      route: 'PATCH /api/admin/assignments/[id]/status',
    })
    return NextResponse.json({ error: 'shit broke' }, { status: 500 })
  }
})
