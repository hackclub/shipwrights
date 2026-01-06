import { NextResponse } from 'next/server'
import { api } from '@/lib/api'
import { prisma } from '@/lib/db'
import { reportError } from '@/lib/error-tracking'
import { push } from '@/lib/push-server'
import { msgs } from '@/lib/notifs'
import { cache, bust } from '@/lib/cache'

export const POST = api()(async ({ user, req }) => {
  try {
    const { certId, types, projectName, demoUrl, repoUrl } = await req.json()

    if (!certId || !types || !Array.isArray(types) || types.length === 0) {
      return NextResponse.json({ error: 'missing required fields' }, { status: 400 })
    }

    let shipCertId: number | null = null
    const match = String(certId).match(/\/ship_certifications\/(\d+)/)
    if (match) {
      shipCertId = parseInt(match[1], 10)
    } else if (!isNaN(parseInt(certId, 10))) {
      shipCertId = parseInt(certId, 10)
    }

    let certData = null
    if (shipCertId) {
      certData = await prisma.shipCert.findUnique({
        where: { id: shipCertId },
        select: {
          projectName: true,
          demoUrl: true,
          repoUrl: true,
        },
      })

      const existing = await prisma.assignment.findUnique({
        where: { shipCertId: shipCertId },
        select: {
          id: true,
          status: true,
          assignee: {
            select: { username: true },
          },
        },
      })

      if (existing) {
        return NextResponse.json(
          {
            error: 'assignment already exists for this cert',
            assignmentId: existing.id,
            status: existing.status,
            assignedTo: existing.assignee?.username || null,
          },
          { status: 409 }
        )
      }
    }

    const allUsers = await prisma.user.findMany({
      where: {
        isActive: true,
        id: { not: user.id },
      },
      include: {
        assignedReviews: {
          where: {
            status: { in: ['pending', 'in_progress'] },
          },
        },
      },
    })

    let reviewers = allUsers.filter((u) => {
      const userSkills = (u.skills as string[]) || []
      return types.some((t: string) => userSkills.includes(t))
    })

    if (reviewers.length === 0) {
      const selfUser = await prisma.user.findUnique({
        where: { id: user.id },
        include: {
          assignedReviews: {
            where: {
              status: { in: ['pending', 'in_progress'] },
            },
          },
        },
      })

      if (selfUser) {
        const selfSkills = (selfUser.skills as string[]) || []
        if (types.some((t: string) => selfSkills.includes(t))) {
          reviewers = [selfUser]
        }
      }
    }

    let assigneeId = null
    let assignedTo = null
    let slackId = null

    if (reviewers.length > 0) {
      const loads = reviewers.map((r) => ({
        ...r,
        workload: r.assignedReviews.length,
      }))

      loads.sort((a, b) => a.workload - b.workload)
      const best = loads[0]

      assigneeId = best.id
      assignedTo = best.username
      slackId = best.slackId
    }

    const assignment = await prisma.assignment.create({
      data: {
        userId: user.id,
        assigneeId: assigneeId,
        repoUrl: repoUrl || certData?.repoUrl || '',
        demoUrl: demoUrl || certData?.demoUrl || null,
        projectName: projectName || certData?.projectName || null,
        shipCertId: shipCertId,
        description: types.length === 1 ? `Type: ${types[0]}` : `Types: ${types.join(', ')}`,
        status: assigneeId ? 'pending' : 'unassigned',
      },
    })

    if (assigneeId) {
      const hasSubs = await prisma.pushSub.count({
        where: { userId: assigneeId },
      })

      if (hasSubs > 0) {
        const msg = msgs.assignment.assigned(assignment.id)

        try {
          await push(assigneeId, msg)
        } catch (e) {
          console.error('push broke:', e)
        }
      }
    }

    await bust('cache:assignments*')

    return NextResponse.json({
      success: true,
      assignment: {
        id: assignment.id,
        status: assignment.status,
        assignedTo: assignedTo,
        createdAt: assignment.createdAt,
      },
      message: assigneeId
        ? `auto-assigned to ${assignedTo}`
        : 'no reviewers available with matching skills',
    })
  } catch (e) {
    reportError(e instanceof Error ? e : new Error(String(e)), {
      route: 'POST /api/admin/assignments',
    })
    return NextResponse.json({ error: 'something broke bad' }, { status: 500 })
  }
})

export const GET = api()(async ({ user }) => {
  const data = await cache('cache:assignments', 3600, async () => {
    const assignments = await prisma.assignment.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        author: {
          select: {
            username: true,
          },
        },
        assignee: {
          select: {
            username: true,
          },
        },
      },
    })

    return {
      assignments,
      currentUser: {
        id: user.id,
        username: user.username,
        slackId: user.slackId,
        avatar: user.avatar,
        role: user.role,
        isActive: user.isActive,
      },
    }
  })

  return NextResponse.json(data)
})
