'use client'

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

interface Commit {
  sha: string
  msg: string
  author: string
  adds: number
  dels: number
  ts: Date
}

interface Props {
  commits: Commit[]
}

export function CommitChart({ commits }: Props) {
  if (!commits.length) {
    return <div className="text-gray-500 font-mono text-xs">no commits</div>
  }

  const sorted = [...commits].sort((a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime())

  const grouped = sorted.reduce(
    (acc, c) => {
      const day = new Date(c.ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      if (!acc[day]) acc[day] = { adds: 0, dels: 0 }
      acc[day].adds += c.adds
      acc[day].dels += c.dels
      return acc
    },
    {} as Record<string, { adds: number; dels: number }>
  )

  const data = Object.entries(grouped).map(([name, { adds, dels }]) => ({ name, adds, dels }))

  const totalAdds = commits.reduce((s, c) => s + c.adds, 0)
  const totalDels = commits.reduce((s, c) => s + c.dels, 0)

  if (data.length === 1) {
    return (
      <div className="space-y-3">
        <div className="flex gap-4 text-xs font-mono">
          <span className="text-green-400">+{totalAdds}</span>
          <span className="text-red-400">-{totalDels}</span>
          <span className="text-gray-400">{commits.length} commits</span>
        </div>
        <div className="h-20 flex items-center justify-center border border-zinc-700 rounded-lg">
          <div className="text-center font-mono">
            <div className="text-gray-400 text-xs">{data[0].name}</div>
            <div className="flex gap-4 mt-1">
              <span className="text-green-400 text-sm">+{data[0].adds}</span>
              <span className="text-red-400 text-sm">-{data[0].dels}</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-4 text-xs font-mono">
        <span className="text-green-400">+{totalAdds}</span>
        <span className="text-red-400">-{totalDels}</span>
        <span className="text-gray-400">{commits.length} commits</span>
      </div>
      <div className="h-32 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ left: 0, right: 10, top: 5, bottom: 5 }}>
            <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#888' }} />
            <YAxis tick={{ fontSize: 10, fill: '#888' }} width={35} />
            <Tooltip
              contentStyle={{
                background: '#18181b',
                border: '1px solid #3f3f46',
                borderRadius: 8,
                fontSize: 12,
              }}
              labelStyle={{ color: '#a1a1aa' }}
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="adds"
              stroke="#22c55e"
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 5, strokeWidth: 2 }}
            />
            <Line
              type="monotone"
              dataKey="dels"
              stroke="#ef4444"
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 5, strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
