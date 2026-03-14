'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'

type Checker = {
  id: number
  username: string
  avatar: string | null
  total: number
  approved: number
  rejected: number
}

export default function SpotCheckLeaderboard() {
  const [data, setData] = useState<{ topCheckers: Checker[] } | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    fetch('/api/admin/spot_checks/stats')
      .then((r) => r.json())
      .then(setData)
      .catch(() => setError(true))
  }, [])

  if (error)
    return (
      <div className="bg-gradient-to-br from-red-900/20 to-black/90 border-4 border-red-900/40 rounded-3xl p-6 font-mono text-red-400">
        load failed
      </div>
    )
  if (!data)
    return (
      <div className="bg-gradient-to-br from-zinc-900/90 to-black/90 border-4 border-amber-900/40 rounded-3xl p-6 animate-pulse h-48" />
    )

  const { topCheckers } = data
  if (topCheckers.length === 0)
    return (
      <div className="bg-gradient-to-br from-zinc-900/90 to-black/90 border-4 border-amber-900/40 rounded-3xl p-6 font-mono text-amber-500/70">
        No spot checks yet — leaderboard will appear here.
      </div>
    )

  return (
    <div className="bg-gradient-to-br from-zinc-900/90 to-black/90 border-4 border-amber-900/40 rounded-3xl p-6 shadow-xl">
      <h3 className="text-amber-500/70 font-mono text-xs uppercase tracking-wider mb-4">
        Top spot checkers
      </h3>
      <ul className="space-y-2">
        {topCheckers.map((c, i) => (
          <li
            key={c.id}
            className="flex items-center gap-3 py-2 px-3 rounded-xl bg-zinc-900/50 border border-amber-900/20 hover:border-amber-800/40 transition-colors"
          >
            <span className="font-mono text-amber-500/80 w-6 text-sm tabular-nums">#{i + 1}</span>
            {c.avatar ? (
              <Image
                src={c.avatar}
                alt=""
                width={32}
                height={32}
                className="w-8 h-8 rounded-full flex-shrink-0"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-amber-900/40 flex-shrink-0" />
            )}
            <span className="font-mono text-amber-200 text-sm font-medium truncate flex-1 min-w-0">
              {c.username}
            </span>
            <span className="font-mono text-amber-400 text-sm font-bold tabular-nums">
              {c.total}
            </span>
            <span className="font-mono text-xs text-amber-500/70">
              ({c.approved} pass · {c.rejected} fail)
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
