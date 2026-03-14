import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { getUser } from '@/lib/server-auth'
import { can, PERMS } from '@/lib/perms'
import { cache, genKey } from '@/lib/cache'
import { getMemberActivity } from '@/lib/captain'
import { ErrorBanner } from '@/components/admin/error-banner'
import { ReviewActivityGrid } from './activity-grid'

const CACHE_TTL = 90

interface Props {
  params: Promise<{ userId: string }>
}

export default async function CaptainTeamMemberPage({ params }: Props) {
  const user = await getUser()
  if (!user) redirect('/')
  if (!can(user.role, PERMS.captain_dashboard)) redirect('/admin')

  const { userId: userIdParam } = await params
  const userId = parseInt(userIdParam, 10)
  if (isNaN(userId) || userId <= 0) notFound()

  const cacheKey = genKey('captain-team-member', { userId: String(userId) })
  const data = await cache(cacheKey, CACHE_TTL, () => getMemberActivity(userId))

  if (!data) notFound()

  const { summary, reviewsByDay, projectTypes } = data
  const diff = summary.reviewsThisWeek - summary.reviewsLastWeek
  const comparison =
    diff > 0
      ? `↑ ${diff} from last week`
      : diff < 0
        ? `↓ ${Math.abs(diff)} from last week`
        : 'same as last week'
  const maxProjectTypeCount = projectTypes[0]?.total ?? 1

  return (
    <main
      className="bg-grid min-h-screen w-full flex flex-col items-center overflow-hidden p-4 md:p-8"
      role="main"
      aria-label="Team member activity"
    >
      <ErrorBanner />

      <div className="max-w-4xl w-full">
        {/* Same nav pattern as captain dashboard: section label + links */}
        <div className="mb-6 md:mb-8 max-w-2xl mx-auto">
          <h3 className="text-amber-500/70 font-mono text-xs uppercase tracking-wider mb-3 px-2">
            Captain → Team
          </h3>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/admin/captain"
              className="font-mono text-sm text-amber-400 hover:text-amber-300"
            >
              ← Overview
            </Link>
            <span className="text-amber-500/40">·</span>
            <Link
              href="/admin/captain/team"
              className="font-mono text-sm text-amber-400 hover:text-amber-300"
            >
              Team
            </Link>
          </div>
        </div>

        <div className="max-w-2xl mx-auto space-y-4">
          {/* Card 1: Who + primary KPI (same pattern as dashboard "projects reviewed" card) */}
          <div className="bg-zinc-900/90 border-2 border-amber-900/40 rounded-2xl p-6 shadow-xl">
            <div className="flex flex-wrap items-center gap-4 mb-4">
              {data.user.avatar && (
                <Image
                  src={data.user.avatar}
                  alt=""
                  width={56}
                  height={56}
                  className="w-14 h-14 rounded-xl flex-shrink-0"
                />
              )}
              <div className="min-w-0">
                <h1 className="text-xl font-mono font-bold text-amber-200 truncate">
                  {data.user.username ?? `User #${data.user.id}`}
                </h1>
                <p className="text-amber-500/60 font-mono text-xs uppercase tracking-wider">
                  {data.user.role}
                </p>
              </div>
            </div>
            <p className="font-mono text-amber-500/70 text-xs uppercase tracking-wider mb-2">
              Reviews this week
            </p>
            <div className="flex flex-wrap items-baseline gap-3">
              <span className="text-3xl font-mono font-bold text-amber-400 tabular-nums">
                {summary.reviewsThisWeek}
              </span>
              <span className="font-mono text-sm text-amber-500/80">{comparison}</span>
            </div>
          </div>

          {/* Card 2: GitHub-style activity grid (last 12 weeks) */}
          <div className="bg-zinc-900/90 border-2 border-amber-900/40 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <span className="font-mono text-amber-500/70 text-xs uppercase tracking-wider">
                Review activity
              </span>
              <span className="font-mono text-xs text-amber-500/50">last 12 weeks</span>
            </div>
            <ReviewActivityGrid data={reviewsByDay} />
          </div>

          {/* Card 3: Project types reviewed in the last 12 weeks */}
          <div className="bg-zinc-900/90 border-2 border-amber-900/40 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <span className="font-mono text-amber-500/70 text-xs uppercase tracking-wider">
                Project types
              </span>
              <span className="font-mono text-xs text-amber-500/50">last 12 weeks</span>
            </div>
            {projectTypes.length === 0 ? (
              <p className="font-mono text-amber-500/50 text-sm">No reviews in this period</p>
            ) : (
              <ul className="space-y-2">
                {projectTypes.map(({ projectType, total }) => (
                  <li key={projectType} className="flex items-center gap-3">
                    <span className="font-mono text-xs text-amber-300/80 w-28 shrink-0 truncate capitalize">
                      {projectType}
                    </span>
                    <div className="flex-1 bg-zinc-700/40 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-amber-500 h-full rounded-full"
                        style={{ width: `${(total / maxProjectTypeCount) * 100}%` }}
                      />
                    </div>
                    <span className="font-mono text-xs text-amber-500/70 tabular-nums w-6 text-right">
                      {total}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
