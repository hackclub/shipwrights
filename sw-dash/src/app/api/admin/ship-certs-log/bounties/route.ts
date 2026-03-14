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

  const since = searchParams.get('since')
  const limitParam = searchParams.get('limit')

  let take = 50
  if (limitParam) {
    const parsed = parseInt(limitParam, 10)
    if (!isNaN(parsed) && parsed > 0) take = parsed
  }

  const logWhere: Prisma.SysLogWhereInput = {
    action: 'ship_cert_bounty_set',
    targetType: 'ship_cert',
    targetId: { not: null },
  }

  if (since) {
    const date = new Date(since)
    if (!isNaN(date.getTime())) logWhere.createdAt = { gt: date }
  }

  try {
    const logs = await prisma.sysLog.findMany({
      where: logWhere,
      orderBy: { createdAt: 'desc' },
      take,
      select: {
        targetId: true,
        createdAt: true,
      },
    })

    if (logs.length === 0) {
      return NextResponse.json([])
    }

    const certIds = [...new Set(logs.map((l) => l.targetId!).filter(Boolean))]

    const certs = await prisma.shipCert.findMany({
      where: { id: { in: certIds } },
      select: {
        id: true,
        projectName: true,
        projectType: true,
        description: true,
        customBounty: true,
      },
    })

    const certMap = new Map(certs.map((c) => [c.id, c]))

    const out = logs
      .map((l) => {
        const cert = certMap.get(l.targetId!)
        if (!cert) return null
        return {
          id: cert.id,
          name: cert.projectName,
          type: cert.projectType,
          description: cert.description,
          customBounty: cert.customBounty,
          created_at: l.createdAt.toISOString(),
        }
      })
      .filter(Boolean)

    return NextResponse.json(out)
  } catch (e: any) {
    await log({
      action: 'bounties_api_exploded',
      status: 500,
      user,
      error: {
        name: e.name || 'Error',
        message: e.message || 'unknown',
        stack: e.stack,
      },
    })
    return NextResponse.json({ error: 'bounties API exploded' }, { status: 500 })
  }
}
