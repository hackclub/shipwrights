import { NextResponse } from 'next/server'
import { log } from '@/lib/audit'
import { syslog } from '@/lib/syslog'
import { can, PERMS } from '@/lib/perms'
import { prisma } from '@/lib/db'
import { badSkills } from '@/lib/skills'
import { withParams } from '@/lib/api'

export const GET = withParams()(async ({ user, params }) => {
  try {
    const userId = parseInt(params.id)
    if (isNaN(userId)) {
      return NextResponse.json({ error: 'user ID is fucked' }, { status: 400 })
    }

    const isSelf = user.id === userId
    if (!isSelf && !can(user.role, PERMS.users_view)) {
      return NextResponse.json({ error: 'nice try bozo' }, { status: 403 })
    }

    const target = await prisma.user.findUnique({
      where: { id: userId },
      select: { skills: true },
    })

    if (!target) {
      return NextResponse.json({ error: 'who dat' }, { status: 404 })
    }

    return NextResponse.json({ skills: target.skills || [] })
  } catch {
    return NextResponse.json({ error: 'couldnt grab skills' }, { status: 500 })
  }
})

export const POST = withParams()(async ({ user, req, params, ip, ua }) => {
  try {
    const userId = parseInt(params.id)
    if (isNaN(userId)) {
      return NextResponse.json({ error: 'user ID is fucked' }, { status: 400 })
    }

    const { skills } = await req.json()

    const isSelf = user.id === userId
    if (!isSelf && !can(user.role, PERMS.users_edit)) {
      return NextResponse.json({ error: 'nice try bozo' }, { status: 403 })
    }

    if (!Array.isArray(skills)) {
      return NextResponse.json({ error: 'skills must be an array dipshit' }, { status: 400 })
    }

    const invalid = badSkills(skills)
    if (invalid.length > 0) {
      return NextResponse.json({ error: `shitty skills: ${invalid.join(', ')}` }, { status: 400 })
    }

    const target = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!target) {
      return NextResponse.json({ error: 'user doesnt exist dipshit' }, { status: 404 })
    }

    await prisma.user.update({
      where: { id: userId },
      data: { skills: skills },
    })

    if (!isSelf) {
      await log(userId, user.id, 'skills updated', skills.join(', '))
      await syslog(
        'users_skills_updated',
        200,
        user,
        `user #${userId} - skills: ${skills.join(', ')}`,
        { ip, userAgent: ua }
      )
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'skills update fucked up' }, { status: 500 })
  }
})
