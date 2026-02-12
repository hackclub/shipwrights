import { NextRequest, NextResponse } from 'next/server'
import { verifyAuthenticationResponse } from '@simplewebauthn/server'
import { prisma } from '@/lib/db'
import { createSession } from '@/lib/auth'
import { rateLimit } from '@/lib/ratelimit'
import { log } from '@/lib/log'

const authLimiter = rateLimit('webauthn-auth', 10, 60 * 1000)

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'

  const rateLimitResult = authLimiter(ip)
  if (!rateLimitResult.success) {
    return NextResponse.json({ error: 'slow down cowboy' }, { status: 429 })
  }

  try {
    const body = await req.json()
    const { credential, username } = body

    if (!username) {
      return NextResponse.json({ error: 'need username bruh' }, { status: 400 })
    }

    const user = await prisma.user.findFirst({
      where: {
        username,
        isActive: true,
      },
      include: {
        yubikeys: true,
      },
    })

    if (!user || !user.currentChallenge) {
      return NextResponse.json({ error: 'no user or challenge, sus' }, { status: 400 })
    }

    const credIdB64url = credential.id
    const securityKey = user.yubikeys.find(
      (k: { credentialId: string }) => k.credentialId === credIdB64url
    )

    if (!securityKey) {
      return NextResponse.json({ error: 'key not found wtf' }, { status: 400 })
    }

    const verification = await verifyAuthenticationResponse({
      response: credential,
      expectedChallenge: user.currentChallenge,
      expectedOrigin: process.env.NEXTAUTH_URL || 'http://localhost:3000',
      expectedRPID: process.env.RP_ID || 'localhost',
      credential: {
        id: securityKey.credentialId,
        publicKey: new Uint8Array(securityKey.publicKey),
        counter: Number(securityKey.counter),
        transports: securityKey.transports ? JSON.parse(securityKey.transports) : undefined,
      },
    } as never)

    if (!verification.verified) {
      return NextResponse.json({ error: 'auth failed, key didnt match' }, { status: 400 })
    }

    await (prisma as { yubikey: { update: (args: unknown) => Promise<unknown> } }).yubikey.update({
      where: { id: securityKey.id },
      data: {
        counter: BigInt(verification.authenticationInfo.newCounter),
        lastUsedAt: new Date(),
      },
    })

    await prisma.user.update({
      where: { id: user.id },
      data: { currentChallenge: null } as { currentChallenge: null },
    })

    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
    const userAgent = req.headers.get('user-agent') || 'unknown'

    const sessionToken = await createSession(user.id, userAgent, ip)

    await prisma.loginLog.create({
      data: {
        slackId: user.slackId,
        username: user.username,
        success: true,
        ip,
        userAgent,
      },
    })

    await log({
      action: 'auth_login_success',
      status: 200,
      user,
      context: 'yubikey webauthn login',
      meta: { ip, ua: userAgent, keyName: securityKey.name },
    })

    const response = NextResponse.json({ success: true })
    response.cookies.set('session_token', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
    })

    return response
  } catch {
    return NextResponse.json({ error: 'auth verification blew up' }, { status: 500 })
  }
}
