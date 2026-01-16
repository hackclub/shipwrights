import { NextRequest, NextResponse } from 'next/server'
import { createSession } from '@/lib/auth'
import { rateLimit } from '@/lib/ratelimit'
import { syslog } from '@/lib/syslog'
import { prisma } from '@/lib/db'

const loginLimiter = rateLimit('slack-callback', 5, 60 * 1000)

export async function GET(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'

  const rateLimitResult = loginLimiter(ip)
  if (!rateLimitResult.success) {
    return NextResponse.redirect(new URL('/?error=slow_down_buddy', process.env.NEXTAUTH_URL!))
  }

  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const error = searchParams.get('error')

    const ip =
      request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'

    if (error) {
      await prisma.loginLog.create({
        data: {
          success: false,
          ip,
          userAgent,
        },
      })

      await syslog('auth_login_fail', 401, null, 'oauth error', { ip, userAgent })

      return NextResponse.redirect(
        new URL('/?error=no_access_get_fucked', process.env.NEXTAUTH_URL!)
      )
    }

    if (!code) {
      await prisma.loginLog.create({
        data: {
          success: false,
          ip,
          userAgent,
        },
      })

      await syslog('auth_login_fail', 400, null, 'no code', { ip, userAgent })

      return NextResponse.redirect(new URL('/?error=invalid_request', process.env.NEXTAUTH_URL!))
    }

    const redirectUri = `${process.env.NEXTAUTH_URL}/api/auth/slack/callback`

    const tokenResponse = await fetch('https://slack.com/api/openid.connect.token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.SLACK_CLIENT_ID!,
        client_secret: process.env.SLACK_CLIENT_SECRET!,
        code,
        redirect_uri: redirectUri,
      }),
    })

    const tokenData = await tokenResponse.json()

    if (!tokenData.ok) {
      await prisma.loginLog.create({
        data: {
          success: false,
          ip,
          userAgent,
        },
      })

      await syslog('auth_login_fail', 401, null, 'token exchange failed', { ip, userAgent })

      return NextResponse.redirect(
        new URL('/?error=token_exchange_failed', process.env.NEXTAUTH_URL!)
      )
    }

    const userInfoResponse = await fetch('https://slack.com/api/openid.connect.userInfo', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    })

    const userInfo = await userInfoResponse.json()

    if (!userInfo.ok) {
      await prisma.loginLog.create({
        data: {
          slackId: userInfo.sub,
          username: userInfo.name,
          success: false,
          ip,
          userAgent,
        },
      })

      await syslog(
        'auth_login_fail',
        401,
        {
          slackId: userInfo.sub,
          username: userInfo.name,
          email: userInfo.email,
          avatar: userInfo.picture,
        },
        'user info failed',
        { ip, userAgent }
      )

      return NextResponse.redirect(new URL('/?error=user_info_failed', process.env.NEXTAUTH_URL!))
    }

    const authorizedUser = await prisma.user.findUnique({
      where: { slackId: userInfo.sub },
    })

    if (!authorizedUser || !authorizedUser.isActive) {
      await prisma.loginLog.create({
        data: {
          slackId: userInfo.sub,
          username: userInfo.name,
          success: false,
          ip,
          userAgent,
        },
      })

      await syslog(
        'auth_login_denied',
        403,
        {
          slackId: userInfo.sub,
          username: userInfo.name,
          email: userInfo.email,
          avatar: userInfo.picture,
        },
        'not authorized',
        { ip, userAgent }
      )

      return NextResponse.redirect(new URL('/?error=naughty_fucker', process.env.NEXTAUTH_URL!))
    }

    await prisma.loginLog.create({
      data: {
        slackId: userInfo.sub,
        username: userInfo.name,
        success: true,
        ip,
        userAgent,
      },
    })

    const sessionToken = await createSession(authorizedUser.id, userAgent, ip)

    await syslog(
      'auth_login_success',
      200,
      {
        id: authorizedUser.id,
        slackId: authorizedUser.slackId,
        username: authorizedUser.username,
        role: authorizedUser.role,
        email: userInfo.email,
        avatar: userInfo.picture,
      },
      'logged in',
      { ip, userAgent }
    )

    const response = NextResponse.redirect(new URL('/admin', process.env.NEXTAUTH_URL!))
    response.cookies.set('session_token', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 86400 * 7,
    })

    return response
  } catch {
    const ip = request.headers.get('x-forwarded-for') || 'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'
    await prisma.loginLog.create({
      data: {
        success: false,
        ip,
        userAgent,
      },
    })

    await syslog('auth_login_error', 500, null, 'shit broke during login', { ip, userAgent })

    return NextResponse.redirect(new URL('/?error=server_bumbum', process.env.NEXTAUTH_URL!))
  }
}
