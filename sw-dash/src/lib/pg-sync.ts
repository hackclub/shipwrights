import { Pool } from 'pg'
import { prisma } from '@/lib/db'

let pool: Pool | null = null

function getPool(): Pool {
  if (!pool) {
    const url = process.env.POSTGRES_URL
    if (!url) throw new Error('POSTGRES_URL not set')
    pool = new Pool({ connectionString: url })
  }
  return pool
}

const BATCH = 200

async function syncShipCerts(pg: Pool): Promise<number> {
  let offset = 0
  let total = 0

  while (true) {
    const rows = await prisma.shipCert.findMany({
      skip: offset,
      take: BATCH,
      orderBy: { id: 'asc' },
    })
    if (rows.length === 0) break

    const values: unknown[] = []
    const placeholders = rows.map((r, i) => {
      const b = i * 22
      values.push(
        r.id, // 1
        r.ftProjectId, // 2
        r.ftSlackId, // 3
        r.ftUsername, // 4
        r.projectName, // 5
        r.projectType, // 6
        r.description, // 7
        r.demoUrl, // 8
        r.repoUrl, // 9
        r.readmeUrl, // 10
        r.devTime, // 11
        r.status, // 12
        r.reviewerId, // 13
        r.reviewFeedback, // 14
        r.proofVideoUrl, // 15
        r.reviewStartedAt, // 16
        r.reviewCompletedAt, // 17
        r.syncedToFt != null ? Boolean(r.syncedToFt) : null, // 18
        r.yswsReturnReason, // 19
        r.yswsReturnedBy, // 20
        r.yswsReturnedAt, // 21
        r.createdAt // 22
      )
      const p = (n: number) => `$${b + n}`
      return `(
        ${p(1)}, ${p(2)}, ${p(3)}, ${p(4)}, ${p(5)}, ${p(6)},
        ${p(7)}, ${p(8)}, ${p(9)}, ${p(10)}, ${p(11)}, ${p(12)},
        ${p(13)}, ${p(14)}, ${p(15)}, ${p(16)}, ${p(17)}, ${p(18)},
        ${p(19)}, ${p(20)}, ${p(21)}, ${p(22)}
      )`
    })

    await pg.query(
      `INSERT INTO ship_certs (
        id, ft_project_id, ft_slack_id, ft_username, project_name, project_type,
        description, demo_url, repo_url, readme_url, dev_time, status,
        reviewer_id, review_feedback, proof_video_url, review_started_at,
        review_completed_at, synced_to_ft, ysws_return_reason, ysws_returned_by,
        ysws_returned_at, created_at
      ) VALUES ${placeholders.join(', ')}
      ON CONFLICT (id) DO UPDATE SET
        ft_project_id       = EXCLUDED.ft_project_id,
        ft_slack_id         = EXCLUDED.ft_slack_id,
        ft_username         = EXCLUDED.ft_username,
        project_name        = EXCLUDED.project_name,
        project_type        = EXCLUDED.project_type,
        description         = EXCLUDED.description,
        demo_url            = EXCLUDED.demo_url,
        repo_url            = EXCLUDED.repo_url,
        readme_url          = EXCLUDED.readme_url,
        dev_time            = EXCLUDED.dev_time,
        status              = EXCLUDED.status,
        reviewer_id         = EXCLUDED.reviewer_id,
        review_feedback     = EXCLUDED.review_feedback,
        proof_video_url     = EXCLUDED.proof_video_url,
        review_started_at   = EXCLUDED.review_started_at,
        review_completed_at = EXCLUDED.review_completed_at,
        synced_to_ft        = EXCLUDED.synced_to_ft,
        ysws_return_reason  = EXCLUDED.ysws_return_reason,
        ysws_returned_by    = EXCLUDED.ysws_returned_by,
        ysws_returned_at    = EXCLUDED.ysws_returned_at`,
      values
    )

    total += rows.length
    offset += rows.length
    if (rows.length < BATCH) break
  }

  return total
}

async function syncYswsReviews(pg: Pool): Promise<number> {
  let offset = 0
  let total = 0

  while (true) {
    const rows = await prisma.yswsReview.findMany({
      skip: offset,
      take: BATCH,
      orderBy: { id: 'asc' },
    })
    if (rows.length === 0) break

    const values: unknown[] = []
    const placeholders = rows.map((r, i) => {
      const b = i * 10
      values.push(
        r.id,
        r.shipCertId,
        r.status,
        r.reviewerId,
        r.returnReason,
        r.devlogs == null ? null : JSON.stringify(r.devlogs),
        r.commits == null ? null : JSON.stringify(r.commits),
        r.decisions == null ? null : JSON.stringify(r.decisions),
        r.createdAt,
        r.updatedAt
      )
      const p = (n: number) => `$${b + n}`
      return `(${p(1)}, ${p(2)}, ${p(3)}, ${p(4)}, ${p(5)}, ${p(6)}::jsonb, ${p(7)}::jsonb, ${p(8)}::jsonb, ${p(9)}, ${p(10)})`
    })

    await pg.query(
      `INSERT INTO ysws_reviews (
        id, ship_cert_id, status, reviewer_id, return_reason,
        devlogs, commits, decisions, created_at, updated_at
      ) VALUES ${placeholders.join(', ')}
      ON CONFLICT (id) DO UPDATE SET
        ship_cert_id  = EXCLUDED.ship_cert_id,
        status        = EXCLUDED.status,
        reviewer_id   = EXCLUDED.reviewer_id,
        return_reason = EXCLUDED.return_reason,
        devlogs       = EXCLUDED.devlogs,
        commits       = EXCLUDED.commits,
        decisions     = EXCLUDED.decisions,
        updated_at    = EXCLUDED.updated_at`,
      values
    )

    total += rows.length
    offset += rows.length
    if (rows.length < BATCH) break
  }

  return total
}

export interface SyncResult {
  shipCerts: number
  yswsReviews: number
  durationMs: number
}

export async function runPgSync(): Promise<SyncResult> {
  const pg = getPool()
  const start = Date.now()

  const shipCerts = await syncShipCerts(pg)
  const yswsReviews = await syncYswsReviews(pg)

  return { shipCerts, yswsReviews, durationMs: Date.now() - start }
}
