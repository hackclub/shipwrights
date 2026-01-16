'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { can, PERMS } from '@/lib/perms'
import { useUser } from '@/lib/user-context'

interface LogEntry {
  shipId: number
  project: string
  ftProjectId: number
  type: string
  certifier: string
  verdict: string
  decisionMade: string
  notes: string
}

interface Stats {
  totalJudged: number
  approved: number
  rejected: number
  approvalRate: number
  avgDecisionTime: string
}

export default function Logs() {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const { user, loading: authLoading } = useUser()

  useEffect(() => {
    if (authLoading) return

    if (!user) {
      window.location.href = `${process.env.NEXT_PUBLIC_URL}/`
      return
    }

    if (!can(user.role, PERMS.certs_view)) {
      window.location.href = `${process.env.NEXT_PUBLIC_URL}/`
      return
    }

    const load = async () => {
      try {
        const res = await fetch('/api/admin/ship_certifications/logs')
        if (!res.ok) throw new Error('fetch fucked up')

        const data = await res.json()
        setLogs(data.logs)
        setStats(data.stats)
      } catch {
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [user, authLoading])

  const color = (verdict: string) => {
    switch (verdict.toLowerCase()) {
      case 'approved':
        return 'bg-green-900/30 text-green-400 border-green-700'
      case 'rejected':
        return 'bg-red-900/30 text-red-400 border-red-700'
      default:
        return 'bg-gray-900/30 text-gray-400 border-gray-700'
    }
  }

  const ago = (date: string) => {
    if (date === '-') return '-'
    const now = new Date()
    const d = new Date(date)
    const diff = Math.floor((now.getTime() - d.getTime()) / 1000)

    if (diff < 60) return 'just now'
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`
    return `${Math.floor(diff / 604800)}w ago`
  }

  const fmtDate = (date: string) => {
    if (date === '-') return '-'
    return new Date(date).toLocaleDateString()
  }

  const skel = () => (
    <main className="bg-grid min-h-screen w-full p-4 md:p-8" role="main">
      <div className="w-full">
        <div className="h-4 w-24 bg-zinc-800/40 rounded mb-4 md:mb-6"></div>
        <div className="flex justify-between items-center mb-6 md:mb-8 min-h-[48px]">
          <div className="h-8 w-32 bg-zinc-800/50 rounded"></div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 md:gap-6 mb-6 md:mb-8">
          <div className="lg:col-span-3">
            <div className="bg-gradient-to-br from-zinc-900/90 to-black/90 border-4 border-amber-900/40 rounded-3xl overflow-hidden shadow-2xl shadow-amber-950/30">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-amber-900/30">
                    {['ship id', 'project', 'verdict', 'certifier', 'decision made', 'notes'].map(
                      (h) => (
                        <th key={h} className="text-left p-4 text-amber-400 font-mono text-sm">
                          {h}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody>
                  {[...Array(5)].map((_, i) => (
                    <tr key={i} className="border-b border-amber-900/20">
                      <td className="p-4">
                        <div className="h-4 w-8 bg-zinc-800/40 rounded"></div>
                      </td>
                      <td className="p-4">
                        <div className="h-4 w-28 bg-zinc-800/40 rounded mb-1"></div>
                        <div className="h-3 w-20 bg-zinc-800/30 rounded"></div>
                      </td>
                      <td className="p-4">
                        <div className="h-5 w-16 bg-zinc-800/40 rounded"></div>
                      </td>
                      <td className="p-4">
                        <div className="h-4 w-20 bg-zinc-800/40 rounded"></div>
                      </td>
                      <td className="p-4">
                        <div className="h-4 w-24 bg-zinc-800/30 rounded"></div>
                      </td>
                      <td className="p-4">
                        <div className="h-4 w-32 bg-zinc-800/30 rounded"></div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="hidden lg:block">
            <div className="bg-gradient-to-br from-zinc-900/90 to-black/90 border-4 border-amber-900/40 rounded-3xl p-6 shadow-xl shadow-amber-950/20 min-h-[200px]">
              <div className="h-5 w-16 bg-zinc-800/50 rounded mb-4"></div>
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="flex justify-between">
                    <div className="h-4 w-20 bg-zinc-800/30 rounded"></div>
                    <div className="h-4 w-12 bg-zinc-800/40 rounded"></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )

  if (loading) return skel()

  return (
    <main className="bg-grid min-h-screen w-full p-4 md:p-8" role="main">
      <div className="w-full">
        <Link
          href="/admin/ship_certifications"
          className="text-amber-400 font-mono text-sm hover:text-amber-300 transition-colors mb-4 md:mb-6 inline-flex items-center gap-2"
        >
          ← back to certs
        </Link>
        <div className="flex justify-between items-center mb-6 md:mb-8">
          <h1 className="text-2xl md:text-4xl font-mono text-amber-400">Cert Logs</h1>
        </div>

        <div className="lg:hidden mb-4">
          <div className="bg-gradient-to-br from-zinc-900/90 to-black/90 border-4 border-amber-900/40 rounded-3xl p-4 shadow-xl shadow-amber-950/20">
            <h2 className="text-amber-400 font-mono text-sm mb-3">Stats</h2>
            <div className="grid grid-cols-2 gap-3 text-xs font-mono">
              <div className="flex justify-between">
                <span className="text-gray-400">Judged:</span>
                <span className="text-white font-bold">{stats?.totalJudged || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Rate:</span>
                <span className="text-white font-bold">{stats?.approvalRate || 0}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Approved:</span>
                <span className="text-green-400">{stats?.approved || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Rejected:</span>
                <span className="text-red-400">{stats?.rejected || 0}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 md:gap-6 mb-6 md:mb-8">
          <div className="lg:col-span-3">
            <div className="md:hidden space-y-3">
              {logs.map((l) => (
                <Link
                  key={l.shipId}
                  href={`/admin/ship_certifications/${l.shipId}/edit`}
                  className="block bg-gradient-to-br from-zinc-900/80 to-black/80 border-2 border-amber-900/30 rounded-2xl p-4 hover:bg-zinc-900/60 transition-all hover:border-amber-700/50 shadow-lg shadow-amber-950/10 hover:scale-[1.01]"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-amber-400 font-mono text-sm font-bold truncate">
                        {l.project}
                      </div>
                      <div className="text-gray-500 font-mono text-xs">
                        Project ID: {l.ftProjectId}
                      </div>
                      <div className="text-gray-500 font-mono text-xs">Type: {l.type}</div>
                    </div>
                    <span
                      className={`px-2 py-1 rounded font-mono text-xs border ml-2 ${color(l.verdict)}`}
                    >
                      {l.verdict}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                    <div>
                      <span className="text-gray-500">by:</span>{' '}
                      <span className="text-white">{l.certifier}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">decision:</span>{' '}
                      <span className="text-white">{fmtDate(l.decisionMade)}</span>{' '}
                      <span className="text-gray-500">({ago(l.decisionMade)})</span>
                    </div>
                  </div>
                  {l.notes && (
                    <div className="mt-2 text-gray-400 font-mono text-xs line-clamp-2">
                      <span className="text-gray-500">notes:</span> {l.notes}
                    </div>
                  )}
                </Link>
              ))}
            </div>

            <div className="hidden md:block bg-gradient-to-br from-zinc-900/90 to-black/90 border-4 border-amber-900/40 rounded-3xl overflow-hidden shadow-2xl shadow-amber-950/30">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-amber-900/30">
                      <th className="text-left p-4 text-amber-400 font-mono text-sm">ship id</th>
                      <th className="text-left p-4 text-amber-400 font-mono text-sm">project</th>
                      <th className="text-left p-4 text-amber-400 font-mono text-sm">verdict</th>
                      <th className="text-left p-4 text-amber-400 font-mono text-sm">certifier</th>
                      <th className="text-left p-4 text-amber-400 font-mono text-sm">
                        decision made
                      </th>
                      <th className="text-left p-4 text-amber-400 font-mono text-sm">notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((l) => (
                      <tr
                        key={l.shipId}
                        className="border-b border-amber-900/20 hover:bg-amber-950/20 transition-colors"
                      >
                        <td className="p-4">
                          <Link
                            href={`/admin/ship_certifications/${l.shipId}/edit`}
                            className="text-amber-400 font-mono text-sm hover:text-amber-300 underline"
                          >
                            {l.shipId}
                          </Link>
                        </td>
                        <td className="p-4">
                          <Link
                            href={`/admin/ship_certifications/${l.shipId}/edit`}
                            className="text-amber-400 font-mono text-sm hover:text-amber-300 underline"
                          >
                            {l.project}
                          </Link>
                          <div className="text-gray-500 font-mono text-xs">
                            Project ID: {l.ftProjectId}
                          </div>
                          <div className="text-gray-500 font-mono text-xs">Type: {l.type}</div>
                        </td>
                        <td className="p-4">
                          <span
                            className={`inline-block px-2 py-1 rounded font-mono text-xs border ${color(l.verdict)}`}
                          >
                            {l.verdict}
                          </span>
                        </td>
                        <td className="p-4 text-white font-mono text-sm">{l.certifier}</td>
                        <td className="p-4">
                          <div className="text-white font-mono text-sm">
                            {fmtDate(l.decisionMade)}
                          </div>
                          <div className="text-gray-500 font-mono text-xs">
                            {ago(l.decisionMade)}
                          </div>
                        </td>
                        <td className="p-4 text-gray-300 font-mono text-sm max-w-md">{l.notes}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="hidden lg:block space-y-6">
            <div className="bg-gradient-to-br from-zinc-900/90 to-black/90 border-4 border-amber-900/40 rounded-3xl p-6 shadow-xl shadow-amber-950/20">
              <h2 className="text-amber-400 font-mono text-lg mb-4">Stats</h2>
              <div className="space-y-3 text-sm font-mono">
                <div className="flex justify-between">
                  <span className="text-gray-400">Total Judged:</span>
                  <span className="text-white font-bold">{stats?.totalJudged || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Approved:</span>
                  <span className="bg-green-900/30 text-green-400 px-2 py-1 rounded">
                    {stats?.approved || 0}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Rejected:</span>
                  <span className="bg-red-900/30 text-red-400 px-2 py-1 rounded">
                    {stats?.rejected || 0}
                  </span>
                </div>
                <div className="flex justify-between pt-2 border-t border-gray-700">
                  <span className="text-gray-400">Approval Rate:</span>
                  <span className="text-white font-bold">{stats?.approvalRate || 0}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
