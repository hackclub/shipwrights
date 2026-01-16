import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { reportError } from '@/lib/error-tracking'
import { withParams } from '@/lib/api'

export const GET = withParams()(async ({ user, params }) => {
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

    const subscription = await prisma.assignSubsc.findUnique({
      where: {
        userId_assignmentId: {
          userId: user.id,
          assignmentId: numId,
        },
      },
    })

    return NextResponse.json({
      isSubscribed: subscription ? subscription.isSubscribed : false,
    })
  } catch (e) {
    reportError(e instanceof Error ? e : new Error(String(e)), {
      route: 'GET /api/admin/assignments/[id]/subscription',
    })
    return NextResponse.json({ error: 'subscription check broke' }, { status: 500 })
  }
})
