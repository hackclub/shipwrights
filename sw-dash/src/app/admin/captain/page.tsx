'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ErrorBanner } from '@/components/admin/error-banner'
import { useUser } from '@/components/providers/user-context'
import { can, PERMS } from '@/lib/perms'

type DashboardData = {
  since: string
  backlogDays: number
  oldCertDays: number
  reviewedSince: {
    total: number
    oldCertsReviewed: number
    byReviewer: { reviewerId: number; username: string; total: number; oldCerts: number }[]
  }
  backlogCount: number
  returnedCount: number
}

function formatSince(sinceIso: string) {
  const since = new Date(sinceIso)
  const now = new Date()
  const diffMs = now.getTime() - since.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)
  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins} min ago`
  if (diffHours < 24) return `${diffHours} hr ago`
  return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`
}

const STORAGE_KEY = 'captain_dashboard_since'

function fetchDashboard(sinceIso: string | null): Promise<DashboardData> {
  const url = sinceIso
    ? `/api/admin/captain/dashboard?since=${encodeURIComponent(sinceIso)}`
    : '/api/admin/captain/dashboard'
  return fetch(url).then((r) => (r.ok ? r.json() : Promise.reject()))
}

export default function CaptainPage() {
  const { user } = useUser()
  const router = useRouter()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const load = (sinceIso: string | null) => {
    setLoading(true)
    setError(false)
    fetchDashboard(sinceIso)
      .then(setData)
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    if (typeof window === 'undefined') return
    const stored = localStorage.getItem(STORAGE_KEY)
    load(stored)
  }, [])

  const startNewPeriod = () => {
    const now = new Date().toISOString()
    localStorage.setItem(STORAGE_KEY, now)
    load(now)
  }

  if (!user) return null
  if (!can(user.role, PERMS.captain_dashboard)) {
    router.replace('/admin')
    return null
  }

  return (
    <main
      className="bg-grid min-h-screen w-full flex flex-col items-center overflow-hidden p-4 md:p-8"
      role="main"
      aria-label="Captain dashboard"
    >
      <ErrorBanner />

      <div className="max-w-4xl w-full">
        <div className="mb-6 md:mb-8 max-w-2xl mx-auto">
          <h3 className="text-amber-500/70 font-mono text-xs uppercase tracking-wider mb-3 px-2">
            Captain
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
            <Link
              href="/admin/captain"
              className="block w-full bg-amber-500/20 border-2 border-amber-600/60 text-amber-300 font-mono text-sm px-4 md:px-6 py-3 rounded-2xl text-center shadow-lg shadow-amber-950/20"
            >
              Overview
            </Link>
            <Link
              href="/admin/tickets"
              className="block w-full bg-amber-500/10 border-2 border-dashed border-amber-500 hover:border-amber-400 text-amber-400 hover:text-amber-300 font-mono text-sm px-4 md:px-6 py-3 rounded-2xl transition-all duration-200 hover:bg-amber-500/20 text-center shadow-lg shadow-amber-950/20 hover:scale-[1.02] active:scale-[0.98]"
            >
              Triage
            </Link>
            <Link
              href="/admin/ship_certifications?backlog=1"
              className="block w-full bg-amber-500/10 border-2 border-dashed border-amber-500 hover:border-amber-400 text-amber-400 hover:text-amber-300 font-mono text-sm px-4 md:px-6 py-3 rounded-2xl transition-all duration-200 hover:bg-amber-500/20 text-center shadow-lg shadow-amber-950/20 hover:scale-[1.02] active:scale-[0.98]"
            >
              Backlog
            </Link>
            <Link
              href="/admin/captain/team"
              className="block w-full bg-amber-500/10 border-2 border-dashed border-amber-500 hover:border-amber-400 text-amber-400 hover:text-amber-300 font-mono text-sm px-4 md:px-6 py-3 rounded-2xl transition-all duration-200 hover:bg-amber-500/20 text-center shadow-lg shadow-amber-950/20 hover:scale-[1.02] active:scale-[0.98]"
            >
              Team
            </Link>
          </div>
        </div>

        <div className="mb-6 md:mb-8 max-w-2xl mx-auto">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <h3 className="text-amber-500/70 font-mono text-xs uppercase tracking-wider px-2">
              Since you started this period
            </h3>
            <button
              type="button"
              onClick={startNewPeriod}
              disabled={loading}
              className="bg-amber-600/50 hover:bg-amber-500/60 text-amber-100 font-mono text-sm px-4 py-2 rounded-xl border border-amber-500/60 transition-colors disabled:opacity-50"
            >
              Start new period
            </button>
          </div>
          {loading && (
            <div className="bg-zinc-900/90 border-2 border-amber-900/40 rounded-2xl p-6 font-mono text-amber-500/70">
              loading…
            </div>
          )}
          {error && (
            <div className="bg-red-900/20 border-2 border-red-900/40 rounded-2xl p-6 font-mono text-red-400">
              Failed to load dashboard
            </div>
          )}
          {data && !loading && !error && (
            <div className="space-y-4">
              <div className="bg-zinc-900/90 border-2 border-amber-900/40 rounded-2xl p-6 shadow-xl">
                <p className="font-mono text-amber-500/70 text-xs uppercase tracking-wider mb-2">
                  {formatSince(data.since)}
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-2xl font-mono font-bold text-amber-400">
                      {data.reviewedSince.total}
                    </div>
                    <div className="font-mono text-sm text-amber-300/80">projects reviewed</div>
                  </div>
                  <div>
                    <div className="text-2xl font-mono font-bold text-amber-400">
                      {data.reviewedSince.oldCertsReviewed}
                    </div>
                    <div className="font-mono text-sm text-amber-300/80">
                      older than {data.oldCertDays} days reviewed
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-zinc-900/90 border-2 border-amber-900/40 rounded-2xl p-6 shadow-xl">
                <div className="flex items-center justify-between mb-4">
                  <span className="font-mono text-amber-500/70 text-xs uppercase tracking-wider">
                    By reviewer
                  </span>
                  <Link
                    href="/admin/captain/team"
                    className="font-mono text-xs text-amber-400 hover:text-amber-300"
                  >
                    Team →
                  </Link>
                </div>
                {data.reviewedSince.byReviewer.length === 0 ? (
                  <p className="font-mono text-amber-500/60 text-sm">No reviews in this period</p>
                ) : (
                  <ul className="space-y-2">
                    {data.reviewedSince.byReviewer.map((r) => (
                      <li key={r.reviewerId}>
                        <Link
                          href={`/admin/captain/team/${r.reviewerId}`}
                          className="flex justify-between items-center font-mono text-sm text-amber-200 hover:text-amber-100 hover:bg-amber-900/20 rounded-lg px-2 py-1.5 -mx-2 transition-colors"
                        >
                          <span>{r.username}</span>
                          <span>
                            <strong>{r.total}</strong> reviewed
                            {r.oldCerts > 0 && (
                              <span className="text-amber-500/80 ml-1">
                                ({r.oldCerts} older than {data.oldCertDays}d)
                              </span>
                            )}
                            <span className="text-amber-500/60 ml-1.5" aria-hidden>→</span>
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="bg-zinc-900/90 border-2 border-amber-900/40 rounded-2xl p-6 shadow-xl">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-amber-500/70 text-xs uppercase tracking-wider">
                    Backlog (older than {data.backlogDays} days)
                  </span>
                  <Link
                    href="/admin/ship_certifications?backlog=1"
                    className="font-mono text-amber-400 hover:text-amber-300 text-sm"
                  >
                    View →
                  </Link>
                </div>
                <div className="text-2xl font-mono font-bold text-amber-400 mt-2">
                  {data.backlogCount}
                </div>
                <p className="font-mono text-xs text-amber-500/60 mt-1">projects still in review</p>
              </div>
              <div className="bg-zinc-900/90 border-2 border-purple-900/40 rounded-2xl p-6 shadow-xl">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-purple-400/90 text-xs uppercase tracking-wider">
                    Returned by admin
                  </span>
                  <Link
                    href="/admin/ship_certifications?returned=1&status=pending"
                    className="font-mono text-purple-400 hover:text-purple-300 text-sm"
                  >
                    View →
                  </Link>
                </div>
                <div className="text-2xl font-mono font-bold text-purple-400 mt-2">
                  {data.returnedCount}
                </div>
                <p className="font-mono text-xs text-amber-500/60 mt-1">
                  need captain triage (excluded from main queue)
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
