import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { api } from '@/lib/api'

export const GET = api()(async () => {
  try {
    const users = await prisma.user.findMany({
      where: {
        isActive: true,
        role: {
          not: 'observer',
        },
      },
      select: {
        id: true,
        username: true,
        avatar: true,
        role: true,
      },
      orderBy: { username: 'asc' },
    })

    return NextResponse.json({ users })
  } catch {
    return NextResponse.json({ error: 'shit broke' }, { status: 500 })
  }
})
