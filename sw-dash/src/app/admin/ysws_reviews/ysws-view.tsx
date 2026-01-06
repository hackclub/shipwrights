'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

interface Review {
  id: number
  shipCertId: number
  status: string
  project: string | null
  type: string
  submitter: string | null
  certifier: string
  certifiedAt: string
  devlogCount: number
  totalTime: number
  reviewer: string | null
  createdAt: string
}

interface Stats {
  pending: number
  done: number
  returned: number
  total: number
}

interface Reviewer {
  name: string
  count: number
}

interface Props {
  initial: {
    reviews: Review[]
    stats: Stats
    leaderboard: Reviewer[]
  }
}

const sColor = (s: string) => {
  switch (s) {
    case 'done':
      return 'bg-green-900/30 text-green-400 border-green-700'
    case 'returned':
      return 'bg-red-900/30 text-red-400 border-red-700'
    case 'pending':
      return 'bg-yellow-900/30 text-yellow-400 border-yellow-700'
    default:
      return 'bg-gray-900/30 text-gray-400 border-gray-700'
  }
}

const fmtTime = (secs: number) => {
  const hrs = Math.floor(secs / 3600)
  const mins = Math.floor((secs % 3600) / 60)
  return `${hrs}h ${mins}m`
}

export function YswsView({ initial }: Props) {
  const params = useSearchParams()
  const [status, setStatus] = useState('pending')
  const [sortBy, setSortBy] = useState('newest')
  const [reviews, setReviews] = useState(initial.reviews)
  const [stats, setStats] = useState(initial.stats)
  const [leaderboard, setLeaderboard] = useState(initial.leaderboard)
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [lbMode, setLbMode] = useState('weekly')

  useEffect(() => {
    if (params.get('success')) {
      setMsg('review updated')
      setTimeout(() => setMsg(null), 5000)
    }
  }, [params])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const p = new URLSearchParams()
      if (status !== 'all') p.set('status', status)
      p.set('sortBy', sortBy)
      p.set('lbMode', lbMode)
      const res = await fetch(`/api/admin/ysws_reviews?${p}`)
      if (!res.ok) return
      const data = await res.json()
      setReviews(data.reviews)
      setStats(data.stats)
      setLeaderboard(data.leaderboard || [])
    } catch {
    } finally {
      setLoading(false)
    }
  }, [status, sortBy, lbMode])

  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    if (!mounted) {
      setMounted(true)
      return
    }
    load()
  }, [status, sortBy, lbMode, mounted, load])

  const FilterBtn = ({
    val,
    cur,
    set,
    label,
    count,
    color,
  }: {
    val: string
    cur: string
    set: (v: string) => void
    label: string
    count?: number
    color?: string
  }) => (
    <button
      onClick={() => set(val)}
      className={`font-mono text-xs px-3 py-2 rounded-2xl border-2 transition-all ${cur === val ? (color || 'bg-amber-900/30 text-amber-400 border-amber-700/60') + ' shadow-lg' : 'bg-zinc-900/30 text-amber-300/60 border-amber-800/30 hover:bg-zinc-900/50'}`}
    >
      {label}
      {count !== undefined ? ` (${count})` : ''}
    </button>
  )

  return (
    <>
      {msg && (
        <div className="fixed top-4 left-4 right-4 md:left-auto md:right-4 md:max-w-sm bg-green-950/90 border-2 border-green-700/60 text-green-400 px-4 py-3 rounded-2xl font-mono text-sm z-50 shadow-xl">
          ✓ {msg}
        </div>
      )}

      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-6 md:mb-8 min-h-[48px]">
        <div className="flex flex-wrap items-center gap-2 md:gap-4">
          <h1 className="text-2xl md:text-4xl font-mono text-amber-400">YSWS Reviews</h1>
          <span className={`px-2 py-1 rounded font-mono text-xs border ${sColor(status)}`}>
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </span>
          {loading && <span className="text-amber-400/50 font-mono text-xs">loading...</span>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-6 md:mb-8">
        <div className="bg-gradient-to-br from-zinc-900/90 to-black/90 border-4 border-amber-900/40 rounded-3xl p-4 md:p-6 shadow-xl min-h-[200px]">
          <h2 className="text-amber-400 font-mono text-base md:text-lg mb-4">Stats</h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-400 font-mono text-sm">Pending:</span>
              <span className="bg-yellow-900/30 text-yellow-400 px-2 py-1 rounded font-mono text-sm">
                {stats.pending}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400 font-mono text-sm">Done:</span>
              <span className="bg-green-900/30 text-green-400 px-2 py-1 rounded font-mono text-sm">
                {stats.done}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400 font-mono text-sm">Returned:</span>
              <span className="bg-red-900/30 text-red-400 px-2 py-1 rounded font-mono text-sm">
                {stats.returned}
              </span>
            </div>
            <div className="flex justify-between pt-2 border-t border-gray-700">
              <span className="text-gray-400 font-mono text-sm">Total:</span>
              <span className="text-white font-mono font-bold">{stats.total}</span>
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-zinc-900/90 to-black/90 border-4 border-amber-900/40 rounded-3xl p-4 md:p-6 shadow-xl min-h-[200px]">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-amber-400 font-mono text-base md:text-lg">Leaderboard</h2>
            <div className="flex gap-1">
              <button
                onClick={() => setLbMode('weekly')}
                className={`font-mono text-xs px-2 py-1 rounded-xl border transition-all ${lbMode === 'weekly' ? 'bg-cyan-900/50 text-cyan-300 border-cyan-600' : 'bg-zinc-900/50 text-gray-400 border-gray-700 hover:bg-zinc-800'}`}
              >
                Weekly
              </button>
              <button
                onClick={() => setLbMode('alltime')}
                className={`font-mono text-xs px-2 py-1 rounded-xl border transition-all ${lbMode === 'alltime' ? 'bg-purple-900/50 text-purple-300 border-purple-600' : 'bg-zinc-900/50 text-gray-400 border-gray-700 hover:bg-zinc-800'}`}
              >
                All Time
              </button>
            </div>
          </div>
          <div className="space-y-2">
            {leaderboard.length > 0 ? (
              leaderboard.map((r, i) => (
                <div key={r.name} className="flex justify-between items-center text-sm font-mono">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500">{i + 1}.</span>
                    <span className="text-white truncate max-w-[120px] md:max-w-none">
                      {r.name}
                    </span>
                  </div>
                  <span className="text-amber-400">{r.count}</span>
                </div>
              ))
            ) : (
              <div className="text-gray-500 font-mono text-sm min-h-[20px]">no reviews yet...</div>
            )}
          </div>
        </div>
      </div>

      <div className="mb-4 md:mb-6 space-y-3">
        <div>
          <h3 className="text-amber-400 font-mono text-xs mb-2">Status</h3>
          <div className="flex flex-wrap gap-2">
            <FilterBtn
              val="pending"
              cur={status}
              set={setStatus}
              label="Pending"
              count={stats.pending}
              color="bg-yellow-900/30 text-yellow-400 border-yellow-700"
            />
            <FilterBtn
              val="done"
              cur={status}
              set={setStatus}
              label="Done"
              count={stats.done}
              color="bg-green-900/30 text-green-400 border-green-700"
            />
            <FilterBtn
              val="returned"
              cur={status}
              set={setStatus}
              label="Returned"
              count={stats.returned}
              color="bg-red-900/30 text-red-400 border-red-700"
            />
            <FilterBtn val="all" cur={status} set={setStatus} label="All" count={stats.total} />
          </div>
        </div>
        <div>
          <h3 className="text-amber-400 font-mono text-xs mb-2">Sort</h3>
          <div className="flex flex-wrap gap-2">
            <FilterBtn val="oldest" cur={sortBy} set={setSortBy} label="Oldest" />
            <FilterBtn val="newest" cur={sortBy} set={setSortBy} label="Newest" />
          </div>
        </div>
      </div>

      <div className="md:hidden space-y-3">
        {reviews.map((r) => (
          <Link
            key={r.id}
            href={`/admin/ysws_reviews/${r.id}`}
            className="block bg-gradient-to-br from-zinc-900/80 to-black/80 border-2 border-amber-900/30 rounded-2xl p-4 hover:bg-zinc-900/60 transition-all hover:border-amber-700/50 shadow-lg hover:scale-[1.01]"
          >
            <div className="flex justify-between items-start mb-2">
              <div className="flex-1 min-w-0">
                <div className="text-amber-400 font-mono text-sm font-bold truncate">
                  {r.project}
                </div>
                <div className="text-gray-500 font-mono text-xs">
                  #{r.id} • {r.devlogCount} devlogs
                </div>
              </div>
              <span
                className={`px-2 py-1 rounded font-mono text-xs border ml-2 ${sColor(r.status)}`}
              >
                {r.status}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div>
                <span className="text-gray-500">time:</span>{' '}
                <span className="text-white">{fmtTime(r.totalTime)}</span>
              </div>
              <div>
                <span className="text-gray-500">cert by:</span>{' '}
                <span className="text-white">{r.certifier}</span>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="hidden md:block bg-gradient-to-br from-zinc-900/90 to-black/90 border-4 border-amber-900/40 rounded-3xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-amber-900/30">
                <th className="text-left p-4 text-amber-400 font-mono text-sm">ID</th>
                <th className="text-left p-4 text-amber-400 font-mono text-sm">Project</th>
                <th className="text-left p-4 text-amber-400 font-mono text-sm">Status</th>
                <th className="text-left p-4 text-amber-400 font-mono text-sm">Devlogs</th>
                <th className="text-left p-4 text-amber-400 font-mono text-sm">Total Time</th>
                <th className="text-left p-4 text-amber-400 font-mono text-sm">Certified By</th>
                <th className="text-left p-4 text-amber-400 font-mono text-sm">Reviewer</th>
              </tr>
            </thead>
            <tbody>
              {reviews.map((r) => (
                <tr
                  key={r.id}
                  className="border-b border-amber-900/20 hover:bg-amber-950/20 transition-colors"
                >
                  <td className="p-4">
                    <Link
                      href={`/admin/ysws_reviews/${r.id}`}
                      className="text-amber-400 font-mono text-sm hover:text-amber-300 underline"
                    >
                      {r.id}
                    </Link>
                  </td>
                  <td className="p-4">
                    <Link
                      href={`/admin/ysws_reviews/${r.id}`}
                      className="text-amber-400 font-mono text-sm hover:text-amber-300 underline"
                    >
                      {r.project}
                    </Link>
                    <div className="text-gray-500 font-mono text-xs">Type: {r.type}</div>
                  </td>
                  <td className="p-4">
                    <span
                      className={`inline-block px-2 py-1 rounded font-mono text-xs border ${sColor(r.status)}`}
                    >
                      {r.status}
                    </span>
                  </td>
                  <td className="p-4 text-white font-mono text-sm">{r.devlogCount}</td>
                  <td className="p-4 text-white font-mono text-sm">{fmtTime(r.totalTime)}</td>
                  <td className="p-4 text-white font-mono text-sm">{r.certifier}</td>
                  <td className="p-4 text-white font-mono text-sm">{r.reviewer || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
