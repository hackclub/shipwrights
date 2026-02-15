'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'

export default function Profile({ userId }: { userId: string }) {
  const [data, setData] = useState<any>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    fetch(`/api/admin/spot_checks/user/${userId}`)
      .then((r) => r.json())
      .then(setData)
      .catch(() => setError(true))
  }, [userId])

  if (error)
    return (
      <div className="bg-gradient-to-br from-red-900/20 to-black/90 border-4 border-red-900/40 rounded-3xl p-6 font-mono text-red-400">
        shit broke
      </div>
    )
  if (!data)
    return (
      <div className="bg-gradient-to-br from-zinc-900/90 to-black/90 border-4 border-amber-900/40 rounded-3xl p-6 animate-pulse h-96"></div>
    )

  const { user, stats, cases } = data

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="space-y-6">
        <div className="bg-gradient-to-br from-zinc-900/90 to-black/90 border-4 border-amber-900/40 rounded-3xl p-6 shadow-2xl text-center">
          {user.avatar && (
            <div className="flex justify-center mb-4">
              <Image
                src={user.avatar}
                alt=""
                width={96}
                height={96}
                className="w-24 h-24 rounded"
              />
            </div>
          )}
          <h1 className="text-2xl font-mono font-bold text-amber-200 mb-1">{user.username}</h1>
          <p className="text-amber-500/60 font-mono text-xs uppercase tracking-wider mb-6">
            {user.role}
          </p>

          <Link
            href={`/admin/spot_checks/${user.id}/review`}
            className="block w-full bg-blue-500/10 border-2 border-dashed border-blue-600 hover:border-blue-400 text-blue-400 hover:text-blue-300 font-mono text-sm px-4 py-3 rounded-2xl transition-all hover:bg-blue-500/20 hover:scale-[1.02] active:scale-[0.98]"
          >
            start spot check
          </Link>
        </div>

        <div className="bg-gradient-to-br from-zinc-900/90 to-black/90 border-4 border-amber-900/40 rounded-3xl p-6 shadow-2xl">
          <h3 className="font-mono font-bold text-amber-500 mb-4">stats</h3>

          <Stat label="reviews done" value={stats.reviewed} />
          <Stat label="spot checked" value={stats.checked} />
          <Stat label="passed" value={stats.passed} color="text-green-400" />
          <Stat label="failed" value={stats.failed} color="text-red-400" />

          <div className="mt-6 pt-4 border-t border-amber-900/20 text-center">
            <div className="text-4xl font-bold font-mono text-amber-400">{stats.passRate}%</div>
            <div className="text-xs text-amber-500/50 font-mono uppercase tracking-wider">
              pass rate
            </div>
          </div>
        </div>
      </div>

      <div className="lg:col-span-2 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-mono font-bold text-amber-400">cases</h2>
          <span className="bg-amber-900/30 text-amber-400 px-3 py-1 rounded-full text-xs font-mono font-bold">
            {cases.length} total
          </span>
        </div>

        {cases.length === 0 ? (
          <div className="bg-gradient-to-br from-zinc-900/90 to-black/90 border-4 border-amber-900/40 rounded-3xl p-12 text-center shadow-2xl">
            <h3 className="text-xl font-mono font-bold text-amber-400 mb-2">no cases</h3>
            <p className="text-amber-300/50 font-mono text-sm">clean record so far</p>
          </div>
        ) : (
          <div className="space-y-4">
            {cases.map((c: any) => (
              <Case key={c.id} c={c} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function Stat({ label, value, color = 'text-amber-300' }: any) {
  return (
    <div className="flex justify-between items-center pb-3 mb-3 border-b border-amber-900/20">
      <span className="font-mono text-sm text-amber-500/60">{label}</span>
      <span className={`font-mono text-lg font-bold ${color}`}>{value}</span>
    </div>
  )
}

function Case({ c }: { c: any }) {
  const fmt = (d: string) =>
    new Date(d).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })

  return (
    <Link
      href={`/admin/spot_checks/case/${c.caseId}`}
      className="block bg-gradient-to-br from-zinc-900/80 to-black/80 border-2 border-red-900/30 rounded-2xl p-4 md:p-6 hover:bg-zinc-900/60 transition-all hover:border-red-700/50 shadow-lg hover:scale-[1.01]"
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="font-mono text-red-400 font-bold text-sm">{c.caseId}</span>
            <span
              className={`px-2 py-0.5 rounded text-xs uppercase font-mono font-bold ${
                c.status === 'resolved'
                  ? 'bg-green-500/20 text-green-400'
                  : 'bg-red-500/20 text-red-400'
              }`}
            >
              {c.status}
            </span>
          </div>
          <div className="font-mono text-amber-200 font-bold">{c.project || 'unknown'}</div>
        </div>
        <div className="text-right font-mono text-xs text-amber-500/50">
          <div>{fmt(c.created)}</div>
          <div>by {c.staff}</div>
        </div>
      </div>

      <p className="font-mono text-amber-300/60 text-sm line-clamp-2">{c.why}</p>
    </Link>
  )
}
