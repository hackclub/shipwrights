import { NextResponse } from 'next/server'
import { can, PERMS } from '@/lib/perms'
import { prisma } from '@/lib/db'
import { reportError } from '@/lib/error-tracking'
import { withParams } from '@/lib/api'

export const GET = withParams()(async ({ params }) => {
  try {
    const numId = parseInt(params.id, 10)
    if (isNaN(numId)) {
      return NextResponse.json({ error: 'invalid id dipshit' }, { status: 400 })
    }

    const assignment = await prisma.assignment.findFirst({
      where: {
        id: numId,
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

    if (!assignment) {
      return NextResponse.json({ error: 'assignment doesnt exist dipshit' }, { status: 404 })
    }

    return NextResponse.json({ assignment })
  } catch (e) {
    reportError(e instanceof Error ? e : new Error(String(e)), {
      route: 'GET /api/admin/assignments/[id]',
    })
    return NextResponse.json({ error: 'shit broke' }, { status: 500 })
  }
})

export const PATCH = withParams()(async ({ user, req, params }) => {
  try {
    const numId = parseInt(params.id, 10)
    if (isNaN(numId)) {
      return NextResponse.json({ error: 'invalid id dipshit' }, { status: 400 })
    }

    const assignment = await prisma.assignment.findFirst({
      where: { id: numId },
    })

    if (!assignment) {
      return NextResponse.json({ error: 'assignment doesnt exist dipshit' }, { status: 404 })
    }

    const isOwner = assignment.assigneeId === user.id
    const hasEditPerm = can(user.role, PERMS.assign_edit)
    const hasOverride = can(user.role, PERMS.assign_override)

    if (!((isOwner && hasEditPerm) || hasOverride)) {
      return NextResponse.json({ error: 'not your assignment dipshit' }, { status: 403 })
    }

    const { description, repoUrl } = await req.json()

    const updated = await prisma.assignment.update({
      where: { id: numId },
      data: {
        description,
        repoUrl,
      },
    })

    return NextResponse.json({
      success: true,
      assignment: updated,
    })
  } catch (e) {
    reportError(e instanceof Error ? e : new Error(String(e)), {
      route: 'PATCH /api/admin/assignments/[id]',
    })
    return NextResponse.json({ error: 'shit broke' }, { status: 500 })
  }
})
