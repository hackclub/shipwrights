import { NextResponse } from 'next/server'
import { log } from '@/lib/audit'
import { syslog } from '@/lib/syslog'
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

    await log(userId, user.id, 'yoinked - all access removed')
    await syslog('users_yoinked', 200, user, `user #${userId} got yoinked - role set to observer`, {
      ip,
      userAgent: ua,
    })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'yoink failed' }, { status: 500 })
  }
})
