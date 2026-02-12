import { NextResponse } from 'next/server'
import { log as auditLog } from '@/lib/audit'
import { log } from '@/lib/log'
import { PERMS } from '@/lib/perms'
import { prisma } from '@/lib/db'
import { parseId, idErr } from '@/lib/utils'
import { bust } from '@/lib/cache'
import { withParams } from '@/lib/api'

export const GET = withParams(PERMS.users_admin)(async ({ params }) => {
  try {
    const userId = parseId(params.id, 'user ID')
    if (!userId) {
      return idErr('user ID')
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      return NextResponse.json({ error: 'user doesnt exist dipshit' }, { status: 404 })
    }

    return NextResponse.json({
      user: {
        id: user.id,
        username: user.username,
        slackId: user.slackId,
        avatar: user.avatar,
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt,
        skills: user.skills,
        staffNotes: user.staffNotes,
      },
    })
  } catch {
    return NextResponse.json({ error: 'shit hit the fan' }, { status: 500 })
  }
})

export const PATCH = withParams(PERMS.users_edit)(async ({ user, req, params, ip, ua }) => {
  try {
    const userId = parseId(params.id, 'user ID')
    if (!userId) {
      return idErr('user ID')
    }

    const body = await req.json()
    const { role } = body

    const validRoles = [
      'megawright',
      'hq',
      'captain',
      'shipwright',
      'observer',
      'fraudster',
      'ysws_reviewer',
      'sw_ysws',
    ]
    if (role && !validRoles.includes(role)) {
      return NextResponse.json({ error: 'role is fucked up' }, { status: 400 })
    }

    const updateData: { role?: string } = {}
    if (role !== undefined) updateData.role = role

    const target = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } })

    const updated = await prisma.user.update({
      where: { id: userId },
      data: updateData,
    })

    if (role !== undefined) {
      await auditLog(userId, user.id, `role changed to ${role}`)
      await log({
        action: 'users_role_changed',
        status: 200,
        user,
        context: `role changed to ${role}`,
        target: { type: 'user', id: userId },
        changes: {
          role: { before: target?.role, after: role },
        },
        meta: { ip, ua },
      })
    }

    await bust('cache:users')
    await bust('cache:admin*')

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
    return NextResponse.json({ error: 'shit the bed again' }, { status: 500 })
  }
})

export const DELETE = withParams(PERMS.users_admin)(async ({ user, params, ip, ua }) => {
  try {
    const userId = parseId(params.id, 'user ID')
    if (!userId) {
      return idErr('user ID')
    }

    if (user.id === userId) {
      return NextResponse.json({ error: 'cant delete urself dumbass' }, { status: 400 })
    }

    await prisma.user.delete({
      where: { id: userId },
    })

    await auditLog(userId, user.id, 'user deleted')
    await log({
      action: 'users_deleted',
      status: 200,
      user,
      context: 'user deleted',
      target: { type: 'user', id: userId },
      meta: { ip, ua },
    })

    await bust('cache:users')
    await bust('cache:admin*')

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'delete went to hell' }, { status: 500 })
  }
})
