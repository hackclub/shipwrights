'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from 'recharts'

type WeekBucket = { weekStart: string; total: number; approved: number; rejected: number }

function formatWeek(weekStart: string) {
  const d = new Date(weekStart + 'T12:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  const p = payload[0].payload as WeekBucket
  return (
    <div className="bg-zinc-900 border-2 border-amber-600 rounded px-3 py-2 shadow-xl font-mono text-xs">
      <p className="text-amber-400 font-bold mb-1">{formatWeek(label)}</p>
      <p className="text-green-400">Approved: {p.approved}</p>
      <p className="text-red-400">Rejected: {p.rejected}</p>
      <p className="text-amber-100">Total: {p.total}</p>
    </div>
  )
}

export function ReviewsByWeekChart({ data }: { data: WeekBucket[] }) {
  if (!data.length) {
    return (
      <div className="h-64 flex items-center justify-center text-amber-500/60 font-mono text-sm">
        No reviews in the last 4 weeks
      </div>
    )
  }
  const axis = { stroke: '#78716c', style: { fontSize: '10px' } }
  return (
    <ResponsiveContainer width="100%" height={280} minWidth={0}>
      <BarChart data={data} margin={{ top: 10, right: 20, bottom: 50, left: 10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#78716c20" />
        <XAxis
          dataKey="weekStart"
          tickFormatter={formatWeek}
          {...axis}
          angle={-45}
          textAnchor="end"
          height={50}
        />
        <YAxis {...axis} width={28} />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(245,158,11,0.1)' }} />
        <Legend
          wrapperStyle={{ fontSize: '11px' }}
          formatter={() => <span className="font-mono text-amber-200/90">Approved / Rejected</span>}
        />
        <Bar
          dataKey="approved"
          stackId="a"
          fill="#22c55e"
          name="Approved"
          isAnimationActive={false}
        />
        <Bar
          dataKey="rejected"
          stackId="a"
          fill="#ef4444"
          name="Rejected"
          isAnimationActive={false}
        />
      </BarChart>
    </ResponsiveContainer>
  )
}

type SpotWeekBucket = { weekStart: string; passed: number; failed: number }

function SpotTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  const p = payload[0].payload as SpotWeekBucket
  return (
    <div className="bg-zinc-900 border-2 border-amber-600 rounded px-3 py-2 shadow-xl font-mono text-xs">
      <p className="text-amber-400 font-bold mb-1">{formatWeek(label)}</p>
      <p className="text-green-400">Passed: {p.passed}</p>
      <p className="text-red-400">Failed: {p.failed}</p>
    </div>
  )
}

export function SpotChecksByWeekChart({ data }: { data: SpotWeekBucket[] }) {
  if (!data.length) {
    return (
      <div className="h-40 flex items-center justify-center text-amber-500/60 font-mono text-sm">
        No spot checks in the last 12 weeks
      </div>
    )
  }
  const axis = { stroke: '#78716c', style: { fontSize: '10px' } }
  return (
    <ResponsiveContainer width="100%" height={200} minWidth={0}>
      <BarChart data={data} margin={{ top: 10, right: 20, bottom: 50, left: 10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#78716c20" />
        <XAxis
          dataKey="weekStart"
          tickFormatter={formatWeek}
          {...axis}
          angle={-45}
          textAnchor="end"
          height={50}
        />
        <YAxis {...axis} width={28} />
        <Tooltip content={<SpotTooltip />} cursor={{ fill: 'rgba(245,158,11,0.1)' }} />
        <Bar dataKey="passed" stackId="s" fill="#22c55e" name="Passed" isAnimationActive={false} />
        <Bar dataKey="failed" stackId="s" fill="#ef4444" name="Failed" isAnimationActive={false} />
      </BarChart>
    </ResponsiveContainer>
  )
}
