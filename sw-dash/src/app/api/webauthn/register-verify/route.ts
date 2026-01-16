import { NextRequest, NextResponse } from 'next/server'
import { verifyRegistrationResponse } from '@simplewebauthn/server'
import { prisma } from '@/lib/db'
import { needAuth } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const { user, error } = await needAuth(req)

  if (error) {
    return NextResponse.json(error.error, { status: error.status })
  }

  try {
    const body = await req.json()
    const { credential, name } = body

    if (!name || name.trim().length === 0) {
      return NextResponse.json({ error: 'name your damn key' }, { status: 400 })
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: user!.id },
    })

    if (!dbUser || !dbUser.currentChallenge) {
      return NextResponse.json({ error: 'no challenge found, wtf' }, { status: 400 })
    }

    const verification = await verifyRegistrationResponse({
      response: credential,
      expectedChallenge: dbUser.currentChallenge,
      expectedOrigin: process.env.NEXTAUTH_URL || 'http://localhost:3000',
      expectedRPID: process.env.RP_ID || 'localhost',
    })

    if (!verification.verified || !verification.registrationInfo) {
      return NextResponse.json({ error: 'verification failed, key sus' }, { status: 400 })
    }

    const { credential: cred } = verification.registrationInfo

    const credIdToStore =
      typeof cred.id === 'string' ? cred.id : Buffer.from(cred.id).toString('base64')

    await prisma.yubikey.create({
      data: {
        userId: user!.id,
        credentialId: credIdToStore,
        publicKey: Buffer.from(cred.publicKey),
        counter: BigInt(cred.counter),
        transports: credential.response.transports
          ? JSON.stringify(credential.response.transports)
          : null,
        name: name.trim(),
      },
    })

    await prisma.user.update({
      where: { id: user!.id },
      data: { currentChallenge: null } as { currentChallenge: null },
    })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'reg verification exploded' }, { status: 500 })
  }
}
