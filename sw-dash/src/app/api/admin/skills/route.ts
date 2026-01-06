import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { SKILLS, isValidSkill } from '@/lib/skills'
import { api } from '@/lib/api'

export const GET = api()(async ({ user }) => {
  try {
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { skills: true },
    })

    if (!dbUser) {
      return NextResponse.json({ error: 'user not found' }, { status: 404 })
    }

    const userSkills = (dbUser.skills as string[]) || []

    return NextResponse.json({ skills: userSkills, available: SKILLS })
  } catch {
    return NextResponse.json({ error: 'shit broke' }, { status: 500 })
  }
})

export const POST = api()(async ({ user, req }) => {
  try {
    const { skill, action } = await req.json()

    if (!skill || !action) {
      return NextResponse.json({ error: 'skill and action required dipshit' }, { status: 400 })
    }

    if (!isValidSkill(skill)) {
      return NextResponse.json({ error: 'invalid skill type' }, { status: 400 })
    }

    if (!['add', 'remove'].includes(action)) {
      return NextResponse.json({ error: 'action must be add or remove' }, { status: 400 })
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { skills: true },
    })

    const current = (dbUser?.skills as string[]) || []

    if (action === 'add') {
      if (!current.includes(skill)) {
        await prisma.user.update({
          where: { id: user.id },
          data: { skills: [...current, skill] },
        })
      }
    } else {
      await prisma.user.update({
        where: { id: user.id },
        data: { skills: current.filter((s) => s !== skill) },
      })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'shit broke' }, { status: 500 })
  }
})
