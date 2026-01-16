import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { needAuth } from '@/lib/auth'
import { can, PERMS } from '@/lib/perms'

export async function GET(req: NextRequest) {
  const { user, error } = await needAuth(req)

  if (error) {
    return NextResponse.json(error.error, { status: error.status })
  }

  try {
    const url = new URL(req.url)
    const targetUserId = url.searchParams.get('userId')

    let userId = user!.id

    if (targetUserId && can(user!.role, PERMS.users_view)) {
      userId = parseInt(targetUserId)
    }

    const keys = await prisma.yubikey.findMany({
      where: { userId },
      select: {
        id: true,
        credentialId: true,
        name: true,
        createdAt: true,
        lastUsedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ keys })
  } catch {
    return NextResponse.json({ error: 'couldnt get keys' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const { user, error } = await needAuth(req)

  if (error) {
    return NextResponse.json(error.error, { status: error.status })
  }

  try {
    const { keyId } = await req.json()

    if (!keyId) {
      return NextResponse.json({ error: 'which key dumbass' }, { status: 400 })
    }

    const key = await prisma.yubikey.findUnique({
      where: { id: keyId },
    })

    if (!key || key.userId !== user!.id) {
      return NextResponse.json({ error: 'not your key bro' }, { status: 403 })
    }

    const keyCount = await prisma.yubikey.count({
      where: { userId: user!.id },
    })

    if (keyCount <= 1) {
      return NextResponse.json({ error: 'cant delete ur only key' }, { status: 400 })
    }

    await prisma.yubikey.delete({
      where: { id: keyId },
    })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'delete went boom' }, { status: 500 })
  }
}
