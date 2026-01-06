import { NextRequest, NextResponse } from 'next/server'
import { generateAuthenticationOptions } from '@simplewebauthn/server'
import { prisma } from '@/lib/db'

export async function POST(req: NextRequest) {
  try {
    const { username } = await req.json()

    if (!username) {
      return NextResponse.json({ error: 'gimme a username' }, { status: 400 })
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

    if (!user || user.yubikeys.length === 0) {
      return NextResponse.json({ error: 'no keys found for this user' }, { status: 404 })
    }

    const options = await generateAuthenticationOptions({
      rpID: process.env.RP_ID || 'localhost',
      allowCredentials: user.yubikeys.map((key) => ({
        id: key.credentialId,
        transports: key.transports ? JSON.parse(key.transports) : undefined,
      })),
      userVerification: 'preferred',
    })

    await prisma.user.update({
      where: { id: user.id },
      data: { currentChallenge: options.challenge } as { currentChallenge: string },
    })

    return NextResponse.json(options)
  } catch {
    return NextResponse.json({ error: 'options gen died' }, { status: 500 })
  }
}
