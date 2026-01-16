import { NextResponse } from 'next/server'
import { log } from '@/lib/audit'
import { syslog } from '@/lib/syslog'
import { PERMS } from '@/lib/perms'
import { prisma } from '@/lib/db'
import { withParams } from '@/lib/api'

export const POST = withParams(PERMS.users_edit)(async ({ user, req, params, ip, ua }) => {
  try {
    const userId = parseInt(params.id)
    if (isNaN(userId)) {
      return NextResponse.json({ error: 'user ID is fucked' }, { status: 400 })
    }

    const body = await req.json()
    const { staffNotes } = body

    if (typeof staffNotes !== 'string') {
      return NextResponse.json({ error: 'notes gotta be a string' }, { status: 400 })
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { staffNotes },
    })

    await log(userId, user.id, 'updated staff notes', staffNotes)
    await syslog('users_notes_updated', 200, user, `user #${userId} - notes: ${staffNotes}`, {
      ip,
      userAgent: ua,
    })

    return NextResponse.json({
      user: {
        id: updated.id,
        username: updated.username,
        slackId: updated.slackId,
        avatar: updated.avatar,
        role: updated.role,
        isActive: updated.isActive,
        createdAt: updated.createdAt,
        skills: updated.skills,
        staffNotes: updated.staffNotes,
      },
    })
  } catch {
    return NextResponse.json({ error: 'shit hit the fan' }, { status: 500 })
  }
})
