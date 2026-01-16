import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { PERMS } from '@/lib/perms'
import { push } from '@/lib/push-server'
import { msgs } from '@/lib/notifs'
import { bust } from '@/lib/cache'
import { syslog } from '@/lib/syslog'
import { withParams } from '@/lib/api'

export const POST = withParams(PERMS.support_edit)(async ({ user, params, ip, ua }) => {
  const id = parseInt(params.id.replace('sw-', ''))

  if (isNaN(id) || id <= 0) {
    return NextResponse.json({ error: 'invalid ticket id' }, { status: 400 })
  }

  const tickets: Record<string, unknown>[] = await prisma.$queryRawUnsafe(
    'SELECT * FROM tickets WHERE id = ?',
    id
  )

  if (!tickets || tickets.length === 0) {
    return NextResponse.json({ error: 'ticket not found' }, { status: 404 })
  }

  const ticket = tickets[0]

  await prisma.$executeRawUnsafe(
    "UPDATE tickets SET status = 'closed', closedAt = NOW() WHERE id = ?",
    id
  )

  const assigneeIds = ticket.assignees ? JSON.parse(ticket.assignees as string) : []

  if (assigneeIds.length > 0) {
    try {
      for (const assigneeId of assigneeIds) {
        const hasSubs = await prisma.pushSub.count({
          where: { userId: assigneeId },
        })

        if (hasSubs > 0) {
          await push(assigneeId, msgs.ticket.resolved(`sw-${id}`))
        }
      }
    } catch (e) {
      console.error('push notif broke:', e)
    }
  }

  await syslog(
    'ticket_closed',
    200,
    user,
    `closed ticket sw-${id}`,
    { ip, userAgent: ua },
    {
      targetId: id,
      targetType: 'ticket',
      metadata: {
        ticketId: id,
        userId: ticket.userId,
        userName: ticket.userName,
        assignees: assigneeIds,
      },
    }
  )

  const botUrl = process.env.BOT_URL
  const botKey = process.env.SW_BOT_KEY || ''
  if (!botUrl) {
    return NextResponse.json({ ok: true })
  }

  try {
    await fetch(`${botUrl}/bridge/close-ticket`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': botKey },
      body: JSON.stringify({
        userThreadTs: ticket.userThreadTs,
        staffThreadTs: ticket.staffThreadTs,
        staffName: user.username,
      }),
    })
  } catch {}

  await bust('cache:tickets*')

  return NextResponse.json({ ok: true })
})
