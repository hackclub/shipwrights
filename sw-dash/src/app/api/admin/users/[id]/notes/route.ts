import { NextResponse } from 'next/server'
import { log as auditLog } from '@/lib/audit'
import { log } from '@/lib/log'
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

    const target = await prisma.user.findUnique({
      where: { id: userId },
      select: { staffNotes: true },
    })

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { staffNotes },
    })

    await auditLog(userId, user.id, 'updated staff notes', staffNotes)
    await log({
      action: 'users_notes_updated',
      status: 200,
      user,
      context: 'staff notes updated',
      target: { type: 'user', id: userId },
      changes: {
        staffNotes: { before: target?.staffNotes, after: staffNotes },
      },
      meta: { ip, ua, notes: staffNotes.substring(0, 100) },
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
