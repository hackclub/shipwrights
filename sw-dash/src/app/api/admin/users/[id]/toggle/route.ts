import { NextResponse } from 'next/server'
import { nuke } from '@/lib/auth'
import { log } from '@/lib/audit'
import { syslog } from '@/lib/syslog'
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

    await log(userId, user.id, isActive ? 'account enabled' : 'account disabled')
    await syslog(
      isActive ? 'users_enabled' : 'users_disabled',
      200,
      user,
      `user #${userId} ${isActive ? 'enabled' : 'disabled'}`,
      { ip, userAgent: ua }
    )

    return NextResponse.json({
      success: true,
      user: updated,
    })
  } catch {
    return NextResponse.json({ error: 'toggle broke' }, { status: 500 })
  }
})
