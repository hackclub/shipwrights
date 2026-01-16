import { NextRequest, NextResponse } from 'next/server'
import { needAuth } from './auth'
import { can } from './perms'
import { getMeta } from './meta'

type User = {
  id: number
  username: string
  role: string
  slackId: string
  isActive: boolean
  avatar?: string | null
}

type Ctx = {
  user: User
  req: NextRequest
  ip: string
  ua: string
}

type CtxWithParams<P> = Ctx & { params: P }

type Handler = (ctx: Ctx) => Promise<NextResponse>
type HandlerWithParams<P> = (ctx: CtxWithParams<P>) => Promise<NextResponse>

export function api(perm?: string) {
  return (handler: Handler) => async (req: NextRequest) => {
    const { user, error } = await needAuth(req)

    if (error || !user) {
      return NextResponse.json({ error: 'who tf are you?' }, { status: 401 })
    }

    if (!user.isActive) {
      return NextResponse.json({ error: 'ur banned lol' }, { status: 403 })
    }

    if (perm && !can(user.role, perm)) {
      return NextResponse.json({ error: 'nice try bozo' }, { status: 403 })
    }

    const { ip, ua } = getMeta(req)

    return handler({ user: user as User, req, ip, ua })
  }
}

export function withParams<P = { id: string }>(perm?: string) {
  return (handler: HandlerWithParams<P>) =>
    async (req: NextRequest, { params }: { params: Promise<P> }) => {
      const { user, error } = await needAuth(req)

      if (error || !user) {
        return NextResponse.json({ error: 'who tf are you?' }, { status: 401 })
      }

      if (!user.isActive) {
        return NextResponse.json({ error: 'ur banned lol' }, { status: 403 })
      }

      if (perm && !can(user.role, perm)) {
        return NextResponse.json({ error: 'nice try bozo' }, { status: 403 })
      }

      const { ip, ua } = getMeta(req)
      const p = await params

      return handler({ user: user as User, req, ip, ua, params: p })
    }
}

export function yswsApi(handler: (req: NextRequest) => Promise<NextResponse>) {
  return async (req: NextRequest) => {
    const key = req.headers.get('x-api-key')

    if (key && key === process.env.YSWS_API_KEY) {
      return handler(req)
    }

    const { user, error } = await needAuth(req)

    if (error || !user) {
      return NextResponse.json({ error: 'who tf are you?' }, { status: 401 })
    }

    if (!user.isActive) {
      return NextResponse.json({ error: 'ur banned lol' }, { status: 403 })
    }

    if (!can(user.role, 'ysws_view')) {
      return NextResponse.json({ error: 'nice try bozo' }, { status: 403 })
    }

    return handler(req)
  }
}
