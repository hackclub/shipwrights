export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'
import { can, PERMS } from '@/lib/perms'
import { log } from '@/lib/log'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const authHeader = req.headers.get('Authorization')

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'need a Bearer key fam' }, { status: 401 })
  }

  const key = authHeader.replace('Bearer ', '')
  const user = await prisma.user.findUnique({
    where: { swApiKey: key },
    select: { id: true, role: true, username: true },
  })

  if (!user || !can(user.role, PERMS.certs_view)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const status = searchParams.get('status')
  const type = searchParams.get('type')
  const since = searchParams.get('since')
  const limitParam = searchParams.get('limit')

  let take: number | undefined = undefined
  if (limitParam) {
    const parsed = parseInt(limitParam, 10)
    if (!isNaN(parsed) && parsed > 0) {
      take = parsed
    }
  }

  const where: Prisma.ShipCertWhereInput = {}

  if (status) {
    where.status = status
  }
  if (type) {
    where.projectType = type
  }
  if (since) {
    const date = new Date(since)
    if (!isNaN(date.getTime())) {
      where.createdAt = { gt: date }
    }
  }

  try {
    const logs = await prisma.shipCert.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take,
      include: {
        reviewer: {
          select: {
            id: true,
            username: true,
            avatar: true,
            slackId: true,
          },
        },
        claimer: {
          select: {
            id: true,
            username: true,
            avatar: true,
            slackId: true,
          },
        },
        assignments: {
          select: {
            id: true,
            repoUrl: true,
            demoUrl: true,
          },
        },
      },
    })

    return NextResponse.json(logs)
  } catch (e: any) {
    await log({
      action: 'wrights_api_exploded',
      status: 500,
      user,
      error: {
        name: e.name || 'Error',
        message: e.message || 'unknown',
        stack: e.stack,
      },
    })
    return NextResponse.json({ error: 'obays API exploded' }, { status: 500 })
  }
}
