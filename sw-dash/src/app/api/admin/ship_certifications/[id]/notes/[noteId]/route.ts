import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

interface InternalNote {
  id: string
  userId: number
  username: string
  avatar: string | null
  note: string
  createdAt: string
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; noteId: string }> }
) {
  try {
    const { id, noteId } = await params
    const shipId = parseInt(id)

    if (isNaN(shipId)) {
      return NextResponse.json({ error: 'ship id is fucked' }, { status: 400 })
    }

    const sessionToken = request.cookies.get('session_token')?.value

    if (!sessionToken) {
      return NextResponse.json({ error: 'who tf are you?' }, { status: 401 })
    }

    const user = await prisma.user.findFirst({
      where: {
        sessionToken,
        sessionExpires: { gte: new Date() },
        role: 'megawright',
      },
    })

    if (!user || !user.isActive) {
      return NextResponse.json({ error: 'only megawrights can delete notes' }, { status: 403 })
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

    const initialLength = notes.length
    notes = notes.filter((n) => n.id !== noteId)

    if (notes.length === initialLength) {
    }

    await prisma.shipCert.update({
      where: { id: shipId },
      data: {
        internalNotes: JSON.stringify(notes),
      },
    })

    return NextResponse.json({
      success: true,
    })
  } catch {
    return NextResponse.json({ error: 'shit hit the fan deleting note' }, { status: 500 })
  }
}
