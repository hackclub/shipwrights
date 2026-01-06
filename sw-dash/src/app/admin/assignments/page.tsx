'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { can, PERMS, NO_ACCESS_URL } from '@/lib/perms'

interface Assignment {
  id: number
  description: string
  status: string
  createdAt: string
  updatedAt: string
  repoUrl?: string
  shipCertId?: number
  projectName?: string
  author: {
    username: string
    slackId: string
  }
  assignee?: {
    username: string
    slackId: string
  } | null
}

function Content() {
  const [loading, setLoading] = useState(true)
  const [all, setAll] = useState<Assignment[]>([])
  const [filtered, setFiltered] = useState<Assignment[]>([])
  const [error, setError] = useState('')
  const [status, setStatus] = useState('all')
  const [type, setType] = useState('all')
  const [assignee, setAssignee] = useState('all')
  const [user, setUser] = useState<{ id: string; username: string; role: string } | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const s = searchParams.get('status') || 'all'
    const t = searchParams.get('type') || 'all'
    const a = searchParams.get('assignee') || 'all'

    setStatus(s)
    setType(t)
    setAssignee(a)
  }, [searchParams])

  useEffect(() => {
    const load = async () => {
      try {
        const [assignRes, userRes] = await Promise.all([
          fetch('/api/admin/assignments'),
          fetch('/api/admin'),
        ])

        if (assignRes.status === 401 || userRes.status === 401) {
          window.location.href = `${process.env.NEXT_PUBLIC_URL}/`
          return
        }

        if (assignRes.status === 403) {
          window.location.href = `${process.env.NEXT_PUBLIC_URL}/${NO_ACCESS_URL}`
          return
        }

        const [assignData, userData] = await Promise.all([assignRes.json(), userRes.json()])

        if (userData?.currentUser) {
          setUser(userData.currentUser)

          if (!can(userData.currentUser.role, PERMS.assign_view)) {
            window.location.href = `${process.env.NEXT_PUBLIC_URL}/${NO_ACCESS_URL}`
            return
          }
        }

        if (assignData) {
          if (assignData.error) {
            setError(assignData.error)
          } else {
            setAll(assignData.assignments || [])
            setFiltered(assignData.assignments || [])
          }
        }

        setLoading(false)
      } catch {
        setError('shit broke loading assignments')
        setLoading(false)
      }
    }

    load()
  }, [router])

  const getTypes = (desc: string | null) => {
    if (!desc) return []

    if (desc.startsWith('Type: ')) {
      const t = desc.replace('Type: ', '').trim()
      return [t]
    }

    if (desc.startsWith('Types: ')) {
      const t = desc.replace('Types: ', '').trim()
      return t
        .split(',')
        .map((s: string) => s.trim())
        .filter((s: string) => s.length > 0)
    }

    return []
  }

  useEffect(() => {
    let f = all

    if (status !== 'all') {
      f = f.filter((a: Assignment) => a.status === status)
    }

    if (type !== 'all') {
      f = f.filter((a: Assignment) => {
        const types = getTypes(a.description)
        return types.some((t: string) => t.toLowerCase() === type.toLowerCase())
      })
    }

    if (assignee === 'me' && user) {
      f = f.filter((a: Assignment) => a.assignee?.username === user.username)
    }

    setFiltered(f)
  }, [all, status, type, assignee, user])

  const types = (a: Assignment) => {
    return getTypes(a.description)
  }

  const unique = () => {
    const allT = all.flatMap((a: Assignment) =>
      getTypes(a.description).map((t: string) => t.toLowerCase())
    )
    return [...new Set(allT)]
  }

  const counts = () => {
    const c = {
      total: all.length,
      pending: all.filter((a: Assignment) => a.status === 'pending').length,
      in_progress: all.filter((a: Assignment) => a.status === 'in_progress').length,
      completed: all.filter((a: Assignment) => a.status === 'completed').length,
    }
    return c
  }

  const setUrl = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value === 'all') {
      params.delete(key)
    } else {
      params.set(key, value)
    }
    const url = params.toString() ? `?${params.toString()}` : '/admin/assignments'
    router.push(url)
  }

  const skel = () => (
    <main className="bg-grid min-h-screen w-full overflow-hidden" role="main">
      <div className="md:hidden p-4">
        <div className="h-4 w-16 bg-zinc-800/40 rounded mb-4"></div>
        <div className="h-8 w-40 bg-zinc-800/50 rounded mb-4"></div>
        <div className="mb-4 grid grid-cols-2 gap-2">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="bg-gradient-to-br from-zinc-900/90 to-black/90 border-4 border-amber-900/40 p-3 rounded-2xl min-h-[64px]"
            >
              <div className="h-3 w-12 bg-zinc-800/40 rounded mb-2"></div>
              <div className="h-5 w-8 bg-zinc-800/50 rounded"></div>
            </div>
          ))}
        </div>
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="bg-gradient-to-br from-zinc-900/90 to-black/90 border-4 border-amber-900/40 p-4 rounded-3xl min-h-[100px]"
            >
              <div className="flex justify-between items-start mb-2">
                <div className="flex-1">
                  <div className="h-4 w-32 bg-zinc-800/50 rounded mb-2"></div>
                  <div className="h-3 w-24 bg-zinc-800/30 rounded"></div>
                </div>
                <div className="h-5 w-14 bg-zinc-800/40 rounded"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="hidden md:flex h-full">
        <div className="w-80 bg-grid bg-black/95 border-r border-amber-900/40 p-6">
          <div className="mb-8 bg-gradient-to-br from-zinc-900/90 to-black/90 border-4 border-amber-900/40 rounded-3xl p-4 min-h-[100px]">
            <div className="h-4 w-32 bg-zinc-800/40 rounded mb-4"></div>
            <div className="h-6 w-48 bg-zinc-800/50 rounded"></div>
          </div>
          <div className="mb-8 bg-gradient-to-br from-zinc-900/90 to-black/90 border-4 border-amber-900/40 rounded-3xl p-4 min-h-[180px]">
            <div className="h-4 w-20 bg-zinc-800/40 rounded mb-4"></div>
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="flex justify-between p-2 bg-black/50 border-2 border-amber-900/30 rounded-xl"
                >
                  <div className="h-4 w-24 bg-zinc-800/30 rounded"></div>
                  <div className="h-4 w-12 bg-zinc-800/40 rounded"></div>
                </div>
              ))}
            </div>
          </div>
          <div className="mb-8 bg-gradient-to-br from-zinc-900/90 to-black/90 border-4 border-amber-900/40 rounded-3xl p-4 min-h-[120px]">
            <div className="h-4 w-28 bg-zinc-800/40 rounded mb-4"></div>
            <div className="flex flex-wrap gap-2">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-8 w-20 bg-zinc-800/30 rounded-2xl"></div>
              ))}
            </div>
          </div>
        </div>
        <div className="flex-1 overflow-hidden bg-grid">
          <div className="h-full flex flex-col">
            <div className="bg-gradient-to-br from-zinc-900/90 to-black/90 border-4 border-amber-900/40 rounded-3xl p-6 m-4 mb-0 min-h-[80px]">
              <div className="h-5 w-36 bg-zinc-800/50 rounded mb-2"></div>
              <div className="h-4 w-48 bg-zinc-800/30 rounded"></div>
            </div>
            <div className="flex-1 overflow-auto p-4 space-y-4">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="bg-gradient-to-br from-zinc-900/90 to-black/90 border-4 border-amber-900/40 rounded-3xl p-6 min-h-[140px]"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <div className="h-4 w-48 bg-zinc-800/50 rounded mb-2"></div>
                      <div className="h-3 w-32 bg-zinc-800/30 rounded"></div>
                    </div>
                    <div className="h-6 w-20 bg-zinc-800/40 rounded"></div>
                  </div>
                  <div className="grid grid-cols-4 gap-4">
                    {[...Array(3)].map((_, j) => (
                      <div key={j}>
                        <div className="h-3 w-16 bg-zinc-800/30 rounded mb-1"></div>
                        <div className="h-4 w-20 bg-zinc-800/40 rounded"></div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  )

  if (loading) return skel()

  const stats = counts()
  const allTypes = unique()

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

  return (
    <main className="bg-grid min-h-screen w-full overflow-hidden" role="main">
      <div className="md:hidden p-4">
        <Link
          href="/admin"
          className="text-gray-400 font-mono text-sm hover:text-white transition-colors mb-4 inline-block"
        >
          ← back
        </Link>
        <h1 className="text-2xl text-white font-mono mb-4">Assignments</h1>

        <div className="mb-4 grid grid-cols-2 gap-2">
          <div className="bg-gradient-to-br from-zinc-900/90 to-black/90 border-4 border-amber-900/40 p-3 rounded-2xl shadow-xl shadow-amber-950/20">
            <div className="text-amber-300 font-mono text-xs">total</div>
            <div className="text-amber-400 font-mono text-lg font-bold">{stats.total}</div>
          </div>
          <div className="bg-gradient-to-br from-zinc-900/90 to-black/90 border-4 border-amber-900/40 p-3 rounded-2xl shadow-xl shadow-amber-950/20">
            <div className="text-amber-300 font-mono text-xs">pending</div>
            <div className="text-amber-400 font-mono text-lg font-bold">{stats.pending}</div>
          </div>
          <div className="bg-gradient-to-br from-zinc-900/90 to-black/90 border-4 border-amber-900/40 p-3 rounded-2xl shadow-xl shadow-amber-950/20">
            <div className="text-amber-300 font-mono text-xs">in progress</div>
            <div className="text-amber-400 font-mono text-lg font-bold">{stats.in_progress}</div>
          </div>
          <div className="bg-gradient-to-br from-zinc-900/90 to-black/90 border-4 border-amber-900/40 p-3 rounded-2xl shadow-xl shadow-amber-950/20">
            <div className="text-amber-300 font-mono text-xs">done</div>
            <div className="text-amber-400 font-mono text-lg font-bold">{stats.completed}</div>
          </div>
        </div>

        <div className="mb-4 space-y-3">
          <div>
            <div className="text-amber-300 font-mono text-xs mb-2">status</div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setUrl('status', 'all')}
                className={`font-mono text-xs px-3 py-2 border-2 rounded-2xl transition-all ${status === 'all' ? 'bg-amber-900/50 text-amber-200 border-amber-700 shadow-lg shadow-amber-950/30' : 'bg-black/50 text-amber-300/70 border-amber-900/30 hover:border-amber-800/50'}`}
              >
                all
              </button>
              <button
                onClick={() => setUrl('status', 'pending')}
                className={`font-mono text-xs px-3 py-2 border-2 rounded-2xl transition-all ${status === 'pending' ? 'bg-amber-900/50 text-amber-200 border-amber-700 shadow-lg shadow-amber-950/30' : 'bg-black/50 text-amber-300/70 border-amber-900/30 hover:border-amber-800/50'}`}
              >
                pending
              </button>
              <button
                onClick={() => setUrl('status', 'in_progress')}
                className={`font-mono text-xs px-3 py-2 border-2 rounded-2xl transition-all ${status === 'in_progress' ? 'bg-amber-900/50 text-amber-200 border-amber-700 shadow-lg shadow-amber-950/30' : 'bg-black/50 text-amber-300/70 border-amber-900/30 hover:border-amber-800/50'}`}
              >
                wip
              </button>
              <button
                onClick={() => setUrl('status', 'completed')}
                className={`font-mono text-xs px-3 py-2 border-2 rounded-2xl transition-all ${status === 'completed' ? 'bg-amber-900/50 text-amber-200 border-amber-700 shadow-lg shadow-amber-950/30' : 'bg-black/50 text-amber-300/70 border-amber-900/30 hover:border-amber-800/50'}`}
              >
                done
              </button>
              {user && (
                <button
                  onClick={() => setUrl('assignee', assignee === 'me' ? 'all' : 'me')}
                  className={`font-mono text-xs px-3 py-2 border-2 rounded-2xl transition-all ${assignee === 'me' ? 'bg-amber-900/50 text-amber-200 border-amber-700 shadow-lg shadow-amber-950/30' : 'bg-black/50 text-amber-300/70 border-amber-900/30 hover:border-amber-800/50'}`}
                >
                  mine
                </button>
              )}
            </div>
          </div>
          {allTypes.length > 0 && (
            <div>
              <div className="text-amber-300 font-mono text-xs mb-2">type</div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setUrl('type', 'all')}
                  className={`font-mono text-xs px-3 py-2 border-2 rounded-2xl transition-all ${type === 'all' ? 'bg-amber-900/50 text-amber-200 border-amber-700 shadow-lg shadow-amber-950/30' : 'bg-black/50 text-amber-300/70 border-amber-900/30 hover:border-amber-800/50'}`}
                >
                  all
                </button>
                {allTypes.map((t) => (
                  <button
                    key={t}
                    onClick={() => setUrl('type', t)}
                    className={`font-mono text-xs px-3 py-2 border-2 rounded-2xl transition-all ${type.toLowerCase() === t ? 'bg-amber-900/50 text-amber-200 border-amber-700 shadow-lg shadow-amber-950/30' : 'bg-black/50 text-amber-300/70 border-amber-900/30 hover:border-amber-800/50'}`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="text-amber-400/60 font-mono text-xs mb-3">
          {filtered.length} of {all.length}
        </div>

        {error && <div className="text-red-400 font-mono text-sm text-center mb-4">{error}</div>}

        {all.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-amber-400/60 font-mono text-sm">no assignments yet</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-amber-400/60 font-mono text-sm">nothing matches</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((a: Assignment) => (
              <Link
                key={a.id}
                href={`/admin/assignments/${a.id}/edit`}
                className="bg-gradient-to-br from-zinc-900/90 to-black/90 border-4 border-amber-900/40 p-4 rounded-3xl shadow-xl shadow-amber-950/20 block"
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-amber-400 font-mono text-sm font-bold truncate">
                      {a.projectName || `Ship #${a.shipCertId || a.id}`}
                    </div>
                    <div className="text-amber-300/60 font-mono text-xs">
                      {types(a).join(', ') || 'no type'} • by {a.author?.username || '?'}
                    </div>
                  </div>
                  <span
                    className={`font-mono text-xs px-2 py-1 rounded-xl border-2 ml-2 ${a.status === 'pending' ? 'bg-amber-900/30 text-amber-300 border-amber-700' : a.status === 'in_progress' ? 'bg-amber-800/30 text-amber-200 border-amber-600' : a.status === 'completed' ? 'bg-green-900/30 text-green-400 border-green-700' : 'bg-amber-900/30 text-amber-400 border-amber-700'}`}
                  >
                    {a.status === 'in_progress'
                      ? 'wip'
                      : a.status === 'completed'
                        ? 'done'
                        : a.status}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  <div>
                    <span className="text-amber-300/60">created:</span>{' '}
                    <span className="text-amber-200">{ago(a.createdAt)}</span>
                  </div>
                  <div>
                    <span className="text-amber-300/60">assigned:</span>{' '}
                    <span className={a.assignee ? 'text-green-400' : 'text-amber-300/60'}>
                      {a.assignee?.username || 'nobody'}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="hidden md:flex h-full">
        <div className="w-80 bg-grid bg-black/95 border-r border-amber-900/40 p-6 overflow-y-auto">
          <div className="mb-8 bg-gradient-to-br from-zinc-900/90 to-black/90 border-4 border-amber-900/40 rounded-3xl p-4 shadow-2xl shadow-amber-950/30">
            <Link
              href="/admin"
              className="text-amber-400 font-mono text-sm hover:text-amber-300 transition-colors mb-4 inline-block"
            >
              ← back to admin
            </Link>
            <h1 className="text-amber-400 text-xl font-mono mb-2">Assignments Dashboard</h1>
          </div>

          <div className="mb-8 bg-gradient-to-br from-zinc-900/90 to-black/90 border-4 border-amber-900/40 rounded-3xl p-4 shadow-2xl shadow-amber-950/30">
            <h2 className="text-amber-400 font-mono text-sm mb-4 border-b border-amber-900/40 pb-2">
              The Stats
            </h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-2 bg-black/50 border-2 border-amber-900/30 rounded-xl">
                <span className="text-amber-300/70 font-mono text-sm">Total Assigned:</span>
                <span className="text-amber-400 font-mono text-sm font-bold">{stats.total}</span>
              </div>
              <div className="flex justify-between items-center p-2 bg-black/50 border-2 border-amber-900/30 rounded-xl">
                <span className="text-amber-300/70 font-mono text-sm">Completed:</span>
                <span className="text-green-400 font-mono text-sm font-bold">
                  {stats.completed} (
                  {stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}%)
                </span>
              </div>
              <div className="flex justify-between items-center p-2 bg-black/50 border-2 border-amber-900/30 rounded-xl">
                <span className="text-amber-300/70 font-mono text-sm">Pending:</span>
                <span className="text-amber-300 font-mono text-sm font-bold">
                  {stats.pending} (
                  {stats.total > 0 ? Math.round((stats.pending / stats.total) * 100) : 0}%)
                </span>
              </div>
              <div className="flex justify-between items-center p-2 bg-black/50 border-2 border-amber-900/30 rounded-xl">
                <span className="text-amber-300/70 font-mono text-sm">In Progress:</span>
                <span className="text-amber-200 font-mono text-sm font-bold">
                  {stats.in_progress} (
                  {stats.total > 0 ? Math.round((stats.in_progress / stats.total) * 100) : 0}%)
                </span>
              </div>
            </div>
          </div>

          <div className="mb-8 bg-gradient-to-br from-zinc-900/90 to-black/90 border-4 border-amber-900/40 rounded-3xl p-4 shadow-2xl shadow-amber-950/30">
            <h2 className="text-amber-400 font-mono text-sm mb-4 border-b border-amber-900/40 pb-2">
              Filter by Status
            </h2>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setUrl('status', 'all')}
                className={`font-mono text-xs px-3 py-2 border-2 rounded-2xl transition-all ${
                  status === 'all'
                    ? 'bg-amber-900/50 text-amber-200 border-amber-700 shadow-lg shadow-amber-950/30'
                    : 'bg-black/50 text-amber-300/70 border-amber-900/30 hover:border-amber-800/50'
                }`}
              >
                All ({stats.total})
              </button>
              <button
                onClick={() => setUrl('status', 'pending')}
                className={`font-mono text-xs px-3 py-2 border-2 rounded-2xl transition-all ${
                  status === 'pending'
                    ? 'bg-amber-900/50 text-amber-200 border-amber-700 shadow-lg shadow-amber-950/30'
                    : 'bg-black/50 text-amber-300/70 border-amber-900/30 hover:border-amber-800/50'
                }`}
              >
                Pending ({stats.pending})
              </button>
              <button
                onClick={() => setUrl('status', 'in_progress')}
                className={`font-mono text-xs px-3 py-2 border-2 rounded-2xl transition-all ${
                  status === 'in_progress'
                    ? 'bg-amber-900/50 text-amber-200 border-amber-700 shadow-lg shadow-amber-950/30'
                    : 'bg-black/50 text-amber-300/70 border-amber-900/30 hover:border-amber-800/50'
                }`}
              >
                In Progress ({stats.in_progress})
              </button>
              <button
                onClick={() => setUrl('status', 'completed')}
                className={`font-mono text-xs px-3 py-2 border-2 rounded-2xl transition-all ${
                  status === 'completed'
                    ? 'bg-green-900/50 text-green-200 border-green-700 shadow-lg shadow-green-950/30'
                    : 'bg-black/50 text-amber-300/70 border-amber-900/30 hover:border-amber-800/50'
                }`}
              >
                Completed ({stats.completed})
              </button>
            </div>
          </div>

          {allTypes.length > 0 && (
            <div className="mb-8 bg-gradient-to-br from-zinc-900/90 to-black/90 border-4 border-amber-900/40 rounded-3xl p-4 shadow-2xl shadow-amber-950/30">
              <h2 className="text-amber-400 font-mono text-sm mb-4 border-b border-amber-900/40 pb-2">
                Filter by Type
              </h2>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setUrl('type', 'all')}
                  className={`font-mono text-xs px-3 py-2 border-2 rounded-2xl transition-all ${
                    type === 'all'
                      ? 'bg-amber-900/50 text-amber-200 border-amber-700 shadow-lg shadow-amber-950/30'
                      : 'bg-black/50 text-amber-300/70 border-amber-900/30 hover:border-amber-800/50'
                  }`}
                >
                  All types
                </button>
                {allTypes.map((t) => (
                  <button
                    key={t}
                    onClick={() => setUrl('type', t)}
                    className={`font-mono text-xs px-3 py-2 border-2 rounded-2xl transition-all ${
                      type.toLowerCase() === t
                        ? 'bg-amber-900/50 text-amber-200 border-amber-700 shadow-lg shadow-amber-950/30'
                        : 'bg-black/50 text-amber-300/70 border-amber-900/30 hover:border-amber-800/50'
                    }`}
                  >
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {user && (
            <div className="mb-8 bg-gradient-to-br from-zinc-900/90 to-black/90 border-4 border-amber-900/40 rounded-3xl p-4 shadow-2xl shadow-amber-950/30">
              <h2 className="text-amber-400 font-mono text-sm mb-4 border-b border-amber-900/40 pb-2">
                Filter by Assignee
              </h2>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setUrl('assignee', 'all')}
                  className={`font-mono text-xs px-3 py-2 border-2 rounded-2xl transition-all ${
                    assignee === 'all'
                      ? 'bg-amber-900/50 text-amber-200 border-amber-700 shadow-lg shadow-amber-950/30'
                      : 'bg-black/50 text-amber-300/70 border-amber-900/30 hover:border-amber-800/50'
                  }`}
                >
                  All assignments
                </button>
                <button
                  onClick={() => setUrl('assignee', 'me')}
                  className={`font-mono text-xs px-3 py-2 border-2 rounded-2xl transition-all ${
                    assignee === 'me'
                      ? 'bg-amber-900/50 text-amber-200 border-amber-700 shadow-lg shadow-amber-950/30'
                      : 'bg-black/50 text-amber-300/70 border-amber-900/30 hover:border-amber-800/50'
                  }`}
                >
                  Mine (
                  {all.filter((a: Assignment) => a.assignee?.username === user.username).length})
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-hidden bg-grid">
          <div className="h-full flex flex-col">
            <div className="bg-gradient-to-br from-zinc-900/90 to-black/90 border-4 border-amber-900/40 rounded-3xl p-6 m-4 mb-0 shadow-2xl shadow-amber-950/30">
              <h1 className="text-amber-400 font-mono text-lg mb-2">All Assignments</h1>
              <div className="text-amber-300/70 font-mono text-sm">
                Showing {filtered.length} of {all.length} assignments
              </div>
            </div>

            <div className="flex-1 overflow-auto p-4">
              {error && (
                <div className="text-red-400 font-mono text-sm text-center mb-4">{error}</div>
              )}

              {all.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-amber-400/60 font-mono text-sm mb-4">
                    no assignments yet, time to ship something!
                  </p>
                </div>
              ) : filtered.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-amber-400/60 font-mono text-sm">
                    no assignments match your filters
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filtered.map((a: Assignment) => (
                    <Link
                      key={a.id}
                      href={`/admin/assignments/${a.id}/edit`}
                      className="bg-gradient-to-br from-zinc-900/90 to-black/90 border-4 border-amber-900/40 rounded-3xl p-6 shadow-xl shadow-amber-950/20 cursor-pointer block"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <div className="text-amber-400 font-mono text-sm">
                            {a.projectName || `Ship #${a.shipCertId || a.id}`} •{' '}
                            {types(a).join(', ')}
                          </div>
                          <div className="text-amber-300/70 font-mono text-sm">
                            Created by: {a.author?.username || 'unknown'}
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <span
                            className={`font-mono text-xs px-3 py-1 rounded-xl border-2 ${
                              a.status === 'pending'
                                ? 'bg-amber-900/30 text-amber-300 border-amber-700'
                                : a.status === 'in_progress'
                                  ? 'bg-amber-800/30 text-amber-200 border-amber-600'
                                  : a.status === 'completed'
                                    ? 'bg-green-900/30 text-green-400 border-green-700'
                                    : 'bg-amber-900/30 text-amber-400 border-amber-700'
                            }`}
                          >
                            {a.status === 'in_progress' ? 'IN PROGRESS' : a.status.toUpperCase()}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-amber-300/70 font-mono">Created:</span>
                          <div className="text-amber-200 font-mono">
                            {new Date(a.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                        <div>
                          <span className="text-amber-300/70 font-mono">Last Updated:</span>
                          <div className="text-amber-200 font-mono">
                            {new Date(a.updatedAt).toLocaleDateString()}
                          </div>
                        </div>
                        <div>
                          <span className="text-amber-300/70 font-mono">Assigned to:</span>
                          <div className="text-green-400 font-mono">
                            {a.assignee?.username || 'unassigned'}
                          </div>
                        </div>
                        <div></div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}

export default function Assignments() {
  return (
    <Suspense
      fallback={
        <main className="bg-grid min-h-screen w-full flex items-center justify-center" role="main">
          <div className="text-amber-400 font-mono text-lg">loading assignments...</div>
        </main>
      }
    >
      <Content />
    </Suspense>
  )
}
