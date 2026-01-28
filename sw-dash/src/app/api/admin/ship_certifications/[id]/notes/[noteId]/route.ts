import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { can, PERMS } from '@/lib/perms'

interface Note {
  id: string
  userId: number
  username: string
  avatar: string | null
  note: string
  createdAt: string
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; noteId: string }> }
) {
  try {
    const { id, noteId } = await params
    const shipId = parseInt(id)

    if (isNaN(shipId)) {
      return NextResponse.json({ error: 'ship id is fucked' }, { status: 400 })
    }

    const token = req.cookies.get('session_token')?.value
    if (!token) {
      return NextResponse.json({ error: 'not logged in' }, { status: 401 })
    }

    const user = await prisma.user.findFirst({
      where: {
        sessionToken: token,
        sessionExpires: { gte: new Date() },
      },
    })

    if (!user || !user.isActive || !can(user.role, PERMS.certs_admin)) {
      return NextResponse.json({ error: 'no perms' }, { status: 403 })
    }

    const cert = await prisma.shipCert.findUnique({
      where: { id: shipId },
      select: { internalNotes: true },
    })

    if (!cert) {
      return NextResponse.json({ error: 'cert not found' }, { status: 404 })
    }

    let notes: Note[] = []
    if (cert.internalNotes) {
      try {
        notes = JSON.parse(cert.internalNotes)
      } catch {}
    }

    notes = notes.filter((n) => n.id !== noteId)

    await prisma.shipCert.update({
      where: { id: shipId },
      data: { internalNotes: JSON.stringify(notes) },
    })

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'delete broke' }, { status: 500 })
  }
}
