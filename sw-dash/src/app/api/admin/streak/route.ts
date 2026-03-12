export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { can, PERMS } from '@/lib/perms'
import { getStreakInfo } from '@/lib/streaks'

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url)
    const authHeader = req.headers.get('Authorization')

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return NextResponse.json({ error: 'need a Bearer key' }, { status: 401 })
    }

    const key = authHeader.replace('Bearer ', '')
    const user = await prisma.user.findUnique({
        where: { swApiKey: key },
        select: { id: true, role: true, username: true },
    })

    if (!user || !can(user.role, PERMS.certs_view)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const slackId = searchParams.get('slack_id')
    if (!slackId) {
        return NextResponse.json({ error: 'slack_id is required' }, { status: 400 })
    }

    try {
        const info = await getStreakInfo(slackId)

        if (!info) {
            return NextResponse.json({ error: 'user not found' }, { status: 404 })
        }

        return NextResponse.json(info)
    } catch {
        return NextResponse.json({ error: 'streak API exploded' }, { status: 500 })
    }
}
