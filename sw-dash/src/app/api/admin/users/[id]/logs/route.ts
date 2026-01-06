import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { PERMS } from '@/lib/perms'
import { withParams } from '@/lib/api'

export const GET = withParams(PERMS.users_admin)(async ({ params }) => {
  const userId = parseInt(params.id)
  if (isNaN(userId)) return NextResponse.json({ error: 'invalid id' }, { status: 400 })

  const logs = await prisma.auditLog.findMany({
    where: { userId },
    include: { admin: { select: { username: true } } },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ logs })
})
