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

    await prisma.user.update({
      where: { id: userId },
      data: {
        isActive: true,
      },
    })

    await log(userId, user.id, 'un-yoinked - access restored')
    await syslog('users_unyoinked', 200, user, `user #${userId} got un-yoinked - can login again`, {
      ip,
      userAgent: ua,
    })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'un-yoink failed' }, { status: 500 })
  }
})
