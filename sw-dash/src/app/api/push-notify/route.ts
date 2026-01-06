import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { push } from '@/lib/push-server'
import { msgs } from '@/lib/notifs'

export async function POST(req: NextRequest) {
  const key = req.headers.get('x-api-key')
  if (key !== process.env.API_KEY) {
    return NextResponse.json({ error: 'nah' }, { status: 401 })
  }

  const { ticketId, author, message } = await req.json()
  if (!ticketId || !author || !message) {
    return NextResponse.json({ error: 'missing data' }, { status: 400 })
  }

  const tickets = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    'SELECT assigneeId FROM tickets WHERE id = ?',
    ticketId
  )

  if (tickets.length === 0 || !tickets[0].assigneeId) {
    return NextResponse.json({ ok: true })
  }

  const assigneeId = tickets[0].assigneeId as number

  const hasSubs = await prisma.pushSub.count({ where: { userId: assigneeId } })
  if (hasSubs > 0) {
    await push(assigneeId, msgs.ticket.reply(`sw-${ticketId}`, author, message))
  }

  return NextResponse.json({ ok: true })
}
