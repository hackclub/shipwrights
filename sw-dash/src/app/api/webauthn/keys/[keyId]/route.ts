import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { needAuth } from '@/lib/auth'
import { log } from '@/lib/audit'
import { can, PERMS } from '@/lib/perms'

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ keyId: string }> }) {
  const { user, error } = await needAuth(req)

  if (error) {
    return NextResponse.json(error.error, { status: error.status })
  }

  if (!can(user!.role, PERMS.users_edit)) {
    return NextResponse.json({ error: 'admins only' }, { status: 403 })
  }

  try {
    const { keyId } = await params

    if (!keyId) {
      return NextResponse.json({ error: 'which key dumbass' }, { status: 400 })
    }

    const key = await prisma.yubikey.findUnique({
      where: { id: keyId },
    })

    if (!key) {
      return NextResponse.json({ error: 'key not found' }, { status: 404 })
    }

    await prisma.yubikey.delete({
      where: { id: keyId },
    })

    await log(key.userId, user!.id, 'yubikey removed', key.credentialId.substring(0, 16))

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'delete went boom' }, { status: 500 })
  }
}
