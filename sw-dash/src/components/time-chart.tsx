'use client'

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

interface Devlog {
  id: string
  ftDevlogId: string
  origSecs: number
}

interface Props {
  devlogs: Devlog[]
}

export function TimeChart({ devlogs }: Props) {
  if (!devlogs.length) return null

  const data = devlogs.map((d) => ({
    name: `#${d.ftDevlogId}`,
    hours: +(d.origSecs / 3600).toFixed(2),
  }))

  return (
    <div className="h-48 w-full mt-4">
      <div className="text-purple-400 font-mono text-xs mb-3">Time per devlog (hours)</div>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ left: 10, right: 20, top: 5, bottom: 5 }}>
          <XAxis type="number" tick={{ fontSize: 10, fill: '#888' }} />
          <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: '#888' }} width={70} />
          <Tooltip
            contentStyle={{
              background: '#18181b',
              border: '1px solid #3f3f46',
              borderRadius: 8,
              fontSize: 12,
            }}
            labelStyle={{ color: '#a1a1aa' }}
            formatter={(val) => [`${val ?? 0}h`, 'Time']}
            cursor={false}
          />
          <Bar
            dataKey="hours"
            radius={[0, 4, 4, 0]}
            fill="#dc2626"
            activeBar={{ fill: '#f87171' }}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
