import { NextRequest, NextResponse } from 'next/server'
import { needAuth, kill } from '@/lib/auth'
import { syslog } from '@/lib/syslog'

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
    await syslog('auth_logout', 200, user, 'user logged out', { ip, userAgent })

    const response = NextResponse.json({ message: 'logged out like a boss' })
    response.cookies.delete('session_token')

    return response
  } catch {
    return NextResponse.json({ error: 'logout fucked up' }, { status: 500 })
  }
}
