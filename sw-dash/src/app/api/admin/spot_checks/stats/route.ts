import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withParams } from '@/lib/api'
import { PERMS } from '@/lib/perms'

export const GET = withParams<Record<string, never>>(PERMS.spot_check)(async () => {
  try {
    const [total, rejected, checked, unchecked, approved] = await Promise.all([
      prisma.spotCheck.count(),
      prisma.spotCheck.count({ where: { decision: 'rejected' } }),
      prisma.shipCert.count({ where: { spotChecked: true } }),
      prisma.shipCert.count({
        where: {
          spotChecked: false,
          status: { in: ['approved', 'rejected'] },
          reviewerId: { not: null },
        },
      }),
      prisma.spotCheck.count({ where: { decision: 'approved' } }),
    ])

    const failRate = total > 0 ? ((rejected / total) * 100).toFixed(1) : 0
    const successRate = total > 0 ? ((approved / total) * 100).toFixed(1) : 0

    const shipwrights = await prisma.user.findMany({
      where: { shipCerts: { some: { status: { in: ['approved', 'rejected'] } } } },
      select: {
        id: true,
        username: true,
        avatar: true,
        role: true,
        _count: {
          select: {
            shipCerts: { where: { status: { in: ['approved', 'rejected'] } } },
            spotReviewed: true,
          },
        },
        spotReviewed: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            createdAt: true,
            staff: { select: { username: true } },
          },
        },
      },
    })

    const wrights = await Promise.all(
      shipwrights.map(async (s) => {
        const checks = await prisma.spotCheck.findMany({
          where: { reviewerId: s.id },
          select: { decision: true, status: true },
        })

        const passed = checks.filter((c) => c.decision === 'approved').length
        const failed = checks.filter((c) => c.decision === 'rejected').length
        const wrightFailRate = checks.length > 0 ? ((failed / checks.length) * 100).toFixed(1) : 0
        const wrightSuccessRate =
          checks.length > 0 ? ((passed / checks.length) * 100).toFixed(1) : 0

        return {
          id: s.id,
          username: s.username,
          avatar: s.avatar,
          role: s.role,
          reviewed: s._count.shipCerts,
          checked: s._count.spotReviewed,
          failRate: wrightFailRate,
          successRate: wrightSuccessRate,
          casesOpen: checks.filter((c) => c.decision === 'rejected' && c.status === 'unresolved')
            .length,
          casesClosed: checks.filter((c) => c.decision === 'rejected' && c.status === 'resolved')
            .length,
          lastCheck: s.spotReviewed[0]?.createdAt.toISOString() || null,
          lastCheckBy: s.spotReviewed[0]?.staff.username || null,
        }
      })
    )

    wrights.sort((a, b) => b.reviewed - a.reviewed)

    const spotCheckStaff = await prisma.spotCheck.groupBy({
      by: ['staffId'],
      _count: { id: true },
    })

    const staffIds = spotCheckStaff.map((s) => s.staffId)
    if (staffIds.length === 0) {
      return NextResponse.json({
        stats: { total, failRate, successRate, checked, unchecked },
        wrights,
        topCheckers: [],
      })
    }

    const byStaffDecision = await prisma.spotCheck.groupBy({
      by: ['staffId', 'decision'],
      _count: { id: true },
      where: { staffId: { in: staffIds } },
    })

    const decisionMap = new Map<number, { approved: number; rejected: number }>()
    for (const row of byStaffDecision) {
      if (!decisionMap.has(row.staffId)) {
        decisionMap.set(row.staffId, { approved: 0, rejected: 0 })
      }
      const d = decisionMap.get(row.staffId)!
      if (row.decision === 'approved') d.approved = row._count.id
      else if (row.decision === 'rejected') d.rejected = row._count.id
    }

    const users = await prisma.user.findMany({
      where: { id: { in: staffIds } },
      select: { id: true, username: true, avatar: true },
    })
    const userMap = new Map(users.map((u) => [u.id, u]))

    const topCheckers = spotCheckStaff
      .map((s) => {
        const user = userMap.get(s.staffId)
        const decisions = decisionMap.get(s.staffId) || { approved: 0, rejected: 0 }
        return user
          ? {
              id: user.id,
              username: user.username,
              avatar: user.avatar,
              total: s._count.id,
              approved: decisions.approved,
              rejected: decisions.rejected,
            }
          : null
      })
      .filter((s): s is NonNullable<typeof s> => s !== null)
      .sort((a, b) => b.total - a.total)

    return NextResponse.json({
      stats: { total, failRate, successRate, checked, unchecked },
      wrights,
      topCheckers,
    })
  } catch (e) {
    return NextResponse.json({ error: 'stats load failed' }, { status: 500 })
  }
})
