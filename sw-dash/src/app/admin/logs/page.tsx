'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'

interface Log {
  id: string
  timestamp: string
  user: {
    username: string
    avatar: string | null
  } | null
  action: string
  model: string | null
  recordId: number | null
  changes: string[]
  status: number
  severity: string | null
}

interface Filter {
  q: string
  model: string
  recordId: string
  action: string
  username: string
  from: string
  to: string
  severity: string
}

const ACTIONS = [
  'auth_login_success',
  'auth_login_failed',
  'auth_login_denied',
  'auth_logout_success',
  'ft_webhook_received',
  'ft_webhook_failed',
  'ft_webhook_blocked',
  'ft_webhook_sent',
  'ship_cert_approved',
  'ship_cert_rejected',
  'ship_cert_uncerted',
  'ship_cert_type_overridden',
  'ship_cert_type_checked',
  'ship_cert_type_check_failed',
  'ship_cert_claimed',
  'ship_cert_note_added',
  'ysws_review_approved',
  'ysws_review_returned',
  'users_added',
  'users_yoinked',
  'users_unyoinked',
  'users_enabled',
  'users_disabled',
  'users_role_changed',
  'users_deleted',
  'users_notes_updated',
  'users_skills_updated',
  'internal_yoink_success',
  'internal_yoink_denied',
  'internal_yoink_notfound',
  'ticket_closed',
  'assignment_status_updated',
  'fraud_report_sent',
  'fraud_report_failed',
  'push_sent',
  'push_expired',
  'push_blast',
  'gh_fetch_failed',
  'ft_project_fetch_failed',
  'ft_devlog_fetch_failed',
]

const MODELS = ['ship_cert', 'user', 'ysws_review', 'ticket', 'assignment']

export default function Logs() {
  const router = useRouter()
  const [logs, setLogs] = useState<Log[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)

  const [filters, setFilters] = useState<Filter>({
    q: '',
    model: '',
    recordId: '',
    action: '',
    username: '',
    from: '',
    to: '',
    severity: '',
  })

  useEffect(() => {
    load()
  }, [])

  const load = async () => {
    try {
      const params = new URLSearchParams()
      Object.entries(filters).forEach(([k, v]) => {
        if (v) params.set(k, v)
      })
      params.set('page', String(page))

      const res = await fetch(`/api/admin/logs?${params}`)
      if (!res.ok) {
        if (res.status === 403) {
          router.push('/')
          return
        }
        throw new Error('fetch failed')
      }
      const data = await res.json()
      setLogs(data.logs)
      setTotal(data.total)
      setPages(data.pages)
    } catch {
    } finally {
      setLoading(false)
    }
  }

  const badge = (action: string) => {
    const a = action.toLowerCase()
    if (a.includes('update')) return 'bg-blue-900/30 text-blue-400 border-blue-700/50'
    if (a.includes('create') || a.includes('add'))
      return 'bg-green-900/30 text-green-400 border-green-700/50'
    if (a.includes('delete') || a.includes('yoink'))
      return 'bg-red-900/30 text-red-400 border-red-700/50'
    if (a.includes('error') || a.includes('fail'))
      return 'bg-red-900/30 text-red-400 border-red-700/50'
    if (a.includes('approved') || a.includes('success'))
      return 'bg-green-900/30 text-green-400 border-green-700/50'
    if (a.includes('denied') || a.includes('blocked') || a.includes('reject'))
      return 'bg-red-900/30 text-red-400 border-red-700/50'
    return 'bg-amber-900/30 text-amber-400 border-amber-700/50'
  }

  const modelBadge = (model: string) => {
    return 'bg-pink-900/30 text-pink-400 border-pink-700/50'
  }

  if (loading) {
    return (
      <main className="bg-grid min-h-screen w-full flex items-center justify-center">
        <div className="text-amber-400 font-mono">loading...</div>
      </main>
    )
  }

  const limit = 50
  const start = (page - 1) * limit + 1
  const end = Math.min(page * limit, total)

  return (
    <main className="bg-grid min-h-screen w-full p-4 md:p-8">
      <div className="w-full">
        <Link
          href="/admin"
          className="text-amber-300/70 hover:text-amber-200 font-mono text-sm mb-6 inline-block"
        >
          ← back
        </Link>
        <div className="bg-gradient-to-br from-zinc-900/90 to-black/90 border-4 border-amber-900/40 rounded-2xl p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-amber-400/80 text-xs font-mono mb-1 ml-1">search</label>
              <input
                type="text"
                placeholder="search action/context..."
                value={filters.q}
                onChange={(e) => setFilters({ ...filters, q: e.target.value })}
                className="w-full bg-zinc-950/50 border-2 border-amber-900/30 text-amber-200 font-mono text-sm px-4 py-2 rounded-xl focus:outline-none focus:border-amber-700"
              />
            </div>
            <div>
              <label className="block text-amber-400/80 text-xs font-mono mb-1 ml-1">model</label>
              <select
                value={filters.model}
                onChange={(e) => setFilters({ ...filters, model: e.target.value })}
                className="w-full bg-zinc-950/50 border-2 border-amber-900/30 text-amber-200 font-mono text-sm px-4 py-2 rounded-xl focus:outline-none focus:border-amber-700"
              >
                <option value="">all models</option>
                {MODELS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-amber-400/80 text-xs font-mono mb-1 ml-1">
                record id
              </label>
              <input
                type="text"
                placeholder="record id (ex: 1234)"
                value={filters.recordId}
                onChange={(e) => setFilters({ ...filters, recordId: e.target.value })}
                className="w-full bg-zinc-950/50 border-2 border-amber-900/30 text-amber-200 font-mono text-sm px-4 py-2 rounded-xl focus:outline-none focus:border-amber-700"
              />
            </div>
            <div>
              <label className="block text-amber-400/80 text-xs font-mono mb-1 ml-1">action</label>
              <select
                value={filters.action}
                onChange={(e) => setFilters({ ...filters, action: e.target.value })}
                className="w-full bg-zinc-950/50 border-2 border-amber-900/30 text-amber-200 font-mono text-sm px-4 py-2 rounded-xl focus:outline-none focus:border-amber-700"
              >
                <option value="">all actions</option>
                {ACTIONS.sort().map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-amber-400/80 text-xs font-mono mb-1 ml-1">
                username
              </label>
              <input
                type="text"
                placeholder="username (ex: zach)"
                value={filters.username}
                onChange={(e) => setFilters({ ...filters, username: e.target.value })}
                className="w-full bg-zinc-950/50 border-2 border-amber-900/30 text-amber-200 font-mono text-sm px-4 py-2 rounded-xl focus:outline-none focus:border-amber-700"
              />
            </div>
            <div>
              <label className="block text-amber-400/80 text-xs font-mono mb-1 ml-1">
                from date
              </label>
              <input
                type="date"
                placeholder="from date"
                value={filters.from}
                onChange={(e) => setFilters({ ...filters, from: e.target.value })}
                className="w-full bg-zinc-950/50 border-2 border-amber-900/30 text-amber-200 font-mono text-sm px-4 py-2 rounded-xl focus:outline-none focus:border-amber-700"
              />
            </div>
            <div>
              <label className="block text-amber-400/80 text-xs font-mono mb-1 ml-1">to date</label>
              <input
                type="date"
                placeholder="to date"
                value={filters.to}
                onChange={(e) => setFilters({ ...filters, to: e.target.value })}
                className="w-full bg-zinc-950/50 border-2 border-amber-900/30 text-amber-200 font-mono text-sm px-4 py-2 rounded-xl focus:outline-none focus:border-amber-700"
              />
            </div>
            <div>
              <label className="block text-amber-400/80 text-xs font-mono mb-1 ml-1">
                severity (deprecated)
              </label>
              <select
                value={filters.severity}
                onChange={(e) => setFilters({ ...filters, severity: e.target.value })}
                className="w-full bg-zinc-950/50 border-2 border-amber-900/30 text-amber-200 font-mono text-sm px-4 py-2 rounded-xl focus:outline-none focus:border-amber-700"
              >
                <option value="">all severity</option>
                <option value="debug">debug</option>
                <option value="info">info</option>
                <option value="warn">warn</option>
                <option value="error">error</option>
                <option value="critical">critical</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => {
                setPage(1)
                load()
              }}
              className="bg-amber-700 hover:bg-amber-600 text-white font-mono text-sm px-6 py-2 rounded-xl transition-colors"
            >
              apply
            </button>
            <button
              onClick={() => {
                setFilters({
                  q: '',
                  model: '',
                  recordId: '',
                  action: '',
                  username: '',
                  from: '',
                  to: '',
                  severity: '',
                })
                setPage(1)
                load()
              }}
              className="bg-zinc-700 hover:bg-zinc-600 text-white font-mono text-sm px-6 py-2 rounded-xl transition-colors"
            >
              clear
            </button>
          </div>
        </div>

        <div className="bg-gradient-to-br from-zinc-900/90 to-black/90 border-4 border-amber-900/40 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b-2 border-amber-900/40">
                <tr className="bg-zinc-900/50">
                  <th className="text-left p-3 text-amber-400 font-mono text-sm">timestamp</th>
                  <th className="text-left p-3 text-amber-400 font-mono text-sm">user</th>
                  <th className="text-left p-3 text-amber-400 font-mono text-sm">action</th>
                  <th className="text-left p-3 text-amber-400 font-mono text-sm">model</th>
                  <th className="text-left p-3 text-amber-400 font-mono text-sm">record</th>
                  <th className="text-left p-3 text-amber-400 font-mono text-sm">changed</th>
                  <th className="text-right p-3 text-amber-400 font-mono text-sm"></th>
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center p-8 text-amber-300/40 font-mono text-sm">
                      no logs found
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="border-b border-amber-900/20 hover:bg-amber-900/10">
                      <td className="p-3 text-amber-300/60 font-mono text-xs">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          {log.user?.avatar && (
                            <Image
                              src={log.user.avatar}
                              alt=""
                              width={24}
                              height={24}
                              className="rounded-full"
                            />
                          )}
                          <span className="text-amber-200 font-mono text-xs">
                            {log.user?.username || '-'}
                          </span>
                        </div>
                      </td>
                      <td className="p-3">
                        <span
                          className={`font-mono text-xs px-2 py-1 rounded-lg border ${badge(log.action)}`}
                        >
                          {log.action}
                        </span>
                      </td>
                      <td className="p-3">
                        {log.model ? (
                          <span
                            className={`font-mono text-xs px-2 py-1 rounded-lg border ${modelBadge(log.model)}`}
                          >
                            {log.model}
                          </span>
                        ) : (
                          <span className="text-amber-300/40">-</span>
                        )}
                      </td>
                      <td className="p-3 text-cyan-400 font-mono text-xs">
                        {log.recordId ? `#${log.recordId}` : '-'}
                      </td>
                      <td className="p-3 text-amber-300/60 font-mono text-xs">
                        {log.changes.length > 0 ? (
                          <>
                            {log.changes.slice(0, 3).join(', ')}
                            {log.changes.length > 3 && ` (+${log.changes.length - 3})`}
                          </>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="p-3 text-right">
                        <Link
                          href={`/admin/logs/${log.id}`}
                          className="bg-amber-700 hover:bg-amber-600 text-white font-mono text-xs px-4 py-2 rounded-lg transition-colors inline-block"
                        >
                          details
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {total > 0 && (
            <div className="p-4 border-t-2 border-amber-900/40">
              {pages > 1 && (
                <div className="flex items-center justify-center gap-3 mb-2">
                  <span
                    onClick={() => page > 1 && (setPage(page - 1), load())}
                    className={
                      page === 1 ? 'opacity-30 cursor-default' : 'cursor-pointer hover:opacity-80'
                    }
                  >
                    &lt;
                  </span>
                  {Array.from({ length: Math.min(pages, 10) }, (_, i) => i + 1).map((p) => {
                    if (pages > 10 && p > 5 && p < pages)
                      return p === 6 ? <span key={p}>…</span> : null
                    return (
                      <span
                        key={p}
                        onClick={() => (setPage(p), load())}
                        className={
                          page === p
                            ? 'text-amber-400 font-bold cursor-pointer'
                            : 'text-amber-300/60 hover:text-amber-300 cursor-pointer'
                        }
                      >
                        {p}
                      </span>
                    )
                  })}
                  <span
                    onClick={() => page < pages && (setPage(page + 1), load())}
                    className={
                      page === pages
                        ? 'opacity-30 cursor-default'
                        : 'cursor-pointer hover:opacity-80'
                    }
                  >
                    &gt;
                  </span>
                </div>
              )}
              <div className="text-center text-amber-300/60 font-mono text-sm">
                displaying items {start}-{end} of {total} in total
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
