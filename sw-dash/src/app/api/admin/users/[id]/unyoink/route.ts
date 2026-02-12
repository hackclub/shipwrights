import { NextResponse } from 'next/server'
import { log as auditLog } from '@/lib/audit'
import { log } from '@/lib/log'
import { PERMS } from '@/lib/perms'
import { prisma } from '@/lib/db'
import { withParams } from '@/lib/api'

export const POST = withParams(PERMS.users_admin)(async ({ user, params, ip, ua }) => {
  try {
    const userId = parseInt(params.id)
    if (isNaN(userId)) {
      return NextResponse.json({ error: 'user id fucked' }, { status: 400 })
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        isActive: true,
      },
    })

    await auditLog(userId, user.id, 'un-yoinked - access restored')
    await log({
      action: 'users_unyoinked',
      status: 200,
      user,
      context: 'access restored, can login again',
      target: { type: 'user', id: userId },
      changes: {
        isActive: { before: false, after: true },
      },
      meta: { ip, ua },
    })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'un-yoink failed' }, { status: 500 })
  }
})
