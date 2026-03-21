import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { getUser } from '@/lib/server-auth'
import { can, PERMS } from '@/lib/perms'
import { cache, genKey } from '@/lib/cache'
import { getTeamList } from '@/lib/captain'
import { ErrorBanner } from '@/components/admin/error-banner'

const CACHE_TTL = 90

function formatLastReview(iso: string | null) {
  if (!iso) return '—'
  const d = new Date(iso)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - d.getTime()) / (24 * 60 * 60 * 1000))
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default async function CaptainTeamPage() {
  const user = await getUser()
  if (!user) redirect('/')
  if (!can(user.role, PERMS.captain_dashboard)) redirect('/admin')

  const cacheKey = genKey('captain-team-list', {})
  const members = await cache(cacheKey, CACHE_TTL, getTeamList)

  return (
    <main
      className="bg-grid min-h-screen w-full flex flex-col items-center overflow-hidden p-4 md:p-8"
      role="main"
      aria-label="Captain team"
    >
      <ErrorBanner />

      <div className="max-w-4xl w-full">
        <div className="mb-6 md:mb-8 max-w-2xl mx-auto">
          <h3 className="text-amber-500/70 font-mono text-xs uppercase tracking-wider mb-3 px-2">
            Captain → Team
          </h3>
          <Link
            href="/admin/captain"
            className="font-mono text-sm text-amber-400 hover:text-amber-300 mb-4 inline-block"
          >
            ← Back to Overview
          </Link>
        </div>

        <div className="space-y-3">
          {members.length === 0 ? (
            <div className="bg-zinc-900/90 border-2 border-amber-900/40 rounded-2xl p-6">
              <p className="font-mono text-amber-500/60">No reviewers in the last 90 days.</p>
            </div>
          ) : (
            members.map((m) => (
              <Link
                key={m.id}
                href={`/admin/captain/team/${m.id}`}
                className="flex items-center gap-4 bg-zinc-900/90 border-2 border-amber-900/40 rounded-2xl p-4 md:p-5 hover:border-amber-700/50 hover:bg-zinc-800/90 transition-colors shadow-xl"
              >
                {m.avatar ? (
                  <Image
                    src={m.avatar}
                    alt=""
                    width={48}
                    height={48}
                    className="w-12 h-12 rounded-lg flex-shrink-0"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-amber-900/30 flex-shrink-0 flex items-center justify-center font-mono text-amber-500/80 text-lg">
                    {m.username.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-mono font-bold text-amber-200 truncate">{m.username}</p>
                  <p className="font-mono text-sm text-amber-500/80">
                    {m.totalReviews} reviews in last 90 days
                    {m.lastReviewAt && (
                      <span className="text-amber-500/60 ml-1">
                        · last {formatLastReview(m.lastReviewAt)}
                      </span>
                    )}
                  </p>
                </div>
                <span className="font-mono text-amber-400 text-sm">See all activity →</span>
              </Link>
            ))
          )}
        </div>
      </div>
    </main>
  )
}
