import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { PERMS } from '@/lib/perms'
import { withParams } from '@/lib/api'

export const GET = withParams(PERMS.support_view)(async ({ params }) => {
  const id = parseInt(params.id.replace('sw-', ''))

  if (isNaN(id) || id <= 0) {
    return NextResponse.json({ error: 'invalid ticket id' }, { status: 400 })
  }

  const tickets: Record<string, unknown>[] = await prisma.$queryRawUnsafe(
    `SELECT * FROM tickets WHERE id = ?`,
    id
  )

  if (!tickets || tickets.length === 0) {
    return NextResponse.json({ error: 'nah' }, { status: 404 })
  }

  const ticket = tickets[0]
  const assigneeIds = ticket.assignees ? JSON.parse(ticket.assignees as string) : []
  const assignees =
    assigneeIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: assigneeIds } },
          select: { id: true, username: true, avatar: true },
        })
      : []

  const messages: Record<string, unknown>[] = await prisma.$queryRawUnsafe(
    'SELECT * FROM ticket_msgs WHERE ticketId = ? ORDER BY createdAt ASC',
    id
  )

  messages.forEach((msg) => {
    msg.message = msg.msg
    delete msg.msg

    if (msg.files && typeof msg.files === 'string') {
      try {
        msg.files = JSON.parse(msg.files as string)
      } catch {
        msg.files = null
      }
    }
  })

  const allUsers: Record<string, unknown>[] = await prisma.$queryRawUnsafe(
    'SELECT slackId, username FROM users'
  )

  const userMap: { [key: string]: string } = {}
  for (const u of allUsers) {
    userMap[u.slackId as string] = u.username as string
  }

  userMap[ticket.userId as string] = userMap[ticket.userId as string] || (ticket.userName as string)

  for (const msg of messages) {
    userMap[msg.senderId as string] = userMap[msg.senderId as string] || (msg.senderName as string)
  }

  const staff: Record<string, unknown>[] = await prisma.$queryRawUnsafe(
    "SELECT id, username, avatar FROM users WHERE role != 'observer' AND isActive = true ORDER BY username ASC"
  )

  const notes = await prisma.ticketNote.findMany({
    where: { ticketId: id },
    include: {
      author: {
        select: {
          username: true,
          avatar: true,
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  })

  return NextResponse.json({
    ...ticket,
    assignees,
    messages,
    userMap,
    staff,
    notes: notes.map((n) => ({
      id: n.id.toString(),
      text: n.text,
      createdAt: n.createdAt.toISOString(),
      author: {
        username: n.author.username,
        avatar: n.author.avatar,
      },
    })),
    userChannelId: process.env.USER_CHANNEL_ID,
    staffChannelId: process.env.STAFF_CHANNEL_ID,
  })
})
