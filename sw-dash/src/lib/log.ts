import { prisma } from './db'
import { Prisma } from '@prisma/client'

interface User {
  id?: number
  slackId?: string
  username?: string
  role?: string
  email?: string | null
  avatar?: string | null
}

interface LogData {
  action: string
  status?: number
  user?: User | null
  context?: string
  target?: {
    id: number
    type: string
  }
  req?: {
    method?: string
    url?: string
    body?: any
    headers?: Record<string, string>
  }
  res?: {
    status?: number
    body?: any
    headers?: Record<string, string>
  }
  error?: {
    name: string
    message: string
    stack?: string
  }
  changes?: Record<string, { before: any; after: any }>
  meta?: Record<string, any>
}

export async function log(data: LogData) {
  try {
    await prisma.sysLog.create({
      data: {
        userId: data.user?.id,
        slackId: data.user?.slackId,
        username: data.user?.username,
        role: data.user?.role,
        email: data.user?.email,
        avatar: data.user?.avatar,
        action: data.action,
        context: data.context,
        statusCode: data.status ?? 200,
        ip: data.meta?.ip,
        userAgent: data.meta?.ua,
        targetId: data.target?.id,
        targetType: data.target?.type,
        metadata: (data.meta || null) as Prisma.InputJsonValue,
        reqMethod: data.req?.method,
        reqUrl: data.req?.url,
        reqBody: data.req?.body as Prisma.InputJsonValue,
        reqHeaders: data.req?.headers as Prisma.InputJsonValue,
        resStatus: data.res?.status,
        resBody: data.res?.body as Prisma.InputJsonValue,
        resHeaders: data.res?.headers as Prisma.InputJsonValue,
        errorName: data.error?.name,
        errorMsg: data.error?.message,
        errorStack: data.error?.stack,
        changes: data.changes as Prisma.InputJsonValue,
      },
    })
  } catch (e) {
    console.error('log failed:', e)
  }
}

export async function traced<T>(
  name: string,
  fn: () => Promise<T>,
  opts?: { user?: User; meta?: any }
): Promise<T> {
  const start = Date.now()
  try {
    const result = await fn()
    return result
  } catch (e: any) {
    await log({
      action: `${name}_error`,
      status: 500,
      user: opts?.user,
      error: {
        name: e.name || 'Error',
        message: e.message || 'unknown error',
        stack: e.stack,
      },
      meta: opts?.meta,
    })
    throw e
  }
}

function sanitize(headers: Headers): Record<string, string> {
  const h: Record<string, string> = {}
  const skip = ['authorization', 'cookie', 'set-cookie']
  headers.forEach((v, k) => {
    if (!skip.includes(k.toLowerCase())) h[k] = v
  })
  return h
}

async function cloneBody(obj: any): Promise<any> {
  if (!obj || typeof obj.clone !== 'function') return undefined
  try {
    const cloned = obj.clone()
    const text = await cloned.text()
    if (!text) return undefined
    try {
      return JSON.parse(text)
    } catch {
      return text.substring(0, 500)
    }
  } catch {
    return undefined
  }
}

export function withLog<T extends (...args: any[]) => Promise<Response>>(handler: T): T {
  return (async (...args: any[]) => {
    const start = Date.now()
    const [req, context] = args
    let res: Response | undefined
    let err: any

    try {
      res = await handler(...args)
      return res
    } catch (e) {
      err = e
      throw e
    } finally {
      const url = new URL(req.url)
      await log({
        action: `api_${req.method?.toLowerCase()}`,
        status: res?.status || (err ? 500 : 200),
        user: context?.user,
        req: {
          method: req.method,
          url: url.pathname,
          body: await cloneBody(req),
          headers: sanitize(req.headers),
        },
        res: res
          ? {
              status: res.status,
              body: await cloneBody(res),
            }
          : undefined,
        error: err
          ? {
              name: err.name || 'Error',
              message: err.message || 'shit broke',
              stack: err.stack,
            }
          : undefined,
        meta: {
          ip: context?.ip,
          ua: context?.ua,
        },
      })
    }
  }) as T
}
