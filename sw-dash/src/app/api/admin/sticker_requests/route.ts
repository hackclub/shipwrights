import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUser } from '@/lib/server-auth'
import { can, PERMS } from '@/lib/perms'

export async function GET() {
  const user = await getUser()
  if (!user || !can(user.role, PERMS.certs_edit)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const requests = await prisma.stickerRequest.findMany({
    orderBy: { createdAt: 'desc' },
    include: { requester: { select: { id: true, username: true, avatar: true } } },
  })

  return NextResponse.json({ requests, count: requests.length })
}

export async function POST(req: NextRequest) {
  const user = await getUser()
  if (!user || !can(user.role, PERMS.certs_edit)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const count = await prisma.stickerRequest.count()
  if (count >= 100) {
    return NextResponse.json({ error: 'we hit 100, no more spots left!' }, { status: 400 })
  }

  const { ftProjectId } = await req.json()
  if (!ftProjectId || typeof ftProjectId !== 'string' || !ftProjectId.trim()) {
    return NextResponse.json({ error: 'ft project id? :3' }, { status: 400 })
  }

  const ftId = ftProjectId.trim()
  const dupe = await prisma.stickerRequest.findFirst({ where: { ftProjectId: ftId } })
  if (dupe) {
    return NextResponse.json({ error: 'already on the list!' }, { status: 400 })
  }

  const entry = await prisma.stickerRequest.create({
    data: {
      ftProjectId: ftId,
      requestedBy: user.id,
    },
    include: { requester: { select: { id: true, username: true, avatar: true } } },
  })

  return NextResponse.json(entry, { status: 201 })
}
