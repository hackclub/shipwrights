'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { fmtDuration } from '@/lib/fmt'
import { useClickOutside } from '@/hooks/useClickOutside'

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
  hoursApproved: number
  hoursRejected: number
  hoursReduced: number
  hoursToReview: number
  avgHangHrs: number
}

interface Reviewer {
  name: string
  count: number
}

interface DevlogReviewer {
  reviewerId: number
  username: string
  avatar: string | null
  devlogCount: number
}

interface Props {
  initial: {
    reviews: Review[]
    stats: Stats
    leaderboard: Reviewer[]
    reviewers: string[]
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

function Dropdown({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: { val: string; label: string }[]
  onChange: (v: string) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useClickOutside(ref, () => setOpen(false))

  const cur = options.find((o) => o.val === value)

  return (
    <div className="space-y-1">
      <label className="text-amber-400 font-mono text-xs">{label}</label>
      <div ref={ref} className="relative">
        <button
          onClick={() => setOpen((v) => !v)}
          className="w-full flex items-center justify-between bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 font-mono text-xs text-white focus:outline-none focus:border-amber-600 hover:border-zinc-500 transition-colors"
        >
          <span>{cur?.label || value}</span>
          <span className="text-gray-400 ml-2">{open ? '▲' : '▼'}</span>
        </button>
        {open && (
          <div className="absolute z-50 top-full mt-1 w-full bg-zinc-900 border border-zinc-700 rounded-xl overflow-hidden shadow-2xl">
            {options.map((o) => (
              <button
                key={o.val}
                onClick={() => {
                  onChange(o.val)
                  setOpen(false)
                }}
                className={`w-full text-left px-3 py-2 font-mono text-xs transition-colors ${o.val === value ? 'bg-amber-900/50 text-amber-300' : 'text-gray-300 hover:bg-zinc-800'}`}
              >
                {o.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function MultiDropdown({
  label,
  selected,
  options,
  onChange,
}: {
  label: string
  selected: string[]
  options: string[]
  onChange: (v: string[]) => void
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const ref = useRef<HTMLDivElement>(null)
  useClickOutside(ref, () => {
    setOpen(false)
    setQuery('')
  })

  const toggle = (name: string) =>
    onChange(selected.includes(name) ? selected.filter((x) => x !== name) : [...selected, name])

  const filtered = query
    ? options.filter((o) => o.toLowerCase().includes(query.toLowerCase()))
    : options
  const display =
    selected.length === 0
      ? 'All'
      : selected.length === 1
        ? selected[0]
        : `${selected.length} selected`

  return (
    <div className="space-y-1">
      <label className="text-amber-400 font-mono text-xs">{label}</label>
      <div ref={ref} className="relative">
        <button
          onClick={() => setOpen((v) => !v)}
          className="w-full flex items-center justify-between bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 font-mono text-xs text-white focus:outline-none focus:border-amber-600 hover:border-zinc-500 transition-colors"
        >
          <span className={selected.length ? 'text-amber-300' : 'text-gray-400'}>{display}</span>
          <span className="text-gray-400 ml-2">{open ? '▲' : '▼'}</span>
        </button>
        {open && (
          <div className="absolute z-50 top-full mt-1 w-full bg-zinc-900 border border-zinc-700 rounded-xl overflow-hidden shadow-2xl">
            <div className="p-1.5 border-b border-zinc-700">
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="type to filter..."
                className="w-full bg-zinc-800 rounded-lg px-2 py-1.5 font-mono text-xs text-white placeholder-gray-600 focus:outline-none"
              />
            </div>
            <div className="max-h-[160px] overflow-y-auto">
              {filtered.map((name) => (
                <button
                  key={name}
                  onClick={() => toggle(name)}
                  className={`w-full text-left px-3 py-2 font-mono text-xs transition-colors flex items-center gap-2 ${selected.includes(name) ? 'bg-amber-900/50 text-amber-300' : 'text-gray-300 hover:bg-zinc-800'}`}
                >
                  <span
                    className={`w-3 h-3 border rounded flex-shrink-0 flex items-center justify-center text-[8px] ${selected.includes(name) ? 'border-amber-500 bg-amber-900/50 text-amber-300' : 'border-zinc-600'}`}
                  >
                    {selected.includes(name) ? '✓' : ''}
                  </span>
                  {name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export function YswsView({ initial }: Props) {
  const params = useSearchParams()
  const [status, setStatus] = useState('pending')
  const [sortBy, setSortBy] = useState('newest')
  const [search, setSearch] = useState('')
  const [includeReviewers, setIncludeReviewers] = useState<string[]>([])
  const [excludeReviewers, setExcludeReviewers] = useState<string[]>([])
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [reviews, setReviews] = useState(initial.reviews)
  const [stats, setStats] = useState(initial.stats)
  const [leaderboard, setLeaderboard] = useState(initial.leaderboard)
  const [allReviewers, setAllReviewers] = useState<string[]>(initial.reviewers || [])
  const [devlogLeaderboard, setDevlogLeaderboard] = useState<DevlogReviewer[]>([])
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
      if (search) p.set('ftId', search)
      if (includeReviewers.length) p.set('includeReviewers', includeReviewers.join(','))
      if (excludeReviewers.length) p.set('excludeReviewers', excludeReviewers.join(','))
      if (from) p.set('from', from)
      if (to) p.set('to', to)
      const res = await fetch(`/api/admin/ysws_reviews?${p}`)
      if (!res.ok) return
      const data = await res.json()
      setReviews(data.reviews)
      setStats(data.stats)
      setLeaderboard(data.leaderboard || [])
      if (data.reviewers) setAllReviewers(data.reviewers)
    } catch {
    } finally {
      setLoading(false)
    }
  }, [status, sortBy, lbMode, search, includeReviewers, excludeReviewers, from, to])

  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    if (!mounted) {
      setMounted(true)
      return
    }
    load()
  }, [status, sortBy, lbMode, search, includeReviewers, excludeReviewers, from, to, mounted, load])

  const loadDevlogStats = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/ysws_reviews/devlog-stats')
      if (!res.ok) return
      const data = await res.json()
      setDevlogLeaderboard(data.leaderboard || [])
    } catch {}
  }, [])

  useEffect(() => {
    loadDevlogStats()
  }, [])

  const statusOptions = [
    { val: 'pending', label: `Pending (${stats.pending})` },
    { val: 'done', label: `Done (${stats.done})` },
    { val: 'returned', label: `Returned (${stats.returned})` },
    { val: 'all', label: `All (${stats.total})` },
  ]

  const sortOptions = [
    { val: 'newest', label: 'Newest' },
    { val: 'oldest', label: 'Oldest' },
    { val: 'devlogs', label: 'Devlogs ↓' },
    { val: 'devlogs_asc', label: 'Devlogs ↑' },
    { val: 'time', label: 'Time ↓' },
    { val: 'time_asc', label: 'Time ↑' },
  ]

  return (
    <>
      {msg && (
        <div className="fixed top-4 left-4 right-4 md:left-auto md:right-4 md:max-w-sm bg-green-950/90 border-2 border-green-700/60 text-green-400 px-4 py-3 rounded-2xl font-mono text-sm z-50 shadow-xl">
          ✓ {msg}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 md:gap-4 mb-6 md:mb-8">
        <h1 className="text-2xl md:text-4xl font-mono text-amber-400">YSWS Reviews</h1>
        <span className={`px-2 py-1 rounded font-mono text-xs border ${sColor(status)}`}>
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </span>
        {loading && <span className="text-amber-400/50 font-mono text-xs">loading...</span>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-6 md:mb-8">
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
            <div className="flex justify-between">
              <span className="text-gray-400 font-mono text-sm">Hours Approved:</span>
              <span className="text-cyan-400 font-mono font-bold">{stats.hoursApproved}h</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400 font-mono text-sm">Hours Rejected:</span>
              <span className="text-orange-400 font-mono font-bold">{stats.hoursRejected}h</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400 font-mono text-sm">Hours Reduced:</span>
              <span className="text-red-400 font-mono font-bold">{stats.hoursReduced}h</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400 font-mono text-sm">Avg Hang Time:</span>
              <span className="text-purple-400 font-mono font-bold">{stats.avgHangHrs}h</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400 font-mono text-sm">Hours to Review:</span>
              <span className="text-yellow-400 font-mono font-bold">{stats.hoursToReview}h</span>
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
              <div className="text-gray-500 font-mono text-sm">no reviews yet...</div>
            )}
          </div>
        </div>

        <div className="bg-gradient-to-br from-zinc-900/90 to-black/90 border-4 border-amber-900/40 rounded-3xl p-4 md:p-6 shadow-xl min-h-[200px]">
          <h2 className="text-amber-400 font-mono text-base md:text-lg mb-4">Devlog Reviews</h2>
          <div className="space-y-2">
            {devlogLeaderboard.length > 0 ? (
              devlogLeaderboard.slice(0, 10).map((r, i) => (
                <div
                  key={r.reviewerId}
                  className="flex justify-between items-center text-sm font-mono"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500">{i + 1}.</span>
                    <span className="text-white truncate max-w-[120px] md:max-w-none">
                      {r.username}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-amber-400">{r.devlogCount}</span>
                    <span className="text-gray-500 text-xs">devlogs</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-gray-500 font-mono text-sm">no devlog reviews yet...</div>
            )}
          </div>
        </div>
      </div>

      <div className="mb-6 md:mb-8 bg-gradient-to-br from-zinc-900/90 to-black/90 border-4 border-amber-900/40 rounded-3xl p-4 md:p-6 shadow-xl space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Dropdown label="Status" value={status} options={statusOptions} onChange={setStatus} />
          <Dropdown label="Sort by" value={sortBy} options={sortOptions} onChange={setSortBy} />
          <div className="space-y-1">
            <label className="text-amber-400 font-mono text-xs">From</label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              style={{ colorScheme: 'dark' }}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 font-mono text-xs text-white focus:outline-none focus:border-amber-600 hover:border-zinc-500 transition-colors"
            />
          </div>
          <div className="space-y-1">
            <label className="text-amber-400 font-mono text-xs">To</label>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              style={{ colorScheme: 'dark' }}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 font-mono text-xs text-white focus:outline-none focus:border-amber-600 hover:border-zinc-500 transition-colors"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-amber-400 font-mono text-xs">Search</label>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="search by ftId"
            className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 font-mono text-xs text-white placeholder-gray-600 focus:outline-none focus:border-amber-600 hover:border-zinc-500 transition-colors"
          />
        </div>

        {allReviewers.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <MultiDropdown
              label="Include Certified By"
              selected={includeReviewers}
              options={allReviewers}
              onChange={setIncludeReviewers}
            />
            <MultiDropdown
              label="Exclude Certified By"
              selected={excludeReviewers}
              options={allReviewers}
              onChange={setExcludeReviewers}
            />
          </div>
        )}
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
                <span className="text-white">{fmtDuration(r.totalTime)}</span>
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
                  <td className="p-4 text-white font-mono text-sm">{fmtDuration(r.totalTime)}</td>
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
