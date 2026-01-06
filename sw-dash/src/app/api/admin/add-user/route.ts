import { NextResponse } from 'next/server'
import { api } from '@/lib/api'
import { PERMS } from '@/lib/perms'
import { prisma } from '@/lib/db'

export const POST = api(PERMS.users_add)(async ({ req }) => {
  const { slackId, username, avatar } = await req.json()

  if (!slackId || !username) {
    return NextResponse.json({ error: 'need slackId and username dipshit' }, { status: 400 })
  }

  const found = await prisma.user.findUnique({
    where: { slackId },
  })

  if (found) {
    return NextResponse.json({ error: 'this mf already exists' }, { status: 409 })
  }

  const newUser = await prisma.user.create({
    data: {
      slackId,
      username,
      avatar: avatar || null,
    },
  })

  return NextResponse.json({
    success: true,
    user: {
      id: newUser.id,
      slackId: newUser.slackId,
      username: newUser.username,
      avatar: newUser.avatar,
      isActive: newUser.isActive,
      createdAt: newUser.createdAt,
    },
  })
})
