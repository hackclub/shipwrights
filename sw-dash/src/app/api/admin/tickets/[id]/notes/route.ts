import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { PERMS } from '@/lib/perms'
import { withParams } from '@/lib/api'

export const POST = withParams(PERMS.support_edit)(async ({ user, req, params }) => {
  const id = parseInt(params.id.replace('sw-', ''))

  if (isNaN(id) || id <= 0) {
    return NextResponse.json({ error: 'invalid ticket id' }, { status: 400 })
  }

  const { text } = await req.json()

  if (!text || !text.trim()) {
    return NextResponse.json({ error: 'note cant be empty' }, { status: 400 })
  }

  try {
    const ticket = await prisma.ticket.findUnique({
      where: { id },
      select: { staffThreadTs: true },
    })

    if (!ticket) {
      return NextResponse.json({ error: 'ticket not found' }, { status: 404 })
    }

    const note = await prisma.ticketNote.create({
      data: {
        ticketId: id,
        authorId: user.id,
        text: text.trim(),
      },
      include: {
        author: {
          select: {
            username: true,
            avatar: true,
          },
        },
      },
    })

    const botUrl = process.env.BOT_URL || 'http://localhost:45100'
    const botKey = process.env.SW_BOT_KEY || ''
    try {
      await fetch(`${botUrl}/bridge/staff-note`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-API-Key': botKey },
        body: JSON.stringify({
          staffThreadTs: ticket.staffThreadTs,
          staffName: user.username,
          staffAvatar: user.avatar,
          note: text.trim(),
        }),
      })
    } catch {}

    return NextResponse.json({
      note: {
        id: note.id.toString(),
        text: note.text,
        createdAt: note.createdAt.toISOString(),
        author: {
          username: note.author.username,
          avatar: note.author.avatar,
        },
      },
    })
  } catch {
    return NextResponse.json({ error: 'shit broke' }, { status: 500 })
  }
})
