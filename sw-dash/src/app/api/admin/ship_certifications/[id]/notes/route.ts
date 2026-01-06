import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { syslog } from '@/lib/syslog'
import { PERMS } from '@/lib/perms'
import { push } from '@/lib/push-server'
import { msgs } from '@/lib/notifs'
import { withParams } from '@/lib/api'

interface InternalNote {
  id: string
  userId: number
  username: string
  avatar: string | null
  note: string
  createdAt: string
}

export const POST = withParams(PERMS.certs_edit)(async ({ user, req, params, ip, ua }) => {
  try {
    const shipId = parseInt(params.id)
    const { note } = await req.json()

    if (isNaN(shipId)) {
      return NextResponse.json({ error: 'ship id is fucked' }, { status: 400 })
    }

    if (!note || !note.trim()) {
      return NextResponse.json({ error: 'note cant be empty dipshit' }, { status: 400 })
    }

    const shipCert = await prisma.shipCert.findUnique({
      where: { id: shipId },
      select: { internalNotes: true },
    })

    if (!shipCert) {
      return NextResponse.json({ error: 'ship cert not found' }, { status: 404 })
    }

    let notes: InternalNote[] = []
    if (shipCert.internalNotes) {
      try {
        notes = JSON.parse(shipCert.internalNotes)
      } catch {
        notes = []
      }
    }

    const newNote: InternalNote = {
      id: crypto.randomUUID(),
      userId: user.id,
      username: user.username,
      avatar: user.avatar || null,
      note: note.trim(),
      createdAt: new Date().toISOString(),
    }

    notes.push(newNote)

    await prisma.shipCert.update({
      where: { id: shipId },
      data: {
        internalNotes: JSON.stringify(notes),
      },
    })

    await syslog('certs_note_added', 200, user, `ship #${shipId} - note: ${note.trim()}`, {
      ip,
      userAgent: ua,
    })

    const mentionRegex = /@(\w+)/g
    const mentions: string[] = []
    let match
    while ((match = mentionRegex.exec(note)) !== null) {
      const username = match[1]
      if (!mentions.includes(username) && username !== user.username) {
        mentions.push(username)
      }
    }

    if (mentions.length > 0) {
      const mentionedUsers = await prisma.user.findMany({
        where: {
          username: {
            in: mentions,
          },
        },
        select: {
          id: true,
          username: true,
        },
      })

      for (const mentionedUser of mentionedUsers) {
        try {
          const hasSubs = await prisma.pushSub.findFirst({
            where: { userId: mentionedUser.id },
          })

          if (hasSubs) {
            await push(mentionedUser.id, msgs.shipCert.mentioned(shipId, user.username))
          }
        } catch {}
      }
    }

    return NextResponse.json({
      success: true,
      note: newNote,
    })
  } catch {
    return NextResponse.json({ error: 'shit hit the fan saving note' }, { status: 500 })
  }
})
