'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Cert, Stats, TypeCount, Reviewer } from '@/types'
import { CertSearch } from './cert-search'

interface Props {
  initial: {
    certs: Cert[]
    stats: Stats
    leaderboard: Reviewer[]
    types: TypeCount[]
  }
}

const vColor = (v: string) => {
  switch (v.toLowerCase()) {
    case 'approved':
      return 'bg-green-900/30 text-green-400 border-green-700'
    case 'rejected':
      return 'bg-red-900/30 text-red-400 border-red-700'
    case 'pending':
      return 'bg-yellow-900/30 text-yellow-400 border-yellow-700'
    default:
      return 'bg-gray-900/30 text-gray-400 border-gray-700'
  }
}

const fmtTime = (secs: number) => {
  if (secs <= 0) return 'unlocked'
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

const ago = (date: string) => {
  if (!date || date === '-') return '-'
  const diff = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`
  return `${Math.floor(diff / 604800)}w ago`
}

const fmtDate = (date: string) => {
  if (!date || date === '-') return '-'
  return new Date(date).toLocaleDateString()
}

export function CertsView({ initial }: Props) {
  const params = useSearchParams()
  const [type, setType] = useState('all')
  const [status, setStatus] = useState('pending')
  const [sortBy, setSortBy] = useState('newest')
  const [certs, setCerts] = useState(initial.certs)
  const [stats, setStats] = useState(initial.stats)
  const [leaderboard, setLeaderboard] = useState(initial.leaderboard)
  const [types, setTypes] = useState(initial.types)
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [now, setNow] = useState(Date.now())
  const [lbMode, setLbMode] = useState('weekly')
  const [searchMode, setSearchMode] = useState(false)

  const handleSearch = (results: Cert[] | null) => {
    if (results === null) {
      setSearchMode(false)
      load()
    } else {
      setSearchMode(true)
      setCerts(results)
    }
  }

  useEffect(() => {
    if (params.get('success')) {
      setMsg('cert updated')
      setTimeout(() => setMsg(null), 5000)
    }
  }, [params])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const p = new URLSearchParams()
      if (type !== 'all') p.set('type', type)
      if (status !== 'all') p.set('status', status)
      p.set('sortBy', sortBy)
      p.set('lbMode', lbMode)
      const res = await fetch(`/api/admin/ship_certifications?${p}`)
      if (!res.ok) return
      const data = await res.json()
      setCerts(data.certifications)
      setStats(data.stats)
      setLeaderboard(data.leaderboard || [])
      setTypes(data.typeCounts || [])
    } catch {
    } finally {
      setLoading(false)
    }
  }, [type, status, sortBy, lbMode])

  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    if (!mounted) {
      setMounted(true)
      return
    }
    load()
  }, [type, status, sortBy, lbMode, mounted, load])
  useEffect(() => {
    const iv = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(iv)
  }, [])

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
          <h1 className="text-2xl md:text-4xl font-mono text-amber-400">Ship Certs</h1>
          <span
            className={`px-2 py-1 rounded font-mono text-xs border ${status === 'pending' ? 'bg-yellow-900/30 text-yellow-400 border-yellow-700' : status === 'approved' ? 'bg-green-900/30 text-green-400 border-green-700' : status === 'rejected' ? 'bg-red-900/30 text-red-400 border-red-700' : 'bg-gray-900/30 text-gray-400 border-gray-700'}`}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </span>
          {loading && <span className="text-amber-400/50 font-mono text-xs">loading...</span>}
        </div>
        <div className="flex gap-2">
          <Link
            href="/admin/ship_certifications/mystats"
            className="bg-zinc-900/70 text-amber-300 px-3 py-2 font-mono text-xs hover:bg-zinc-800 transition-all border-2 border-amber-800/40 rounded-2xl shadow-lg hover:scale-[1.02] active:scale-[0.98]"
          >
            My Stats
          </Link>
          <Link
            href="/admin/ship_certifications/logs"
            className="bg-zinc-900/70 text-amber-300 px-3 py-2 font-mono text-xs hover:bg-zinc-800 transition-all border-2 border-amber-800/40 rounded-2xl shadow-lg hover:scale-[1.02] active:scale-[0.98]"
          >
            Logs
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-6 md:mb-8">
        <div className="bg-gradient-to-br from-zinc-900/90 to-black/90 border-4 border-amber-900/40 rounded-3xl p-4 md:p-6 shadow-xl min-h-[280px]">
          <h2 className="text-amber-400 font-mono text-base md:text-lg mb-4">The Stats</h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-400 font-mono text-sm">Total Judged:</span>
              <span className="text-white font-mono font-bold">{stats.totalJudged}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400 font-mono text-sm">Approved:</span>
              <span className="bg-green-900/30 text-green-400 px-2 py-1 rounded font-mono text-sm">
                {stats.approved}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400 font-mono text-sm">Rejected:</span>
              <span className="bg-red-900/30 text-red-400 px-2 py-1 rounded font-mono text-sm">
                {stats.rejected}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400 font-mono text-sm">Pending:</span>
              <span className="bg-yellow-900/30 text-yellow-400 px-2 py-1 rounded font-mono text-sm">
                {stats.pending}
              </span>
            </div>
            <div className="flex justify-between pt-2 border-t border-gray-700">
              <span className="text-gray-400 font-mono text-sm">Approval Rate:</span>
              <span className="text-white font-mono font-bold">{stats.approvalRate}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400 font-mono text-sm">Avg Queue Time:</span>
              <span className="text-white font-mono">{stats.avgQueueTime}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400 font-mono text-sm">decisions today:</span>
              <span className="text-white font-mono">{stats.decisionsToday}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400 font-mono text-sm">new ships today:</span>
              <span className="text-white font-mono">{stats.newShipsToday}</span>
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-zinc-900/90 to-black/90 border-4 border-amber-900/40 rounded-3xl p-4 md:p-6 shadow-xl min-h-[280px]">
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

      <div className="flex flex-col md:flex-row md:justify-between gap-4 mb-4 md:mb-6">
        <div className="space-y-3 flex-1">
          <div>
            <h3 className="text-white font-mono text-xs mb-2">Filter by type</h3>
            <div className="flex flex-wrap gap-2">
              <FilterBtn val="all" cur={type} set={setType} label="All" count={stats.totalJudged} />
              {types.map((t) => (
                <FilterBtn
                  key={t.type}
                  val={t.type}
                  cur={type}
                  set={setType}
                  label={t.type}
                  count={t.count}
                />
              ))}
            </div>
          </div>
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
                val="approved"
                cur={status}
                set={setStatus}
                label="Approved"
                count={stats.approved}
                color="bg-green-900/30 text-green-400 border-green-700"
              />
              <FilterBtn
                val="rejected"
                cur={status}
                set={setStatus}
                label="Rejected"
                count={stats.rejected}
                color="bg-red-900/30 text-red-400 border-red-700"
              />
              <FilterBtn
                val="all"
                cur={status}
                set={setStatus}
                label="All"
                count={stats.totalJudged}
              />
            </div>
          </div>
          <div>
            <h3 className="text-amber-400 font-mono text-xs mb-2">Sort</h3>
            <div className="flex flex-wrap gap-2">
              <FilterBtn val="oldest" cur={sortBy} set={setSortBy} label="Oldest in Queue" />
              <FilterBtn val="newest" cur={sortBy} set={setSortBy} label="Newest in Queue" />
            </div>
          </div>
        </div>
        <CertSearch
          onResults={handleSearch}
          onLoading={setLoading}
          resultCount={searchMode ? certs.length : null}
        />
      </div>

      <div className="md:hidden space-y-3">
        {certs.map((c) => (
          <Link
            key={c.id}
            href={`/admin/ship_certifications/${c.id}/edit`}
            className="block bg-gradient-to-br from-zinc-900/80 to-black/80 border-2 border-amber-900/30 rounded-2xl p-4 hover:bg-zinc-900/60 transition-all hover:border-amber-700/50 shadow-lg hover:scale-[1.01]"
          >
            <div className="flex justify-between items-start mb-2">
              <div className="flex-1 min-w-0">
                <div className="text-amber-400 font-mono text-sm font-bold truncate">
                  {c.project}
                </div>
                <div className="text-gray-500 font-mono text-xs">
                  #{c.id} • FT #{c.ftProjectId}
                </div>
              </div>
              <div className="flex flex-col items-end gap-1 ml-2">
                {c.yswsReturned ? (
                  <span className="bg-purple-900/60 text-purple-300 px-2 py-0.5 rounded font-mono text-xs">
                    RETURNED
                  </span>
                ) : (
                  <span
                    className={`px-2 py-1 rounded font-mono text-xs border ${vColor(c.verdict)}`}
                  >
                    {c.verdict}
                  </span>
                )}
              </div>
            </div>
            {c.yswsReturned && (
              <div className="text-purple-300/80 font-mono text-xs mb-2">
                <div>{c.yswsReturnReason}</div>
                <div className="text-gray-500">by {c.yswsReturnedBy}</div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div>
                <span className="text-gray-500">type:</span>{' '}
                <span className="text-white">{c.type}</span>
              </div>
              <div>
                <span className="text-gray-500">dev:</span>{' '}
                <span className="text-white">{c.devTime}</span>
              </div>
              <div>
                <span className="text-gray-500">by:</span>{' '}
                <span className="text-white truncate">{c.certifier || '-'}</span>
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
                <th className="text-left p-4 text-amber-400 font-mono text-sm">Ship ID</th>
                <th className="text-left p-4 text-amber-400 font-mono text-sm">Project</th>
                <th className="text-left p-4 text-amber-400 font-mono text-sm">Verdict</th>
                <th className="text-left p-4 text-amber-400 font-mono text-sm">Claimed By</th>
                <th className="text-left p-4 text-amber-400 font-mono text-sm">Certifier</th>
                <th className="text-left p-4 text-amber-400 font-mono text-sm">Submitter</th>
                <th className="text-left p-4 text-amber-400 font-mono text-sm">Created At</th>
                <th className="text-left p-4 text-amber-400 font-mono text-sm">Dev Time</th>
              </tr>
            </thead>
            <tbody>
              {certs.map((c) => (
                <tr
                  key={c.id}
                  className="border-b border-amber-900/20 hover:bg-amber-950/20 transition-colors"
                >
                  <td className="p-4">
                    <Link
                      href={`/admin/ship_certifications/${c.id}/edit`}
                      className="text-amber-400 font-mono text-sm hover:text-amber-300 underline"
                    >
                      {c.id}
                    </Link>
                  </td>
                  <td className="p-4">
                    <Link
                      href={`/admin/ship_certifications/${c.id}/edit`}
                      className="text-amber-400 font-mono text-sm hover:text-amber-300 underline"
                    >
                      {c.project}
                    </Link>
                    <div className="text-gray-500 font-mono text-xs">FT #{c.ftProjectId}</div>
                    <div className="text-gray-500 font-mono text-xs">Type: {c.type}</div>
                  </td>
                  <td className="p-4">
                    {c.yswsReturned ? (
                      <div>
                        <span className="bg-purple-900/60 text-purple-300 px-2 py-0.5 rounded font-mono text-xs">
                          RETURNED BY ADMIN
                        </span>
                        <div className="text-purple-300/70 font-mono text-xs mt-1">
                          {c.yswsReturnReason}
                        </div>
                        <div className="text-gray-500 font-mono text-xs">by {c.yswsReturnedBy}</div>
                      </div>
                    ) : (
                      <span
                        className={`inline-block px-2 py-1 rounded font-mono text-xs border ${vColor(c.verdict)}`}
                      >
                        {c.verdict}
                      </span>
                    )}
                  </td>
                  <td className="p-4">
                    {c.claimedBy ? (
                      <div>
                        <div className="text-orange-400 font-mono text-sm flex items-center gap-1">
                          🔒 {c.claimedBy}
                        </div>
                        <div className="text-gray-500 font-mono text-xs">
                          {c.unlocksAt ? fmtTime(Math.floor((c.unlocksAt - now) / 1000)) : '-'}
                        </div>
                      </div>
                    ) : (
                      <span className="text-gray-500 font-mono text-sm">-</span>
                    )}
                  </td>
                  <td className="p-4 text-white font-mono text-sm">{c.certifier}</td>
                  <td className="p-4 text-gray-300 font-mono text-sm">{c.submitter}</td>
                  <td className="p-4">
                    <div className="text-white font-mono text-sm">{fmtDate(c.createdAt)}</div>
                    <div className="text-gray-500 font-mono text-xs">{ago(c.createdAt)}</div>
                  </td>
                  <td className="p-4 text-white font-mono text-sm">{c.devTime}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
