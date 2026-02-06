import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { syslog } from '@/lib/syslog'
import { normalizeRepoUrl } from '@/lib/duplicate-repo'

export async function GET(req: NextRequest) {
  const key = req.headers.get('authorization')?.replace('Bearer ', '')

  if (key !== process.env.CRON_SECRET && process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'nope' }, { status: 401 })
  }

  try {
    const batch = await prisma.shipCert.findMany({
      where: {
        repoUrl: { not: null },
        duplicatesCheckedAt: null,
      },
      orderBy: { createdAt: 'asc' },
      take: 200,
      select: { id: true, repoUrl: true },
    })

    let duplicatesFound = 0

    for (const cert of batch) {
      const repoUrlKey = normalizeRepoUrl(cert.repoUrl)

      if (!repoUrlKey) {
        await prisma.shipCert.update({
          where: { id: cert.id },
          data: { duplicatesCheckedAt: new Date() },
        })
        continue
      }

      const original = await prisma.shipCert.findFirst({
        where: {
          repoUrlKey,
          id: { lt: cert.id },
        },
        orderBy: { createdAt: 'asc' },
        select: { id: true },
      })

      if (original) duplicatesFound++

      await prisma.shipCert.update({
        where: { id: cert.id },
        data: {
          repoUrlKey,
          duplicateOfShipCertId: original?.id ?? null,
          duplicatesCheckedAt: new Date(),
        },
      })
    }

    await syslog('check-duplicates', 200, null, `processed ${batch.length}, found ${duplicatesFound} duplicates`)

    return NextResponse.json({ ok: true, processed: batch.length, duplicatesFound })
  } catch {
    return NextResponse.json({ error: 'duplicate check shit the bed' }, { status: 500 })
  }
}
