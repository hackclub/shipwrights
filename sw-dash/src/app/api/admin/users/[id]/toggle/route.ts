import { NextResponse } from 'next/server'
import { nuke } from '@/lib/auth'
import { log as auditLog } from '@/lib/audit'
import { log } from '@/lib/log'
import { PERMS } from '@/lib/perms'
import { prisma } from '@/lib/db'
import { withParams } from '@/lib/api'

export const POST = withParams(PERMS.users_edit)(async ({ user, req, params, ip, ua }) => {
  try {
    const { isActive } = await req.json()
    const userId = parseInt(params.id)

    if (typeof isActive !== 'boolean') {
      return NextResponse.json({ error: 'isActive is fucked up' }, { status: 400 })
    }

    if (isNaN(userId)) {
      return NextResponse.json({ error: 'user ID is fucked' }, { status: 400 })
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { isActive },
    })

    if (!isActive) {
      await nuke(userId)
    }

    await auditLog(userId, user.id, isActive ? 'account enabled' : 'account disabled')
    await log({
      action: isActive ? 'users_enabled' : 'users_disabled',
      status: 200,
      user,
      context: `account ${isActive ? 'enabled' : 'disabled'}`,
      target: { type: 'user', id: userId },
      changes: {
        isActive: { before: !isActive, after: isActive },
      },
      meta: { ip, ua },
    })

    return NextResponse.json({
      success: true,
      user: updated,
    })
  } catch {
    return NextResponse.json({ error: 'toggle broke' }, { status: 500 })
  }
})
