'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'

export default function List() {
  const [data, setData] = useState<any>(null)
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
      <div className="bg-gradient-to-br from-zinc-900/90 to-black/90 border-4 border-amber-900/40 rounded-3xl p-6 animate-pulse h-64"></div>
    )

  const { wrights } = data

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {wrights.map((w: any) => (
        <Card key={w.id} w={w} />
      ))}
    </div>
  )
}

function Card({ w }: { w: any }) {
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
      href={`/admin/spot_checks/${w.id}`}
      className="block bg-gradient-to-br from-zinc-900/80 to-black/80 border-2 border-amber-900/30 rounded-2xl p-4 hover:bg-zinc-900/60 transition-all hover:border-amber-700/50 shadow-lg hover:scale-[1.01]"
    >
      <div className="flex items-center gap-3 mb-4">
        {w.avatar && (
          <Image src={w.avatar} alt="" width={40} height={40} className="w-10 h-10 rounded" />
        )}
        <div className="min-w-0 flex-1">
          <div className="font-mono text-amber-200 text-sm truncate font-bold">{w.username}</div>
          <div className="font-mono text-xs text-amber-500/50 uppercase tracking-wider">
            {w.role}
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Stat label="certs done" value={w.reviewed} />
        <Stat label="spot checked" value={w.checked} />
        <Stat
          label="fail rate"
          value={`${w.failRate}%`}
          color={parseFloat(w.failRate) > 10 ? 'text-red-400' : 'text-green-400'}
        />
        <Stat label="success rate" value={`${w.successRate}%`} color="text-green-400" />
        <Stat
          label="cases open"
          value={w.casesOpen}
          color={w.casesOpen > 0 ? 'text-red-400' : 'text-amber-300'}
        />
        <Stat label="cases closed" value={w.casesClosed} color="text-green-400" />

        <div className="pt-2 border-t border-amber-900/20">
          <div className="font-mono text-xs text-amber-500/50">last check</div>
          <div className="font-mono text-xs text-amber-300/80">
            {w.lastCheck ? (
              <>
                {fmt(w.lastCheck)}
                {w.lastCheckBy && <div className="text-amber-500/60">by {w.lastCheckBy}</div>}
              </>
            ) : (
              'never'
            )}
          </div>
        </div>
      </div>
    </Link>
  )
}

function Stat({ label, value, color = 'text-amber-300' }: any) {
  return (
    <div className="flex justify-between items-center">
      <span className="font-mono text-xs text-amber-500/50">{label}</span>
      <span className={`font-mono text-sm font-bold ${color}`}>{value}</span>
    </div>
  )
}
