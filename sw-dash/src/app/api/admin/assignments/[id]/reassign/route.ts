import { NextResponse } from 'next/server'
import { PERMS } from '@/lib/perms'
import { prisma } from '@/lib/db'
import { reportError } from '@/lib/error-tracking'
import { push } from '@/lib/push-server'
import { msgs } from '@/lib/notifs'
import { withParams } from '@/lib/api'

export const PATCH = withParams(PERMS.assign_override)(async ({ req, params }) => {
  try {
    const numId = parseInt(params.id, 10)
    if (isNaN(numId)) {
      return NextResponse.json({ error: 'bad id' }, { status: 400 })
    }

    const { newAssigneeId } = await req.json()

    if (!newAssigneeId) {
      return NextResponse.json({ error: 'newAssigneeId is required' }, { status: 400 })
    }

    const assigneeIdNum = parseInt(newAssigneeId, 10)
    if (isNaN(assigneeIdNum)) {
      return NextResponse.json({ error: 'bad assignee id' }, { status: 400 })
    }

    const current = await prisma.assignment.findUnique({
      where: { id: numId },
      include: {
        assignee: {
          select: {
            id: true,
            username: true,
            slackId: true,
          },
        },
      },
    })

    if (!current) {
      return NextResponse.json({ error: 'assignment doesnt exist dipshit' }, { status: 404 })
    }

    const newAssignee = await prisma.user.findUnique({
      where: { id: assigneeIdNum },
      select: {
        id: true,
        username: true,
        slackId: true,
      },
    })

    if (!newAssignee) {
      return NextResponse.json({ error: 'assignee doesnt exist dipshit' }, { status: 404 })
    }

    const updated = await prisma.assignment.update({
      where: { id: numId },
      data: {
        assigneeId: assigneeIdNum,
        status: 'pending',
      },
      include: {
        author: {
          select: {
            username: true,
            slackId: true,
            avatar: true,
          },
        },
        assignee: {
          select: {
            username: true,
            slackId: true,
            avatar: true,
          },
        },
        shipCert: {
          select: {
            id: true,
            projectName: true,
            projectType: true,
            description: true,
            demoUrl: true,
            repoUrl: true,
            readmeUrl: true,
            devTime: true,
            status: true,
            ftUsername: true,
          },
        },
      },
    })

    if (current.assignee?.id) {
      const hasSubs = await prisma.pushSub.count({
        where: { userId: current.assignee.id },
      })

      if (hasSubs > 0) {
        const msg = msgs.assignment.unassigned(numId)

        try {
          await push(current.assignee.id, msg)
        } catch (e) {
          console.error('push broke:', e)
        }
      }
    }

    if (newAssignee.id) {
      const hasSubs = await prisma.pushSub.count({
        where: { userId: newAssignee.id },
      })

      if (hasSubs > 0) {
        const msg = msgs.assignment.reassigned(numId)

        try {
          await push(newAssignee.id, msg)
        } catch (e) {
          console.error('push broke:', e)
        }
      }
    }

    return NextResponse.json({
      success: true,
      assignment: updated,
    })
  } catch (e) {
    reportError(e instanceof Error ? e : new Error(String(e)), {
      route: 'PATCH /api/admin/assignments/[id]/reassign',
    })
    return NextResponse.json({ error: 'shit broke' }, { status: 500 })
  }
})
