import { NextResponse } from 'next/server'
import { PERMS } from '@/lib/perms'
import { prisma } from '@/lib/db'
import { withParams } from '@/lib/api'

export const GET = withParams(PERMS.logs_full)(async ({ params }) => {
  try {
    const log = await prisma.sysLog.findUnique({
      where: { id: params.id },
    })

    if (!log) {
      return NextResponse.json({ error: 'not found' }, { status: 404 })
    }

    return NextResponse.json({
      id: log.id,
      timestamp: log.createdAt,
      user: log.username
        ? {
            id: log.userId,
            username: log.username,
            avatar: log.avatar,
            role: log.role,
          }
        : null,
      action: log.action,
      model: log.targetType,
      recordId: log.targetId,
      context: log.context,
      status: log.statusCode,
      severity: log.severity,
      req: log.reqMethod
        ? {
            method: log.reqMethod,
            url: log.reqUrl,
            body: log.reqBody,
            headers: log.reqHeaders,
          }
        : null,
      res: log.resStatus
        ? {
            status: log.resStatus,
            body: log.resBody,
            headers: log.resHeaders,
          }
        : null,
      error: log.errorName
        ? {
            name: log.errorName,
            message: log.errorMsg,
            stack: log.errorStack,
          }
        : null,
      changes: log.changes,
      meta: {
        ...((log.metadata as any) || {}),
        ip: log.ip,
        ua: log.userAgent,
        duration: log.duration,
      },
    })
  } catch {
    return NextResponse.json({ error: 'shit broke' }, { status: 500 })
  }
})
