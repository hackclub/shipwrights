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

    await prisma.$transaction([
      prisma.yubikey.deleteMany({
        where: { userId },
      }),
      prisma.user.update({
        where: { id: userId },
        data: {
          sessionToken: null,
          sessionExpires: null,
          isActive: false,
          role: 'observer',
        },
      }),
    ])

    await auditLog(userId, user.id, 'yoinked - all access removed')
    await log({
      action: 'users_yoinked',
      status: 200,
      user,
      context: 'access removed, role -> observer',
      target: { type: 'user', id: userId },
      changes: {
        isActive: { before: true, after: false },
        role: { before: 'unknown', after: 'observer' },
      },
      meta: { ip, ua },
    })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'yoink failed' }, { status: 500 })
  }
})
