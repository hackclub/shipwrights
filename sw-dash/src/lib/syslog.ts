import { prisma } from './db'
import { Prisma } from '@prisma/client'

interface LogUser {
  id?: number
  slackId?: string
  username?: string
  role?: string
  email?: string | null
  avatar?: string | null
}

interface LogMeta {
  ip?: string
  userAgent?: string
}

interface LogOpts {
  targetId?: number
  targetType?: string
  metadata?: Record<string, unknown>
  severity?: 'debug' | 'info' | 'warn' | 'error' | 'critical'
}

export async function syslog(
  action: string,
  statusCode: number,
  user?: LogUser | null,
  context?: string,
  meta?: LogMeta,
  opts?: LogOpts
) {
  try {
    await prisma.sysLog.create({
      data: {
        userId: user?.id,
        slackId: user?.slackId,
        username: user?.username,
        role: user?.role,
        email: user?.email,
        avatar: user?.avatar,
        action,
        context,
        statusCode,
        ip: meta?.ip,
        userAgent: meta?.userAgent,
        targetId: opts?.targetId,
        targetType: opts?.targetType,
        metadata: (opts?.metadata || null) as Prisma.InputJsonValue,
        severity: opts?.severity || 'info',
      },
    })
  } catch (e) {
    console.error('syslog failed:', e)
  }
}

export async function logErr(
  error: Error,
  user?: LogUser | null,
  context?: string,
  meta?: LogMeta & { route?: string }
) {
  try {
    await prisma.sysLog.create({
      data: {
        userId: user?.id,
        slackId: user?.slackId,
        username: user?.username,
        role: user?.role,
        email: user?.email,
        avatar: user?.avatar,
        action: 'error',
        context: context || error.message,
        statusCode: 500,
        ip: meta?.ip,
        userAgent: meta?.userAgent,
        metadata: {
          name: error.name,
          message: error.message,
          stack: error.stack,
          route: meta?.route,
        } as Prisma.InputJsonValue,
        severity: 'error',
      },
    })
  } catch (e) {
    console.error('logErr failed:', e)
  }
}

export async function logAction(
  action: string,
  user: LogUser,
  target: { id: number; type: string },
  changes?: Record<string, { old: unknown; new: unknown }>,
  meta?: LogMeta
) {
  try {
    await prisma.sysLog.create({
      data: {
        userId: user.id,
        slackId: user.slackId,
        username: user.username,
        role: user.role,
        email: user.email,
        avatar: user.avatar,
        action,
        context: changes ? `updated ${Object.keys(changes).join(', ')}` : undefined,
        statusCode: 200,
        ip: meta?.ip,
        userAgent: meta?.userAgent,
        targetId: target.id,
        targetType: target.type,
        metadata: (changes || null) as Prisma.InputJsonValue,
        severity: 'info',
      },
    })
  } catch (e) {
    console.error('logAction failed:', e)
  }
}
