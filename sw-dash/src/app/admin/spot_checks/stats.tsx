'use client'

import { useEffect, useState } from 'react'

export default function Stats() {
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
      <div className="bg-gradient-to-br from-zinc-900/90 to-black/90 border-4 border-amber-900/40 rounded-3xl p-6 animate-pulse h-48"></div>
    )

  const { stats } = data

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
      <Card label="total checked" value={stats.total} />
      <Card label="left to check" value={stats.unchecked} />
      <Card
        label="fail rate"
        value={`${stats.failRate}%`}
        color={parseFloat(stats.failRate) > 10 ? 'text-red-400' : 'text-amber-400'}
      />
      <Card label="success rate" value={`${stats.successRate}%`} color="text-green-400" />
      <Card label="coverage" value={`${stats.checked}/${stats.checked + stats.unchecked}`} />
    </div>
  )
}

function Card({ label, value, color = 'text-amber-400' }: any) {
  return (
    <div className="bg-gradient-to-br from-zinc-900/90 to-black/90 border-4 border-amber-900/40 rounded-3xl p-6 shadow-xl">
      <h3 className="text-amber-500/70 font-mono text-xs uppercase tracking-wider mb-2">{label}</h3>
      <div className={`text-3xl font-bold font-mono ${color}`}>{value}</div>
    </div>
  )
}
