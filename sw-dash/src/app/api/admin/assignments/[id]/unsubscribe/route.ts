import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { reportError } from '@/lib/error-tracking'
import { withParams } from '@/lib/api'

export const POST = withParams()(async ({ user, params }) => {
  try {
    const numId = parseInt(params.id, 10)
    if (isNaN(numId)) {
      return NextResponse.json({ error: 'bad id' }, { status: 400 })
    }

    const assignment = await prisma.assignment.findUnique({
      where: { id: numId },
    })

    if (!assignment) {
      return NextResponse.json({ error: 'assignment doesnt exist dipshit' }, { status: 404 })
    }

    await prisma.assignSubsc.upsert({
      where: {
        userId_assignmentId: {
          userId: user.id,
          assignmentId: numId,
        },
      },
      update: {
        isSubscribed: false,
      },
      create: {
        userId: user.id,
        assignmentId: numId,
        isSubscribed: false,
      },
    })

    return NextResponse.json({
      success: true,
    })
  } catch (e) {
    reportError(e instanceof Error ? e : new Error(String(e)), {
      route: 'POST /api/admin/assignments/[id]/unsubscribe',
    })
    return NextResponse.json({ error: 'unsubscribe broke' }, { status: 500 })
  }
})
