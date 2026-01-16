import { NextResponse } from 'next/server'
import { PERMS } from '@/lib/perms'
import { prisma } from '@/lib/db'
import { api } from '@/lib/api'

export const GET = api(PERMS.logs_full)(async ({ req }) => {
  try {
    const { searchParams } = new URL(req.url)
    const limit = parseInt(searchParams.get('limit') || '100')
    const action = searchParams.get('action')
    const userId = searchParams.get('userId')

    const where: { action?: string; userId?: number } = {}
    if (action) where.action = action
    if (userId) where.userId = parseInt(userId)

    const logs = await prisma.sysLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, 1000),
    })

    return NextResponse.json({ logs })
  } catch {
    return NextResponse.json({ error: 'shit broke' }, { status: 500 })
  }
})
