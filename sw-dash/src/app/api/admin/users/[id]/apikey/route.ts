import { getUser } from '@/lib/server-auth'
import { can, PERMS } from '@/lib/perms'
import { prisma } from '@/lib/db'
import { randomBytes } from 'crypto'
import { NextResponse } from 'next/server'
import { log as auditLog } from '@/lib/audit'

interface Params {
  params: Promise<{ id: string }>
}

export async function POST(req: Request, { params }: Params) {
  const { id } = await params

  const currentUser = await getUser()
  if (!currentUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = parseInt(id, 10)
  if (isNaN(userId)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })

  if (!can(currentUser.role, PERMS.users_edit)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const existing = await prisma.user.findUnique({ where: { id: userId }, select: { swApiKey: true } })
  const action = existing?.swApiKey ? 'api key rolled' : 'api key generated'

  const key = `sw_live_${randomBytes(24).toString('hex')}`

  try {
    await prisma.user.update({
      where: { id: userId },
      data: { swApiKey: key },
    })
    await auditLog(userId, currentUser.id, action)
    return NextResponse.json({ key })
  } catch (e) {
    return NextResponse.json({ error: 'Failed to generate key' }, { status: 500 })
  }
}

export async function DELETE(req: Request, { params }: Params) {
  const { id } = await params
  const currentUser = await getUser()
  if (!currentUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = parseInt(id, 10)
  if (isNaN(userId)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })

  if (!can(currentUser.role, PERMS.users_edit)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    await prisma.user.update({
      where: { id: userId },
      data: { swApiKey: null },
    })
    await auditLog(userId, currentUser.id, 'api key revoked')
    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ error: 'Failed to revoke key' }, { status: 500 })
  }
}
