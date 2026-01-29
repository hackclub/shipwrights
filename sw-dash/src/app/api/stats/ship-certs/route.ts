import { NextRequest, NextResponse } from 'next/server'
import { getCerts } from '@/lib/certs'

export async function GET(req: NextRequest) {
    const key = req.headers.get('x-api-key')
    if (key !== process.env.FLAVORTOWN_API_KEY) {
        return NextResponse.json({ error: 'nah who tf are you' }, { status: 401 })
    }

    try {
        const data = await getCerts({})

        return NextResponse.json({
            totalJudged: data.stats.totalJudged,
            approved: data.stats.approved,
            rejected: data.stats.rejected,
            pending: data.stats.pending,
            approvalRate: data.stats.approvalRate,
            avgQueueTime: data.stats.avgQueueTime,
            decisionsToday: data.stats.decisionsToday,
            newShipsToday: data.stats.newShipsToday
        })
    } catch {
        return NextResponse.json({ error: 'shit broke' }, { status: 500 })
    }
}
