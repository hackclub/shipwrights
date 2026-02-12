import { NextResponse } from 'next/server'
import { PERMS } from '@/lib/perms'
import { prisma } from '@/lib/db'
import { api } from '@/lib/api'

export const GET = api(PERMS.logs_full)(async ({ req }) => {
  try {
    const url = new URL(req.url)
    const search = url.searchParams.get('q')
    const model = url.searchParams.get('model')
    const recordId = url.searchParams.get('recordId')
    const action = url.searchParams.get('action')
    const username = url.searchParams.get('username')
    const from = url.searchParams.get('from')
    const to = url.searchParams.get('to')
    const severity = url.searchParams.get('severity')
    const page = parseInt(url.searchParams.get('page') || '1')
    const limit = 50

    const where: any = {}

    if (search) {
      where.OR = [{ action: { contains: search } }, { context: { contains: search } }]
    }

    if (model) where.targetType = model
    if (recordId) where.targetId = parseInt(recordId)
    if (action) where.action = { contains: action }
    if (username) where.username = { contains: username }
    if (severity) where.severity = severity

    if (from || to) {
      where.createdAt = {}
      if (from) where.createdAt.gte = new Date(from)
      if (to) where.createdAt.lte = new Date(to)
    }

    const [logs, total] = await Promise.all([
      prisma.sysLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.sysLog.count({ where }),
    ])

    return NextResponse.json({
      logs: logs.map((l) => ({
        id: l.id,
        timestamp: l.createdAt,
        user: l.username
          ? {
              username: l.username,
              avatar: l.avatar,
            }
          : null,
        action: l.action,
        model: l.targetType,
        recordId: l.targetId,
        changes: l.changes ? Object.keys(l.changes as any) : [],
        status: l.statusCode,
        severity: l.severity,
      })),
      total,
      page,
      pages: Math.ceil(total / limit),
    })
  } catch {
    return NextResponse.json({ error: 'shit broke' }, { status: 500 })
  }
})
