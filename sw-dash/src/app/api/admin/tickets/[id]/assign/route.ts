import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { PERMS } from '@/lib/perms'
import { push } from '@/lib/push-server'
import { msgs } from '@/lib/notifs'
import { withParams } from '@/lib/api'

export const POST = withParams(PERMS.support_edit)(async ({ req, params }) => {
  const id = parseInt(params.id.replace('sw-', ''))

  if (isNaN(id) || id <= 0) {
    return NextResponse.json({ error: 'bad ticket id' }, { status: 400 })
  }

  try {
    const body = await req.json()
    const { assignees } = body

    if (!Array.isArray(assignees)) {
      return NextResponse.json({ error: 'assignees gotta be an array' }, { status: 400 })
    }

    for (const assigneeId of assignees) {
      if (typeof assigneeId !== 'number' || isNaN(assigneeId)) {
        return NextResponse.json({ error: 'bad assignee id in array' }, { status: 400 })
      }

      const assignee = await prisma.user.findUnique({
        where: { id: assigneeId },
        select: { role: true },
      })

      if (!assignee) {
        return NextResponse.json({ error: 'that user doesnt exist' }, { status: 404 })
      }

      if (assignee.role === 'observer') {
        return NextResponse.json({ error: 'cant assign to observers' }, { status: 400 })
      }
    }

    const oldTicket = await prisma.ticket.findUnique({
      where: { id },
      select: { assignees: true, staffThreadTs: true },
    })

    const oldIds = oldTicket?.assignees ? JSON.parse(oldTicket.assignees) : []
    const newIds = assignees

    await prisma.$executeRawUnsafe(
      'UPDATE tickets SET assignees = ? WHERE id = ?',
      JSON.stringify(newIds),
      id
    )

    const ticketIdStr = `sw-${id}`

    const added = newIds.filter((nid: number) => !oldIds.includes(nid))
    const removed = oldIds.filter((oid: number) => !newIds.includes(oid))

    for (const assigneeId of added) {
      const hasSubs = await prisma.pushSub.count({
        where: { userId: assigneeId },
      })

      if (hasSubs > 0) {
        try {
          await push(assigneeId, msgs.ticket.assigned(ticketIdStr))
        } catch (e) {
          console.error('push broke:', e)
        }
      }
    }

    for (const assigneeId of removed) {
      const hasSubs = await prisma.pushSub.count({
        where: { userId: assigneeId },
      })

      if (hasSubs > 0) {
        try {
          await push(assigneeId, msgs.ticket.unassigned(ticketIdStr))
        } catch (e) {
          console.error('push broke:', e)
        }
      }
    }

    if ((added.length > 0 || removed.length > 0) && oldTicket?.staffThreadTs) {
      const [addedUsers, removedUsers] = await Promise.all([
        added.length > 0
          ? prisma.user.findMany({ where: { id: { in: added } }, select: { slackId: true } })
          : Promise.resolve([]),
        removed.length > 0
          ? prisma.user.findMany({ where: { id: { in: removed } }, select: { slackId: true } })
          : Promise.resolve([]),
      ])

      const botUrl = process.env.NEXT_PUBLIC_BOT_URL || 'http://localhost:45100'
      fetch(`${botUrl}/ticket/assigned`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticketId: id,
          staffThreadTs: oldTicket.staffThreadTs,
          assignees: addedUsers.map((u) => u.slackId),
          removed: removedUsers.map((u) => u.slackId),
        }),
      }).catch((e) => console.error('bot notify broke:', e))
    }

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'shit broke' }, { status: 500 })
  }
})
