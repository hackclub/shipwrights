import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { PERMS } from '@/lib/perms'
import { push } from '@/lib/push-server'
import { msgs } from '@/lib/notifs'
import { bust } from '@/lib/cache'
import { withParams } from '@/lib/api'

export const POST = withParams(PERMS.support_edit)(async ({ user, req, params }) => {
  const { message, files } = await req.json()

  if (!message?.trim() && (!files || files.length === 0)) {
    return NextResponse.json({ error: 'send something' }, { status: 400 })
  }

  if (message && typeof message !== 'string') {
    return NextResponse.json({ error: 'invalid message' }, { status: 400 })
  }

  if (files && !Array.isArray(files)) {
    return NextResponse.json({ error: 'invalid files' }, { status: 400 })
  }

  const sendToUser = message?.trim().startsWith('?')
  const cleanMessage = sendToUser ? message.trim().slice(1).trim() : message?.trim() || ''

  try {
    const ticketId = parseInt(params.id.replace('sw-', ''))
    if (isNaN(ticketId) || ticketId <= 0) {
      return NextResponse.json({ error: 'invalid ticket id' }, { status: 400 })
    }

    const tickets = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
      'SELECT * FROM tickets WHERE id = ?',
      ticketId
    )

    if (tickets.length === 0) {
      return NextResponse.json({ error: 'cant find that' }, { status: 404 })
    }

    const ticket = tickets[0]

    if (ticket.status === 'closed') {
      return NextResponse.json({ error: 'already closed' }, { status: 400 })
    }

    await prisma.$executeRawUnsafe(
      'INSERT INTO ticket_msgs (ticketId, senderId, senderName, senderAvatar, msg, files, isStaff) VALUES (?, ?, ?, ?, ?, ?, ?)',
      ticket.id,
      user.slackId,
      user.username,
      user.avatar || null,
      message?.trim() || '📎 attachment',
      files ? JSON.stringify(files) : null,
      true
    )

    const botUrl = process.env.BOT_URL || 'http://localhost:45100'
    const botKey = process.env.SW_BOT_KEY || ''
    const botResp = await fetch(`${botUrl}/bridge/send-reply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': botKey },
      body: JSON.stringify({
        ticketId: ticket.id,
        staffName: user.username,
        staffAvatar: user.avatar,
        message: cleanMessage || '📎 attachment',
        originalMessage: message?.trim() || '📎 attachment',
        sendToUser: sendToUser,
        userThreadTs: ticket.userThreadTs,
        staffThreadTs: ticket.staffThreadTs,
        files: files || [],
      }),
    })

    if (!botResp.ok) {
    }

    const assigneeIds = ticket.assignees ? JSON.parse(ticket.assignees as string) : []
    const toNotify = assigneeIds.filter((aid: number) => aid !== user.id)

    if (toNotify.length > 0) {
      try {
        for (const assigneeId of toNotify) {
          const hasSubs = await prisma.pushSub.count({
            where: { userId: assigneeId },
          })

          if (hasSubs > 0) {
            await push(
              assigneeId,
              msgs.ticket.reply(`sw-${ticketId}`, user.username, message || '📎 attachment')
            )
          }
        }
      } catch (e) {
        console.error('push notif broke:', e)
      }
    }

    await bust('cache:tickets*')

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'shit broke' }, { status: 500 })
  }
})
