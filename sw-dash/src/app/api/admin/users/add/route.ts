import { NextResponse } from 'next/server'
import { api } from '@/lib/api'
import { PERMS } from '@/lib/perms'
import { syslog } from '@/lib/syslog'
import { prisma } from '@/lib/db'
import { getSlackUser } from '@/lib/slack'

export const POST = api(PERMS.users_add)(async ({ user, req, ip, ua }) => {
  const body = await req.json()
  const { slackId, username, ftuid, role, source, fraudDone, fraudById, notes } = body

  if (!slackId?.trim()) {
    return NextResponse.json({ error: 'slack id missing dummy' }, { status: 400 })
  }
  if (!username?.trim()) {
    return NextResponse.json({ error: 'need a username' }, { status: 400 })
  }
  if (!ftuid?.trim()) {
    return NextResponse.json({ error: 'need FT ID bruh' }, { status: 400 })
  }
  if (!source) {
    return NextResponse.json({ error: 'pick a source' }, { status: 400 })
  }
  if (role !== 'observer' && !fraudDone) {
    return NextResponse.json({ error: 'fraud check required' }, { status: 400 })
  }
  if (role !== 'observer' && !fraudById) {
    return NextResponse.json({ error: 'who did the fraud check?' }, { status: 400 })
  }

  const existing = await prisma.user.findFirst({ where: { slackId } })
  if (existing) {
    return NextResponse.json({ error: 'user already exists bruh' }, { status: 409 })
  }

  let avatar = null
  try {
    const slack = await getSlackUser(slackId)
    avatar = slack.profile?.image_512 || slack.profile?.image_192 || null
  } catch {}

  const isActive = role !== 'observer' && fraudDone

  const newUser = await prisma.user.create({
    data: {
      slackId,
      username,
      ftuid,
      avatar,
      role,
      isActive,
      staffNotes: notes || null,
    },
  })

  await syslog(
    'user_added',
    200,
    user,
    `added ${username} (${slackId}) as ${role} via ${source}${fraudDone ? ` - fraud by ${fraudById}` : ''}`,
    { ip, userAgent: ua }
  )

  await prisma.auditLog.create({
    data: {
      userId: newUser.id,
      adminId: user.id,
      action: 'user created',
      details: `added as ${role} via ${source}${fraudDone ? ` - fraud checked by ${fraudById}` : ''}`,
    },
  })

  return NextResponse.json({ user: newUser })
})
