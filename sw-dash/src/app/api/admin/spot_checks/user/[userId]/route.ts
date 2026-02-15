import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withParams } from '@/lib/api'
import { PERMS } from '@/lib/perms'
import { parseId, idErr } from '@/lib/utils'

export const GET = withParams<{ userId: string }>(PERMS.spot_check)(async ({ params }) => {
  try {
    const userId = parseId(params.userId, 'user')
    if (!userId) return idErr('user')

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true, avatar: true, role: true },
    })

    if (!user) return NextResponse.json({ error: 'user not found' }, { status: 404 })

    const [reviewed, checks] = await Promise.all([
      prisma.shipCert.count({
        where: {
          reviewerId: userId,
          status: { in: ['approved', 'rejected'] },
        },
      }),
      prisma.spotCheck.findMany({
        where: { reviewerId: userId },
        orderBy: { createdAt: 'desc' },
        include: {
          staff: { select: { username: true } },
          cert: { select: { projectName: true } },
        },
      }),
    ])

    const passed = checks.filter((c) => c.decision === 'approved').length
    const failed = checks.filter((c) => c.decision === 'rejected').length

    const cases = checks
      .filter((c) => c.decision === 'rejected')
      .map((c) => ({
        id: c.id,
        caseId: c.caseId,
        project: c.cert.projectName,
        status: c.status,
        created: c.createdAt.toISOString(),
        staff: c.staff.username,
        why: c.reasoning,
      }))

    return NextResponse.json({
      user,
      stats: {
        reviewed,
        checked: checks.length,
        passed,
        failed,
        passRate: checks.length > 0 ? ((passed / checks.length) * 100).toFixed(1) : 0,
      },
      cases,
    })
  } catch (e) {
    return NextResponse.json({ error: 'profile load failed' }, { status: 500 })
  }
})
