import { NextResponse } from 'next/server'
import { yswsApiWithParams } from '@/lib/api'
import { prisma } from '@/lib/db'
import { fetchDevlogs } from '@/lib/ft'
import { parseRepo, fetchCommits } from '@/lib/gh'
import { grab, upload } from '@/lib/r2'
import { PERMS } from '@/lib/perms'
import { log } from '@/lib/log'

const ftBase = process.env.NEXT_PUBLIC_FLAVORTOWN_URL || ''

async function pullMedia(ftMedia: any[]) {
  const out = []
  for (const m of ftMedia || []) {
    const url = m.url.startsWith('/') ? ftBase + m.url : m.url
    const file = await grab(url)
    if (!file) {
      console.error(`failed to grab media from ${url}`)
      continue
    }

    const ext = m.content_type.split('/')[1] || 'bin'
    const name = `${Date.now()}.${ext}`
    const r2Url = await upload('ysws-devlog-media', name, file.data, file.type)
    out.push({ url: r2Url, type: m.content_type })
  }
  return out
}

export const POST = yswsApiWithParams(PERMS.ysws_edit)(async ({ params, user }) => {
  const yswsId = parseInt(params.id)
  if (!yswsId) return NextResponse.json({ error: 'invalid id' }, { status: 400 })

  const review = await prisma.yswsReview.findUnique({
    where: { id: yswsId },
    include: { shipCert: { select: { ftProjectId: true, repoUrl: true } } },
  })

  if (!review || !review.shipCert.ftProjectId) {
    return NextResponse.json({ error: 'not found' }, { status: 404 })
  }

  const ftDevlogs = await fetchDevlogs(review.shipCert.ftProjectId)
  const repo = review.shipCert.repoUrl ? parseRepo(review.shipCert.repoUrl) : null

  const sorted = ftDevlogs
    .filter((d) => d.created_at)
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())

  const existingDecisions = (review.decisions as any[]) || []

  const devlogs: any[] = []
  const commits: any[] = []
  const decisions: any[] = []

  if (sorted.length > 0 && repo) {
    const oldest = new Date(sorted[0].created_at)
    let prevTs = new Date(oldest.getTime() - 30 * 24 * 60 * 60 * 1000)

    for (const d of sorted) {
      const until = new Date(d.created_at)
      const ftDevlogId = String(d.id)

      const [fetched, media] = await Promise.all([
        fetchCommits(repo.owner, repo.repo, prevTs, until),
        pullMedia(d.media),
      ])

      devlogs.push({
        ftDevlogId,
        desc: d.body,
        media,
        origSecs: d.duration_seconds || 0,
        ftCreatedAt: d.created_at,
      })

      commits.push({
        ftDevlogId,
        commits: fetched.map((c) => ({
          sha: c.sha,
          msg: c.msg,
          author: c.author,
          adds: c.adds,
          dels: c.dels,
          ts: c.ts.toISOString(),
        })),
      })

      const existing = existingDecisions.find((x: any) => x.ftDevlogId === ftDevlogId)
      decisions.push({
        ftDevlogId,
        status: existing?.status || 'pending',
        approvedMins: existing?.approvedMins ?? null,
        notes: existing?.notes ?? null,
      })

      prevTs = until
    }
  } else {
    for (const d of ftDevlogs) {
      const media = await pullMedia(d.media)
      const ftDevlogId = String(d.id)

      devlogs.push({
        ftDevlogId,
        desc: d.body,
        media,
        origSecs: d.duration_seconds || 0,
        ftCreatedAt: d.created_at || null,
      })

      commits.push({ ftDevlogId, commits: [] })

      const existing = existingDecisions.find((x: any) => x.ftDevlogId === ftDevlogId)
      decisions.push({
        ftDevlogId,
        status: existing?.status || 'pending',
        approvedMins: existing?.approvedMins ?? null,
        notes: existing?.notes ?? null,
      })
    }
  }

  await prisma.yswsReview.update({
    where: { id: yswsId },
    data: {
      devlogs: JSON.parse(JSON.stringify(devlogs)),
      commits: JSON.parse(JSON.stringify(commits)),
      decisions: JSON.parse(JSON.stringify(decisions)),
    },
  })

  await log({
    action: 'ysws_force_reload',
    status: 200,
    user,
    target: { id: yswsId, type: 'ysws_review' },
    context: `force reloaded ${devlogs.length} devlogs for project ${review.shipCert.ftProjectId}`,
    meta: {
      ftProjectId: review.shipCert.ftProjectId,
      ftProjectUrl: `${ftBase}/projects/${review.shipCert.ftProjectId}`,
      repoUrl: review.shipCert.repoUrl,
      devlogs: devlogs.map((d, i) => ({
        ftDevlogId: d.ftDevlogId,
        ftDevlogUrl: `${ftBase}/projects/${review.shipCert.ftProjectId}/devlogs/${d.ftDevlogId}`,
        descPreview: d.desc?.slice(0, 100) || null,
        origSecs: d.origSecs,
        mediaCount: d.media?.length || 0,
        mediaUrls: d.media?.map((m: any) => m.url) || [],
        commitCount: commits[i]?.commits?.length || 0,
        decision: decisions.find((x) => x.ftDevlogId === d.ftDevlogId)?.status || 'pending',
      })),
      totalMedia: devlogs.reduce((s, d) => s + (d.media?.length || 0), 0),
      totalCommits: commits.reduce((s, c) => s + c.commits.length, 0),
      preservedDecisions: decisions.filter((d) => d.status !== 'pending').length,
    },
  })

  return NextResponse.json({ success: true })
})
