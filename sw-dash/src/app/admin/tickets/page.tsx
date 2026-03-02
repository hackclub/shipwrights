'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ago } from '@/lib/fmt'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'

interface Ticket {
  id: number
  userName: string
  userAvatar?: string | null
  question: string
  status: string
  createdAt: string
  assignees?: Array<{ id: number; name: string; avatar?: string | null }>
  userThreadTs?: string | null
  staffThreadTs?: string | null
}

interface Stats {
  total: number
  open: number
  closed: number
}

interface GraphPoint {
  date: string
  created: number
  closed: number
}

export default function Tickets() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [stats, setStats] = useState<Stats>({ total: 0, open: 0, closed: 0 })
  const [graphData, setGraphData] = useState<GraphPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('open')
  const [botOk, setBotOk] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch(`/api/admin/tickets?status=all`),
      fetch(`/api/admin/tickets?status=${filter}`),
    ])
      .then(([allRes, filterRes]) => {
        if (!allRes.ok || !filterRes.ok) throw new Error('shit broke')
        return Promise.all([allRes.json(), filterRes.json()])
      })
      .then(([allTickets, filteredTickets]) => {
        const all = Array.isArray(allTickets) ? allTickets : []
        const filtered = Array.isArray(filteredTickets) ? filteredTickets : []
        setTickets(filtered)
        setStats({
          total: all.length,
          open: all.filter((t: Ticket) => t.status === 'open').length,
          closed: all.filter((t: Ticket) => t.status === 'closed').length,
        })
        setLoading(false)
      })
      .catch(() => {
        setTickets([])
        setLoading(false)
      })
  }, [filter])

  useEffect(() => {
    fetch('/api/admin/tickets/stats')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) return
        const createdMap = new Map<string, number>(data.created.map((d: any) => [d.date, d.count]))
        const closedMap = new Map<string, number>(data.closed.map((d: any) => [d.date, d.count]))
        const allDates = new Set([...createdMap.keys(), ...closedMap.keys()])
        const merged = [...allDates].sort().map((date) => ({
          date,
          created: createdMap.get(date) || 0,
          closed: closedMap.get(date) || 0,
        }))
        setGraphData(merged)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    const botUrl = process.env.NEXT_PUBLIC_BOT_URL || 'http://localhost:45100'
    const check = async () => {
      try {
        const r = await fetch(`${botUrl}/health`)
        setBotOk(r.ok)
      } catch {
        setBotOk(false)
      }
    }
    check()
    const t = setInterval(check, 10000)
    return () => clearInterval(t)
  }, [])

  const skel = () => (
    <main className="bg-grid min-h-screen w-full p-4 md:p-8">
      <div className="w-full">
        <div className="h-4 w-16 bg-zinc-800/40 rounded mb-4 md:mb-6" />
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-6 md:mb-8 min-h-[48px]">
          <div className="flex flex-wrap items-center gap-2 md:gap-4">
            <div className="h-8 w-32 bg-zinc-800/50 rounded" />
            <div className="h-6 w-16 bg-zinc-800/30 rounded" />
          </div>
        </div>
        <div className="mb-6 md:mb-8">
          <div className="bg-gradient-to-br from-zinc-900/90 to-black/90 border-2 border-amber-900/40 rounded-2xl p-4 md:p-5">
            <div className="h-4 w-24 bg-zinc-800/40 rounded mb-2" />
            <div className="h-9 w-16 bg-zinc-800/50 rounded mb-4" />
            <div className="border-t border-zinc-800 pt-4 flex gap-6">
              {[...Array(3)].map((_, i) => (
                <div key={i}>
                  <div className="h-3 w-12 bg-zinc-800/30 rounded mb-1" />
                  <div className="h-6 w-10 bg-zinc-800/40 rounded" />
                </div>
              ))}
            </div>
            <div className="border-t border-zinc-800 mt-4 pt-4">
              <div className="h-[200px] bg-zinc-800/20 rounded" />
            </div>
          </div>
        </div>
        <div className="hidden md:block bg-gradient-to-br from-zinc-900/90 to-black/90 border-2 border-amber-900/40 rounded-2xl overflow-hidden shadow-2xl">
          <table className="w-full">
            <thead>
              <tr className="border-b border-amber-900/30">
                {['ID', 'USER', 'QUESTION', 'ASSIGNEE', 'STATUS', 'CREATED', ''].map((h) => (
                  <th key={h} className="text-left p-4 text-amber-400 font-mono text-sm">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...Array(5)].map((_, i) => (
                <tr key={i} className="border-b border-amber-900/20">
                  {[...Array(7)].map((_, j) => (
                    <td key={j} className="p-4">
                      <div className="h-4 w-20 bg-zinc-800/40 rounded" />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  )

  if (loading) return skel()

  return (
    <main className="bg-grid min-h-screen w-full p-4 md:p-8" role="main">
      {!botOk && (
        <div className="fixed top-0 left-0 right-0 bg-red-900/50 border-b border-red-700 p-3 text-center z-50">
          <p className="text-red-300 font-mono text-sm">
            bot connection dead.. wait 5 mins or ping admins
          </p>
        </div>
      )}
      <div className="w-full">
        <Link
          href="/admin"
          className="text-amber-400 font-mono text-sm hover:text-amber-300 transition-colors mb-4 md:mb-6 inline-flex items-center gap-2"
        >
          ← back
        </Link>

        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-6 md:mb-8">
          <div className="flex flex-wrap items-center gap-2 md:gap-4">
            <h1 className="text-2xl md:text-4xl font-mono text-amber-400">Tickets</h1>
            <span
              className={`px-2 md:px-3 py-1 rounded font-mono text-xs md:text-sm border ${
                filter === 'open'
                  ? 'bg-green-900/30 text-green-400 border-green-700'
                  : filter === 'closed'
                    ? 'bg-amber-900/30 text-amber-400 border-amber-700'
                    : 'bg-gray-900/30 text-gray-400 border-gray-700'
              }`}
            >
              {filter.charAt(0).toUpperCase() + filter.slice(1)}
            </span>
          </div>
        </div>

        <div className="mb-6 md:mb-8">
          <div className="bg-gradient-to-br from-zinc-900/90 to-black/90 border-2 border-amber-900/40 rounded-2xl p-4 md:p-5 shadow-xl">
            <div className="mb-4">
              <div className="text-gray-400 font-mono text-xs mb-1">Total tickets</div>
              <div className="flex items-baseline gap-3">
                <span className="text-3xl md:text-4xl font-bold font-mono text-white">
                  {stats.total}
                </span>
                <span className="text-gray-400 font-mono text-sm">
                  {stats.open} open, {stats.closed} closed
                </span>
              </div>
            </div>

            <div className="flex flex-wrap gap-4 md:gap-6 pt-4 border-t border-zinc-800">
              <div>
                <div className="text-gray-500 font-mono text-xs mb-1">Open</div>
                <span className="text-xl font-bold font-mono text-green-400">{stats.open}</span>
              </div>
              <div>
                <div className="text-gray-500 font-mono text-xs mb-1">Closed</div>
                <span className="text-xl font-bold font-mono text-amber-400">{stats.closed}</span>
              </div>
              <div>
                <div className="text-gray-500 font-mono text-xs mb-1">Close rate</div>
                <span className="text-xl font-bold font-mono text-white">
                  {stats.total > 0 ? Math.round((stats.closed / stats.total) * 100) : 0}%
                </span>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-zinc-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-400 font-mono text-xs">last 30 days</span>
                <div className="flex gap-3 font-mono text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-0.5 bg-green-400 inline-block" /> created
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-0.5 bg-amber-400 inline-block" /> closed
                  </span>
                </div>
              </div>
              {graphData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={graphData} margin={{ top: 5, right: 10, bottom: 40, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#78716c10" />
                    <XAxis
                      dataKey="date"
                      stroke="#78716c"
                      style={{ fontSize: '10px' }}
                      tickFormatter={(d) => {
                        const dt = new Date(d)
                        return `${dt.toLocaleString('en-US', { month: 'short' })} ${dt.getDate()}`
                      }}
                      angle={-45}
                      textAnchor="end"
                      height={40}
                    />
                    <YAxis
                      stroke="#78716c"
                      style={{ fontSize: '10px' }}
                      allowDecimals={false}
                      width={25}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null
                        const d = new Date(payload[0].payload.date)
                        return (
                          <div className="bg-zinc-900 border border-zinc-700 rounded px-3 py-2 shadow-xl">
                            <p className="text-gray-400 text-xs font-mono mb-1">
                              {d.toLocaleString('en-US', { month: 'short' })} {d.getDate()}
                            </p>
                            <p className="text-green-400 text-xs font-mono">
                              created: {payload[0].payload.created}
                            </p>
                            <p className="text-amber-400 text-xs font-mono">
                              closed: {payload[0].payload.closed}
                            </p>
                          </div>
                        )
                      }}
                      cursor={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="created"
                      stroke="#4ade80"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="closed"
                      stroke="#f59e0b"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[200px] flex items-center justify-center text-gray-500 font-mono text-sm">
                  no data yet
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mb-4 md:mb-6 flex flex-wrap gap-1">
          {['all', 'open', 'closed'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`font-mono text-xs px-3 py-1.5 rounded-xl border transition-all ${
                filter === f
                  ? f === 'open'
                    ? 'bg-green-900/40 text-green-300 border-green-600'
                    : f === 'closed'
                      ? 'bg-amber-900/40 text-amber-300 border-amber-600'
                      : 'bg-zinc-800 text-white border-zinc-600'
                  : 'bg-zinc-900/50 text-gray-400 border-gray-700 hover:bg-zinc-800'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)} (
              {f === 'all' ? stats.total : f === 'open' ? stats.open : stats.closed})
            </button>
          ))}
        </div>

        {tickets.length === 0 ? (
          <div className="bg-gradient-to-br from-zinc-900/90 to-black/90 border-2 border-amber-900/40 p-4 rounded-2xl shadow-2xl">
            <p className="text-amber-300/60 font-mono text-sm">nothing here bruh</p>
          </div>
        ) : (
          <>
            <div className="md:hidden space-y-3">
              {tickets.map((t) => (
                <div
                  key={t.id}
                  className="border-2 border-amber-900/30 bg-gradient-to-br from-zinc-900/80 to-black/80 p-3 rounded-2xl shadow-lg"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {t.userAvatar ? (
                        <img
                          src={t.userAvatar}
                          alt=""
                          className="w-7 h-7 rounded-full shrink-0 object-cover"
                        />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-amber-900/40 flex items-center justify-center text-amber-400 font-mono text-xs shrink-0">
                          {t.userName?.[0]?.toUpperCase() ?? '?'}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="text-amber-400 font-mono text-sm font-bold">sw-{t.id}</div>
                        <div className="text-amber-300/60 font-mono text-xs truncate">
                          {t.userName}
                        </div>
                      </div>
                    </div>
                    <span
                      className={`font-mono text-xs px-2 py-1 rounded-xl border-2 ml-2 shrink-0 ${
                        t.status === 'open'
                          ? 'bg-green-900/30 text-green-400 border-green-700'
                          : 'bg-amber-900/30 text-amber-300/70 border-amber-700'
                      }`}
                    >
                      {t.status}
                    </span>
                  </div>
                  <div className="text-amber-200 font-mono text-xs line-clamp-2 mb-2">
                    {t.question}
                  </div>
                  <div className="flex justify-between items-center text-xs font-mono">
                    <div className="flex gap-1 flex-wrap">
                      {t.assignees && t.assignees.length > 0 ? (
                        t.assignees.map((a, i) => (
                          <span key={a.id} className="text-amber-300/60">
                            {a.name}
                            {i < t.assignees!.length - 1 ? ',' : ''}
                          </span>
                        ))
                      ) : (
                        <span className="text-amber-300/60">unassigned</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-amber-300/60">{ago(t.createdAt)}</span>
                      <Link
                        href={`/admin/tickets/sw-${t.id}`}
                        className="bg-amber-900/30 text-amber-400 border border-amber-700 px-3 py-1 rounded-xl font-mono text-xs hover:bg-amber-900/50 transition-all"
                      >
                        open →
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="hidden md:block border-2 border-amber-900/40 bg-gradient-to-br from-zinc-900/90 to-black/90 overflow-hidden rounded-2xl shadow-2xl">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-amber-900/30">
                      <th className="text-left p-4 text-amber-400 font-mono text-sm">ID</th>
                      <th className="text-left p-4 text-amber-400 font-mono text-sm">USER</th>
                      <th className="text-left p-4 text-amber-400 font-mono text-sm">QUESTION</th>
                      <th className="text-left p-4 text-amber-400 font-mono text-sm">ASSIGNEE</th>
                      <th className="text-left p-4 text-amber-400 font-mono text-sm">STATUS</th>
                      <th className="text-left p-4 text-amber-400 font-mono text-sm">CREATED</th>
                      <th className="p-4" />
                    </tr>
                  </thead>
                  <tbody>
                    {tickets.map((t) => (
                      <tr
                        key={t.id}
                        className="border-b border-amber-900/20 hover:bg-amber-950/20 transition-colors"
                      >
                        <td className="p-4">
                          <span className="text-amber-400 font-mono text-sm">sw-{t.id}</span>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            {t.userAvatar ? (
                              <img
                                src={t.userAvatar}
                                alt=""
                                className="w-7 h-7 rounded-full object-cover shrink-0"
                              />
                            ) : (
                              <div className="w-7 h-7 rounded-full bg-amber-900/40 flex items-center justify-center text-amber-400 font-mono text-xs shrink-0">
                                {t.userName?.[0]?.toUpperCase() ?? '?'}
                              </div>
                            )}
                            <span className="text-amber-200 font-mono text-sm">{t.userName}</span>
                          </div>
                        </td>
                        <td className="p-4 max-w-xs">
                          <p className="text-amber-200 font-mono text-sm line-clamp-2">
                            {t.question}
                          </p>
                        </td>
                        <td className="p-4">
                          <div className="flex flex-wrap gap-1">
                            {t.assignees && t.assignees.length > 0 ? (
                              t.assignees.map((a) => (
                                <span
                                  key={a.id}
                                  className="text-amber-300/60 font-mono text-xs bg-amber-900/20 px-2 py-0.5 rounded border border-amber-700/30"
                                >
                                  {a.name}
                                </span>
                              ))
                            ) : (
                              <span className="text-amber-300/60 font-mono text-sm">-</span>
                            )}
                          </div>
                        </td>
                        <td className="p-4">
                          <span
                            className={`inline-block px-2 py-1 rounded font-mono text-xs border ${
                              t.status === 'open'
                                ? 'bg-green-900/30 text-green-400 border-green-700'
                                : 'bg-amber-900/30 text-amber-300/70 border-amber-700'
                            }`}
                          >
                            {t.status}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="text-white font-mono text-sm">
                            {new Date(t.createdAt).toLocaleDateString()}
                          </div>
                          <div className="text-amber-300/60 font-mono text-xs">
                            {ago(t.createdAt)}
                          </div>
                        </td>
                        <td className="p-4">
                          <Link
                            href={`/admin/tickets/sw-${t.id}`}
                            className="bg-amber-900/30 text-amber-400 border border-amber-700 px-3 py-1.5 rounded-xl font-mono text-xs hover:bg-amber-900/50 transition-all whitespace-nowrap"
                          >
                            open →
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  )
}
