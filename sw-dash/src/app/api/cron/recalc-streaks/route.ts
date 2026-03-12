import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(req: NextRequest) {
    const key = req.headers.get('authorization')?.replace('Bearer ', '')

    if (key !== process.env.CRON_SECRET && process.env.NODE_ENV === 'production') {
        return NextResponse.json({ error: 'nope' }, { status: 401 })
    }

    try {
        const getESTDate = (date: Date) => {
            const parts = new Intl.DateTimeFormat('en-US', {
                timeZone: 'America/New_York',
                year: 'numeric',
                month: 'numeric',
                day: 'numeric',
            }).formatToParts(date)
            const get = (type: string) => parseInt(parts.find((p) => p.type === type)?.value || '0')
            return { y: get('year'), m: get('month') - 1, d: get('day') }
        }

        const { y, m, d } = getESTDate(new Date())
        const todayNorm = new Date(Date.UTC(y, m, d))

        const reviewers = await prisma.user.findMany({
            where: {
                shipCerts: {
                    some: {
                        status: { in: ['approved', 'rejected'] },
                        reviewCompletedAt: { not: null },
                    },
                },
            },
            select: { id: true, username: true, streak: true },
        })

        const results: { id: number; username: string; oldStreak: number; newStreak: number }[] = []

        for (const reviewer of reviewers) {

            const rows = await prisma.$queryRaw<{ reviewDate: Date }[]>`
                SELECT DISTINCT DATE(reviewCompletedAt) as reviewDate
                FROM ship_certs
                WHERE reviewerId = ${reviewer.id}
                AND status IN ('approved', 'rejected')
                AND reviewCompletedAt IS NOT NULL
                AND spotRemoved = false
                ORDER BY reviewDate DESC
            `

            if (rows.length === 0) {
                if (reviewer.streak !== 0) {
                    await prisma.user.update({
                        where: { id: reviewer.id },
                        data: { streak: 0, lastReviewDate: null },
                    })
                    results.push({ id: reviewer.id, username: reviewer.username, oldStreak: reviewer.streak, newStreak: 0 })
                }
                continue
            }

            let streak = 0
            let checkDate = new Date(todayNorm)
            let lastReviewDate: Date | null = null

            const reviewDates = new Set(
                rows.map((r) => {
                    const rd = new Date(r.reviewDate)
                    return new Date(Date.UTC(rd.getUTCFullYear(), rd.getUTCMonth(), rd.getUTCDate())).getTime()
                })
            )

            for (let i = 0; i < 365; i++) {
                if (reviewDates.has(checkDate.getTime())) {
                    streak++
                    if (!lastReviewDate) lastReviewDate = new Date(checkDate)
                    checkDate = new Date(checkDate)
                    checkDate.setDate(checkDate.getDate() - 1)
                } else if (i === 0) {

                    checkDate.setDate(checkDate.getDate() - 1)
                    if (reviewDates.has(checkDate.getTime())) {
                        streak++
                        lastReviewDate = new Date(checkDate)
                        checkDate = new Date(checkDate)
                        checkDate.setDate(checkDate.getDate() - 1)
                    } else {
                        break
                    }
                } else {
                    break
                }
            }

            if (streak !== reviewer.streak) {
                await prisma.user.update({
                    where: { id: reviewer.id },
                    data: {
                        streak,
                        lastReviewDate,
                    },
                })
            }

            results.push({
                id: reviewer.id,
                username: reviewer.username,
                oldStreak: reviewer.streak,
                newStreak: streak,
            })
        }

        const changed = results.filter((r) => r.oldStreak !== r.newStreak)

        return NextResponse.json({
            ok: true,
            total: results.length,
            changed: changed.length,
            updates: changed,
        })
    } catch (e: any) {
        return NextResponse.json({ error: 'recalc exploded :sob: ', message: e.message }, { status: 500 })
    }
}
