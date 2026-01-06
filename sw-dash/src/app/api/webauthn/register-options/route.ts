import { NextRequest, NextResponse } from 'next/server'
import { generateRegistrationOptions } from '@simplewebauthn/server'
import { prisma } from '@/lib/db'
import { needAuth } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const { user, error } = await needAuth(req)

  if (error) {
    return NextResponse.json(error.error, { status: error.status })
  }

  try {
    const existingKeys = await prisma.yubikey.findMany({
      where: { userId: user!.id },
      select: {
        credentialId: true,
        transports: true,
      },
    })

    const options = await generateRegistrationOptions({
      rpName: process.env.RP_NAME || 'Shipwrights',
      rpID: process.env.RP_ID || 'localhost',
      userName: user!.username,
      userDisplayName: user!.username,
      attestationType: 'none',
      excludeCredentials: existingKeys.map((key) => ({
        id: key.credentialId,
        transports: key.transports ? JSON.parse(key.transports) : undefined,
      })),
      authenticatorSelection: {
        authenticatorAttachment: 'cross-platform',
        residentKey: 'discouraged',
        userVerification: 'preferred',
      },
    })

    await prisma.user.update({
      where: { id: user!.id },
      data: { currentChallenge: options.challenge } as { currentChallenge: string },
    })

    return NextResponse.json(options)
  } catch {
    return NextResponse.json({ error: 'shit broke trying to gen options' }, { status: 500 })
  }
}
