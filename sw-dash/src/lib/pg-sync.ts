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
      const row = [
        r.id,
        r.ftProjectId,
        r.ftSlackId,
        r.ftUsername,
        r.projectName,
        r.projectType,
        r.description,
        r.demoUrl,
        r.repoUrl,
        r.readmeUrl,
        r.devTime,
        r.status,
        r.reviewerId,
        r.reviewFeedback,
        r.proofVideoUrl,
        r.reviewStartedAt,
        r.reviewCompletedAt,
        r.syncedToFt != null ? Boolean(r.syncedToFt) : null,
        r.yswsReturnReason,
        r.yswsReturnedBy,
        r.yswsReturnedAt,
        r.createdAt,
      ]
      const b = i * row.length
      values.push(...row)
      const p = (n: number) => `$${b + n}`
      return `(${row.map((_, n) => p(n + 1)).join(', ')})`
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
      const row = [
        r.id,
        r.shipCertId,
        r.status,
        r.reviewerId,
        r.returnReason,
        r.devlogs == null ? null : JSON.stringify(r.devlogs),
        r.commits == null ? null : JSON.stringify(r.commits),
        r.decisions == null ? null : JSON.stringify(r.decisions),
        r.createdAt,
        r.updatedAt,
      ]
      const b = i * row.length
      values.push(...row)
      const p = (n: number) => `$${b + n}`
      const jsonbCols = new Set([6, 7, 8])
      return `(${row.map((_, n) => (jsonbCols.has(n + 1) ? `${p(n + 1)}::jsonb` : p(n + 1))).join(', ')})`
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
