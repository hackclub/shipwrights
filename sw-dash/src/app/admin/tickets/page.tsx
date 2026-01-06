'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Ticket {
  id: number
  userName: string
  question: string
  status: string
  createdAt: string
  assignees?: Array<{ id: number; name: string; avatar?: string | null }>
  userThreadTs?: string
  staffThreadTs?: string
}

interface Stats {
  total: number
  open: number
  closed: number
}

export default function Tickets() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [stats, setStats] = useState<Stats>({ total: 0, open: 0, closed: 0 })
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('open')
  const [botOk, setBotOk] = useState(true)
  const router = useRouter()

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
    const botUrl = process.env.NEXT_PUBLIC_BOT_URL || 'http://localhost:45100'

    const checkHealth = async () => {
      try {
        const r = await fetch(`${botUrl}/health`, { method: 'GET' })
        setBotOk(r.ok)
      } catch {
        setBotOk(false)
      }
    }

    checkHealth()
    const healthInt = setInterval(checkHealth, 10000)

    return () => {
      clearInterval(healthInt)
    }
  }, [])

  const ago = (date: string) => {
    const now = new Date()
    const d = new Date(date)
    const diff = Math.floor((now.getTime() - d.getTime()) / 1000)
    if (diff < 60) return 'just now'
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`
    return `${Math.floor(diff / 604800)}w ago`
  }

  const openThread = (ticket: Ticket, type: 'user' | 'staff') => {
    const threadTs = type === 'user' ? ticket.userThreadTs : ticket.staffThreadTs
    if (!threadTs) return

    const slackUrl = `slack://channel?team=T0266FRGM&id=C08578QKW4C&message=${threadTs}`
    window.open(slackUrl, '_blank')
  }

  const skel = () => (
    <main className="bg-grid min-h-screen w-full p-4 md:p-8" role="main">
      <div className="w-full">
        <div className="h-4 w-16 bg-zinc-800/40 rounded mb-4 md:mb-6"></div>
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-6 md:mb-8 min-h-[48px]">
          <div className="flex flex-wrap items-center gap-2 md:gap-4">
            <div className="h-8 w-32 bg-zinc-800/50 rounded"></div>
            <div className="h-6 w-16 bg-zinc-800/30 rounded"></div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-zinc-900/90 to-black/90 border-4 border-amber-900/40 rounded-3xl p-4 md:p-6 shadow-xl shadow-amber-950/20 mb-6 md:mb-8 min-h-[140px]">
          <div className="h-5 w-16 bg-zinc-800/50 rounded mb-4"></div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="text-center p-3 bg-zinc-900/50 rounded-2xl border-2 border-amber-800/30 min-h-[80px]"
              >
                <div className="h-8 w-12 bg-zinc-800/40 rounded mx-auto mb-2"></div>
                <div className="h-3 w-16 bg-zinc-800/30 rounded mx-auto"></div>
              </div>
            ))}
          </div>
        </div>
        <div className="mb-4 md:mb-6">
          <div className="h-4 w-12 bg-zinc-800/40 rounded mb-2"></div>
          <div className="flex flex-wrap gap-2">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="h-9 w-24 bg-zinc-900/30 rounded-2xl border-2 border-zinc-800/30"
              ></div>
            ))}
          </div>
        </div>
        <div className="hidden md:block bg-gradient-to-br from-zinc-900/90 to-black/90 border-4 border-amber-900/40 rounded-3xl overflow-hidden shadow-2xl shadow-amber-950/30">
          <table className="w-full">
            <thead>
              <tr className="border-b border-amber-900/30">
                {['ID', 'USER', 'QUESTION', 'ASSIGNEE', 'STATUS', 'CREATED', 'THREADS'].map((h) => (
                  <th key={h} className="text-left p-4 text-amber-400 font-mono text-sm">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...Array(5)].map((_, i) => (
                <tr key={i} className="border-b border-amber-900/20">
                  <td className="p-4">
                    <div className="h-4 w-12 bg-zinc-800/40 rounded"></div>
                  </td>
                  <td className="p-4">
                    <div className="h-4 w-20 bg-zinc-800/40 rounded"></div>
                  </td>
                  <td className="p-4">
                    <div className="h-4 w-40 bg-zinc-800/40 rounded"></div>
                  </td>
                  <td className="p-4">
                    <div className="h-4 w-16 bg-zinc-800/30 rounded"></div>
                  </td>
                  <td className="p-4">
                    <div className="h-5 w-14 bg-zinc-800/40 rounded"></div>
                  </td>
                  <td className="p-4">
                    <div className="h-4 w-20 bg-zinc-800/30 rounded"></div>
                  </td>
                  <td className="p-4">
                    <div className="h-4 w-16 bg-zinc-800/30 rounded"></div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="md:hidden space-y-3">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="border-4 border-amber-900/40 bg-gradient-to-br from-zinc-900/90 to-black/90 p-3 rounded-3xl min-h-[120px]"
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <div className="h-4 w-16 bg-zinc-800/50 rounded mb-1"></div>
                  <div className="h-3 w-24 bg-zinc-800/30 rounded"></div>
                </div>
                <div className="h-5 w-12 bg-zinc-800/40 rounded"></div>
              </div>
              <div className="h-3 w-full bg-zinc-800/30 rounded mt-3"></div>
            </div>
          ))}
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

        <div className="bg-gradient-to-br from-zinc-900/90 to-black/90 border-4 border-amber-900/40 rounded-3xl p-4 md:p-6 shadow-xl shadow-amber-950/20 mb-6 md:mb-8">
          <h2 className="text-amber-400 font-mono text-base md:text-lg mb-3 md:mb-4">Stats</h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-3 bg-zinc-900/50 rounded-2xl border-2 border-amber-800/30">
              <div className="text-white font-mono text-2xl md:text-3xl font-bold">
                {stats.total}
              </div>
              <div className="text-gray-400 font-mono text-xs md:text-sm mt-1">Total</div>
            </div>
            <div className="text-center p-3 bg-green-900/20 rounded-2xl border-2 border-green-700/50">
              <div className="text-green-400 font-mono text-2xl md:text-3xl font-bold">
                {stats.open}
              </div>
              <div className="text-green-300/70 font-mono text-xs md:text-sm mt-1">Open</div>
            </div>
            <div className="text-center p-3 bg-amber-900/20 rounded-2xl border-2 border-amber-700/50">
              <div className="text-amber-400 font-mono text-2xl md:text-3xl font-bold">
                {stats.closed}
              </div>
              <div className="text-amber-300/70 font-mono text-xs md:text-sm mt-1">Closed</div>
            </div>
          </div>
        </div>

        <div className="mb-4 md:mb-6">
          <h3 className="text-amber-400 font-mono text-xs md:text-sm mb-2">Filter</h3>
          <div className="flex flex-wrap gap-2">
            {['all', 'open', 'closed'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`font-mono text-xs px-3 py-2 rounded-2xl border-2 transition-all ${
                  filter === f
                    ? 'bg-amber-900/30 text-amber-400 border-amber-700/60 shadow-lg shadow-amber-950/20'
                    : 'bg-zinc-900/30 text-amber-300/60 border-amber-800/30 hover:bg-zinc-900/50'
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)} (
                {f === 'all' ? stats.total : f === 'open' ? stats.open : stats.closed})
              </button>
            ))}
          </div>
        </div>

        {tickets.length === 0 ? (
          <div className="bg-gradient-to-br from-zinc-900/90 to-black/90 border-4 border-amber-900/40 p-4 rounded-3xl shadow-2xl shadow-amber-950/30">
            <p className="text-amber-300/60 font-mono text-sm">nothing here bruh</p>
          </div>
        ) : (
          <>
            <div className="md:hidden space-y-3">
              {tickets.map((t) => (
                <div
                  key={t.id}
                  className="border-4 border-amber-900/40 bg-gradient-to-br from-zinc-900/90 to-black/90 p-3 rounded-3xl shadow-xl shadow-amber-950/20"
                >
                  <div
                    onClick={() => router.push(`/admin/tickets/sw-${t.id}`)}
                    className="cursor-pointer"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1 min-w-0">
                        <div className="text-amber-400 font-mono text-sm font-bold">sw-{t.id}</div>
                        <div className="text-amber-300/60 font-mono text-xs truncate">
                          {t.userName}
                        </div>
                      </div>
                      <span
                        className={`font-mono text-xs px-2 py-1 rounded-xl border-2 ml-2 ${t.status === 'open' ? 'bg-green-900/30 text-green-400 border-green-700' : 'bg-amber-900/30 text-amber-300/70 border-amber-700'}`}
                      >
                        {t.status}
                      </span>
                    </div>
                    <div className="text-amber-200 font-mono text-xs line-clamp-2 mb-2">
                      {t.question}
                    </div>
                    <div className="flex justify-between text-xs font-mono">
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
                      <span className="text-amber-300/60">{ago(t.createdAt)}</span>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3 pt-3 border-t border-amber-900/30">
                    {t.userThreadTs && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          openThread(t, 'user')
                        }}
                        className="flex-1 bg-blue-900/30 text-blue-400 border-2 border-blue-700 px-3 py-1.5 rounded-xl font-mono text-xs hover:bg-blue-900/50 transition-all active:scale-95"
                      >
                        user thread
                      </button>
                    )}
                    {t.staffThreadTs && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          openThread(t, 'staff')
                        }}
                        className="flex-1 bg-purple-900/30 text-purple-400 border-2 border-purple-700 px-3 py-1.5 rounded-xl font-mono text-xs hover:bg-purple-900/50 transition-all active:scale-95"
                      >
                        staff thread
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="hidden md:block border-4 border-amber-900/40 bg-gradient-to-br from-zinc-900/90 to-black/90 overflow-hidden rounded-3xl shadow-2xl shadow-amber-950/30">
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
                      <th className="text-left p-4 text-amber-400 font-mono text-sm">THREADS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tickets.map((t) => (
                      <tr
                        key={t.id}
                        className="border-b border-amber-900/20 hover:bg-amber-950/20 transition-colors"
                      >
                        <td className="p-4">
                          <Link
                            href={`/admin/tickets/sw-${t.id}`}
                            className="text-amber-400 font-mono text-sm hover:text-amber-300 underline"
                          >
                            sw-{t.id}
                          </Link>
                        </td>
                        <td className="p-4 text-amber-200 font-mono text-sm truncate">
                          {t.userName}
                        </td>
                        <td className="p-4">
                          <Link
                            href={`/admin/tickets/sw-${t.id}`}
                            className="text-amber-200 font-mono text-sm hover:text-amber-300 line-clamp-1"
                          >
                            {t.question}
                          </Link>
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
                          <div className="flex gap-2">
                            {t.userThreadTs && (
                              <button
                                onClick={() => openThread(t, 'user')}
                                className="bg-blue-900/30 text-blue-400 border border-blue-700 px-2 py-1 rounded font-mono text-xs hover:bg-blue-900/50 transition-all"
                              >
                                user
                              </button>
                            )}
                            {t.staffThreadTs && (
                              <button
                                onClick={() => openThread(t, 'staff')}
                                className="bg-purple-900/30 text-purple-400 border border-purple-700 px-2 py-1 rounded font-mono text-xs hover:bg-purple-900/50 transition-all"
                              >
                                staff
                              </button>
                            )}
                            {!t.userThreadTs && !t.staffThreadTs && (
                              <span className="text-gray-500 font-mono text-xs">-</span>
                            )}
                          </div>
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
