import { NextRequest, NextResponse } from 'next/server'
import { needAuth, kill } from '@/lib/auth'
import { log } from '@/lib/log'

export async function POST(request: NextRequest) {
  try {
    const { user, error } = await needAuth(request)
    const ip =
      request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'
    const token = request.cookies.get('session_token')?.value

    if (error) {
      return NextResponse.json(error, { status: error.status })
    }

    await kill(token || '')
    await log({
      action: 'auth_logout_success',
      status: 200,
      user,
      context: 'user logged out',
      meta: { ip, ua: userAgent },
    })

    const response = NextResponse.json({ message: 'logged out like a boss' })
    response.cookies.delete('session_token')

    return response
  } catch {
    return NextResponse.json({ error: 'logout fucked up' }, { status: 500 })
  }
}
