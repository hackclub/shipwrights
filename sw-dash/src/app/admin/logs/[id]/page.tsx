'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'

interface LogDetail {
  id: string
  timestamp: string
  user: {
    id: number
    username: string
    avatar: string | null
    role: string
  } | null
  action: string
  model: string | null
  recordId: number | null
  context: string | null
  status: number
  severity: string | null
  req: {
    method: string
    url: string
    body: any
    headers: any
  } | null
  res: {
    status: number
    body: any
    headers: any
  } | null
  error: {
    name: string
    message: string
    stack: string | null
  } | null
  changes: Record<string, { before: any; after: any }> | null
  meta: any
}

export default function LogDetail({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const [log, setLog] = useState<LogDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const { id } = use(params)

  useEffect(() => {
    load()
  }, [id])

  const load = async () => {
    try {
      const res = await fetch(`/api/admin/logs/${id}`)
      if (!res.ok) {
        if (res.status === 403) {
          router.push('/')
          return
        }
        throw new Error('fetch failed')
      }
      const data = await res.json()
      setLog(data)
    } catch {
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <main className="bg-grid min-h-screen w-full flex items-center justify-center">
        <div className="text-amber-400 font-mono">loading...</div>
      </main>
    )
  }

  if (!log) {
    return (
      <main className="bg-grid min-h-screen w-full flex items-center justify-center">
        <div className="text-red-400 font-mono">log not found</div>
      </main>
    )
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

  return (
    <main className="bg-grid min-h-screen w-full p-4 md:p-8">
      <div className="w-full">
        <Link
          href="/admin/logs"
          className="text-amber-300/70 hover:text-amber-200 font-mono text-sm mb-6 inline-block"
        >
          ← back
        </Link>

        <div className="bg-gradient-to-br from-zinc-900/90 to-black/90 border-4 border-amber-900/40 rounded-2xl p-6 mb-6">
          <h2 className="text-xl font-bold text-amber-400 mb-4">event info</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-amber-300/60 font-mono text-sm">timestamp</span>
              <span className="text-amber-200 font-mono text-sm">
                {new Date(log.timestamp).toLocaleString()}
              </span>
            </div>
            {log.user && (
              <div className="flex items-center justify-between">
                <span className="text-amber-300/60 font-mono text-sm">user</span>
                <div className="flex items-center gap-2">
                  {log.user.avatar && (
                    <Image
                      src={log.user.avatar}
                      alt=""
                      width={24}
                      height={24}
                      className="rounded-full"
                    />
                  )}
                  <span className="text-amber-200 font-mono text-sm">{log.user.username}</span>
                  <span className="bg-purple-900/30 text-purple-400 border border-purple-700/50 font-mono text-xs px-2 py-1 rounded-lg">
                    {log.user.role}
                  </span>
                </div>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-amber-300/60 font-mono text-sm">action</span>
              <span
                className={`font-mono text-xs px-2 py-1 rounded-lg border ${badge(log.action)}`}
              >
                {log.action}
              </span>
            </div>
            {log.severity && (
              <div className="flex items-center justify-between">
                <span className="text-amber-300/60 font-mono text-sm">severity</span>
                <span
                  className={`font-mono text-xs px-2 py-1 rounded-lg border ${
                    log.severity === 'error' || log.severity === 'critical'
                      ? 'bg-red-900/30 text-red-400 border-red-700/50'
                      : log.severity === 'warn'
                        ? 'bg-amber-900/30 text-amber-400 border-amber-700/50'
                        : 'bg-gray-900/30 text-gray-400 border-gray-700/50'
                  }`}
                >
                  {log.severity}
                </span>
              </div>
            )}
            {log.model && (
              <div className="flex items-center justify-between">
                <span className="text-amber-300/60 font-mono text-sm">model</span>
                <span className="bg-pink-900/30 text-pink-400 border border-pink-700/50 font-mono text-xs px-2 py-1 rounded-lg">
                  {log.model}
                </span>
              </div>
            )}
            {log.recordId && (
              <div className="flex items-center justify-between">
                <span className="text-amber-300/60 font-mono text-sm">record id</span>
                <span className="text-cyan-400 font-mono text-sm">#{log.recordId}</span>
              </div>
            )}
            {log.context && (
              <div className="flex items-start justify-between">
                <span className="text-amber-300/60 font-mono text-sm">context</span>
                <span className="text-amber-200 font-mono text-sm max-w-xl text-right">
                  {log.context}
                </span>
              </div>
            )}
          </div>
        </div>

        {log.changes && Object.keys(log.changes).length > 0 && (
          <div className="bg-gradient-to-br from-zinc-900/90 to-black/90 border-4 border-amber-900/40 rounded-2xl p-6 mb-6">
            <h2 className="text-xl font-bold text-amber-400 mb-4">changes</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b-2 border-amber-900/40">
                  <tr>
                    <th className="text-left p-3 text-amber-400 font-mono text-sm">field</th>
                    <th className="text-left p-3 text-amber-400 font-mono text-sm">before</th>
                    <th className="text-left p-3 text-amber-400 font-mono text-sm">after</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(log.changes).map(([field, { before, after }]) => (
                    <tr key={field} className="border-b border-amber-900/20">
                      <td className="p-3 text-amber-300/60 font-mono text-xs">{field}</td>
                      <td className="p-3">
                        <span className="bg-zinc-800 text-amber-300/80 font-mono text-xs px-2 py-1 rounded border border-amber-900/30">
                          {JSON.stringify(before)}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className="bg-zinc-800 text-amber-300/80 font-mono text-xs px-2 py-1 rounded border border-amber-900/30">
                          {JSON.stringify(after)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {log.meta && Object.keys(log.meta).length > 0 && (
          <div className="bg-gradient-to-br from-zinc-900/90 to-black/90 border-4 border-amber-900/40 rounded-2xl p-6 mb-6">
            <h2 className="text-xl font-bold text-amber-400 mb-4">metadata</h2>
            <pre className="bg-zinc-950/50 text-amber-200 font-mono text-xs p-4 rounded-xl overflow-x-auto">
              {JSON.stringify(log.meta, null, 2)}
            </pre>
          </div>
        )}

        {log.req && (
          <div className="bg-gradient-to-br from-zinc-900/90 to-black/90 border-4 border-amber-900/40 rounded-2xl p-6 mb-6">
            <h2 className="text-xl font-bold text-amber-400 mb-4">request</h2>
            <div className="space-y-4">
              <div>
                <span className="text-amber-300/60 font-mono text-sm block mb-1">method & url</span>
                <span className="text-amber-200 font-mono text-sm">
                  {log.req.method} {log.req.url}
                </span>
              </div>
              {log.req.body && (
                <div>
                  <span className="text-amber-300/60 font-mono text-sm block mb-1">body</span>
                  <pre className="bg-zinc-950/50 text-amber-200 font-mono text-xs p-4 rounded-xl overflow-x-auto">
                    {JSON.stringify(log.req.body, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        )}

        {log.res && (
          <div className="bg-gradient-to-br from-zinc-900/90 to-black/90 border-4 border-amber-900/40 rounded-2xl p-6 mb-6">
            <h2 className="text-xl font-bold text-amber-400 mb-4">response</h2>
            <div className="space-y-4">
              <div>
                <span className="text-amber-300/60 font-mono text-sm block mb-1">status</span>
                <span className="text-amber-200 font-mono text-sm">{log.res.status}</span>
              </div>
              {log.res.body && (
                <div>
                  <span className="text-amber-300/60 font-mono text-sm block mb-1">body</span>
                  <pre className="bg-zinc-950/50 text-amber-200 font-mono text-xs p-4 rounded-xl overflow-x-auto">
                    {JSON.stringify(log.res.body, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        )}

        {log.error && (
          <div className="bg-gradient-to-br from-red-900/20 to-black/90 border-4 border-red-900/40 rounded-2xl p-6 mb-6">
            <h2 className="text-xl font-bold text-red-400 mb-4">error</h2>
            <div className="space-y-3">
              <div>
                <span className="text-red-300/60 font-mono text-sm block mb-1">name</span>
                <span className="text-red-200 font-mono text-sm">{log.error.name}</span>
              </div>
              <div>
                <span className="text-red-300/60 font-mono text-sm block mb-1">message</span>
                <span className="text-red-200 font-mono text-sm">{log.error.message}</span>
              </div>
              {log.error.stack && (
                <div>
                  <span className="text-red-300/60 font-mono text-sm block mb-1">stack trace</span>
                  <pre className="bg-zinc-950/50 text-red-200 font-mono text-xs p-4 rounded-xl overflow-x-auto">
                    {log.error.stack}
                  </pre>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
