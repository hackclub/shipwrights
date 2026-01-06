import { NextResponse } from 'next/server'
import { can, PERMS } from '@/lib/perms'
import { prisma } from '@/lib/db'
import { reportError } from '@/lib/error-tracking'
import { withParams } from '@/lib/api'

interface Comment {
  id: string
  userId: number
  username: string
  avatar: string | null
  role: string
  msg: string
  createdAt: string
}

export const GET = withParams()(async ({ params }) => {
  try {
    const numId = parseInt(params.id, 10)
    if (isNaN(numId)) {
      return NextResponse.json({ error: 'bad id' }, { status: 400 })
    }

    const assignment = await prisma.assignment.findUnique({
      where: { id: numId },
      select: { comments: true },
    })

    if (!assignment) {
      return NextResponse.json({ error: 'not found' }, { status: 404 })
    }

    let comments: Comment[] = []
    if (assignment.comments) {
      try {
        comments = JSON.parse(assignment.comments)
      } catch {
        comments = []
      }
    }

    const notes = comments.map((c) => ({
      id: c.id,
      message: c.msg,
      createdAt: c.createdAt,
      author: {
        id: String(c.userId),
        username: c.username,
        avatar: c.avatar,
        role: c.role,
      },
    }))

    return NextResponse.json({ notes })
  } catch (e) {
    reportError(e instanceof Error ? e : new Error(String(e)), {
      route: 'GET /api/admin/assignments/[id]/notes',
    })
    return NextResponse.json({ error: 'this shit broke bad' }, { status: 500 })
  }
})

export const POST = withParams()(async ({ user, req, params }) => {
  try {
    const { message, notifyAssigned = false } = await req.json()

    if (!message || !message.trim()) {
      return NextResponse.json({ error: 'write something maybe?' }, { status: 400 })
    }

    const numId = parseInt(params.id, 10)
    if (isNaN(numId)) {
      return NextResponse.json({ error: 'bad id' }, { status: 400 })
    }

    const assignment = await prisma.assignment.findUnique({
      where: { id: numId },
      include: {
        assignee: {
          select: {
            id: true,
            username: true,
            slackId: true,
          },
        },
      },
    })

    if (!assignment) {
      return NextResponse.json({ error: 'assignment doesnt exist dipshit' }, { status: 404 })
    }

    let comments: Comment[] = []
    if (assignment.comments) {
      try {
        comments = JSON.parse(assignment.comments)
      } catch {
        comments = []
      }
    }

    const newComment: Comment = {
      id: crypto.randomUUID(),
      userId: user.id,
      username: user.username,
      avatar: user.avatar || null,
      role: user.role,
      msg: message.trim(),
      createdAt: new Date().toISOString(),
    }

    comments.push(newComment)

    await prisma.assignment.update({
      where: { id: numId },
      data: {
        comments: JSON.stringify(comments),
      },
    })

    const mentionRegex = /@(\w+)/g
    const mentions = []
    let match
    while ((match = mentionRegex.exec(message)) !== null) {
      mentions.push(match[1])
    }

    try {
      await prisma.assignSubsc.upsert({
        where: {
          userId_assignmentId: {
            userId: user.id,
            assignmentId: numId,
          },
        },
        update: {
          isSubscribed: true,
        },
        create: {
          userId: user.id,
          assignmentId: numId,
          isSubscribed: true,
        },
      })
    } catch {}

    type LogUser = { id: number; username: string; slackId: string }
    const notify = new Map<number, LogUser>()
    const add = (u?: LogUser | null) => {
      if (u) notify.set(u.id, u)
    }

    const subs = await prisma.assignSubsc.findMany({
      where: {
        assignmentId: numId,
        isSubscribed: true,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            slackId: true,
          },
        },
      },
    })

    subs.forEach((s) => {
      if (s.user.slackId && s.userId !== user.id) add(s.user)
    })

    if (notifyAssigned && assignment.assignee?.slackId) {
      add(assignment.assignee)
    }

    if (mentions.length > 0) {
      const mentionedUsers = []
      for (const mention of mentions) {
        const users = await prisma.user.findMany({
          where: {
            username: { contains: mention },
            isActive: true,
          },
          select: {
            id: true,
            username: true,
            slackId: true,
          },
        })
        mentionedUsers.push(...users)
      }

      for (const mentionedUser of mentionedUsers) {
        try {
          await prisma.assignSubsc.upsert({
            where: {
              userId_assignmentId: {
                userId: mentionedUser.id,
                assignmentId: numId,
              },
            },
            update: {
              isSubscribed: true,
            },
            create: {
              userId: mentionedUser.id,
              assignmentId: numId,
              isSubscribed: true,
            },
          })
        } catch {}

        if (mentionedUser.slackId && mentionedUser.id !== user.id) {
          add(mentionedUser)
        }
      }
    }

    for (const u of notify.values()) {
      try {
        await fetch('https://slack.com/api/chat.postMessage', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${process.env.SLACK_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            channel: u.slackId,
            text: `new note on assignment #${numId}\n\n*${user.username} said:*\n${message.trim()}\n\ncheck it out: ${process.env.NEXT_PUBLIC_URL}/admin/assignments/${numId}/edit`,
          }),
        })
      } catch {}
    }

    return NextResponse.json({
      note: {
        id: newComment.id,
        message: newComment.msg,
        createdAt: newComment.createdAt,
        author: {
          id: String(newComment.userId),
          username: newComment.username,
          avatar: newComment.avatar,
          role: newComment.role,
        },
      },
    })
  } catch (e) {
    reportError(e instanceof Error ? e : new Error(String(e)), {
      route: 'POST /api/admin/assignments/[id]/notes',
    })
    return NextResponse.json({ error: 'this shit broke bad' }, { status: 500 })
  }
})

export const DELETE = withParams()(async ({ user, req, params }) => {
  try {
    const { noteId } = await req.json()

    if (!noteId) {
      return NextResponse.json({ error: 'missing noteId' }, { status: 400 })
    }

    const numId = parseInt(params.id, 10)
    if (isNaN(numId)) {
      return NextResponse.json({ error: 'bad id' }, { status: 400 })
    }

    const assignment = await prisma.assignment.findUnique({
      where: { id: numId },
      select: { comments: true, assigneeId: true },
    })

    if (!assignment) {
      return NextResponse.json({ error: 'not found' }, { status: 404 })
    }

    let comments: Comment[] = []
    if (assignment.comments) {
      try {
        comments = JSON.parse(assignment.comments)
      } catch {
        comments = []
      }
    }

    const note = comments.find((c) => c.id === noteId)
    if (!note) {
      return NextResponse.json({ error: 'note not found' }, { status: 404 })
    }

    const isOwner = note.userId === user.id
    const canOverride = can(user.role, PERMS.assign_override)

    if (!isOwner && !canOverride) {
      return NextResponse.json({ error: 'not ur note dipshit' }, { status: 403 })
    }

    comments = comments.filter((c) => c.id !== noteId)

    await prisma.assignment.update({
      where: { id: numId },
      data: {
        comments: JSON.stringify(comments),
      },
    })

    return NextResponse.json({ success: true })
  } catch (e) {
    reportError(e instanceof Error ? e : new Error(String(e)), {
      route: 'DELETE /api/admin/assignments/[id]/notes',
    })
    return NextResponse.json({ error: 'mom said no' }, { status: 500 })
  }
})
