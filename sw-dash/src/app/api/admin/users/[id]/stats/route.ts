import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { PERMS } from '@/lib/perms'
import { withParams } from '@/lib/api'

export const GET = withParams(PERMS.users_view)(async ({ params }) => {
  const userId = parseInt(params.id)
  if (isNaN(userId)) {
    return NextResponse.json({ error: 'user id is fucked' }, { status: 400 })
  }

  try {
    const certs = await prisma.shipCert.findMany({
      where: { reviewerId: userId },
      select: {
        status: true,
        reviewCompletedAt: true,
      },
    })

    const total = certs.length
    const approved = certs.filter((c) => c.status === 'approved').length
    const rejected = certs.filter((c) => c.status === 'rejected').length

    return NextResponse.json({
      total,
      approved,
      rejected,
    })
  } catch {
    return NextResponse.json({ error: 'stats fetch shit the bed' }, { status: 500 })
  }
})
