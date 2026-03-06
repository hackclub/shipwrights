import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { fetchProjectCountsByEmail } from '@/lib/airtable'
import { log } from '@/lib/log'

export async function GET(req: NextRequest) {
  const key = req.headers.get('authorization')?.replace('Bearer ', '')

  if (key !== process.env.CRON_SECRET && process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'nope' }, { status: 401 })
  }

  try {
    const counts = await fetchProjectCountsByEmail()

    let upserted = 0
    const entries = Array.from(counts.entries())
    const BATCH = 100

    for (let i = 0; i < entries.length; i += BATCH) {
      const batch = entries.slice(i, i + BATCH)
      await Promise.all(
        batch.map(([email, projectCount]) =>
          prisma.hcSubmitterStats.upsert({
            where: { email },
            create: { email, projectCount },
            update: { projectCount },
          })
        )
      )
      upserted += batch.length
    }

    await log({
      action: 'hc_stats_synced',
      status: 200,
      context: `synced ${upserted} submitter stats from airtable`,
      meta: { totalEmails: counts.size },
    })

    return NextResponse.json({
      ok: true,
      synced: upserted,
      at: new Date().toISOString(),
    })
  } catch (e) {
    await log({
      action: 'hc_stats_sync_failed',
      status: 500,
      context: 'airtable sync crashed',
      error: {
        name: (e as Error).name || 'Error',
        message: (e as Error).message || 'unknown',
        stack: (e as Error).stack,
      },
    })
    return NextResponse.json({ error: 'sync broke' }, { status: 500 })
  }
}
