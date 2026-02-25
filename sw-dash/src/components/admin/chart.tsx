'use client'

import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'

interface Props {
  data: Array<{ date?: string; value: number; [key: string]: any }>
  type?: 'line' | 'bar'
  dataKey?: string
  xKey?: string
  yLabel?: string
  valueLabel?: string
  color?: string
}

const fmt = (s: string) => {
  const d = new Date(s)
  return `${d.toLocaleString('en-US', { month: 'short' })} ${d.getDate()}`
}

function Tip({ active, payload, xKey, valueLabel }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-zinc-900 border-2 border-amber-600 rounded px-3 py-2 shadow-xl">
      <p className="text-amber-400 text-xs font-mono mb-1 font-bold">
        {payload[0].payload[xKey] ? fmt(payload[0].payload[xKey]) : ''}
      </p>
      <p className="text-amber-100 text-base font-mono font-bold">
        {valueLabel}: {payload[0].value}
      </p>
    </div>
  )
}

const axis = { stroke: '#78716c', style: { fontSize: '10px' } }
const yAxis = { stroke: '#78716c', style: { fontSize: '11px' } }

export function Chart({
  data,
  type = 'line',
  dataKey = 'value',
  xKey = 'date',
  yLabel = 'Value',
  valueLabel = 'Value',
  color = '#f59e0b',
}: Props) {
  const tip = <Tip xKey={xKey} valueLabel={valueLabel} />
  const xaxis = (
    <XAxis
      dataKey={xKey}
      {...axis}
      tickFormatter={fmt}
      interval={0}
      angle={-45}
      textAnchor="end"
      height={60}
    />
  )
  const yaxis = (
    <YAxis
      {...yAxis}
      label={{ value: yLabel, angle: -90, position: 'insideLeft', fill: '#78716c', fontSize: 12 }}
    />
  )
  const grid = <CartesianGrid strokeDasharray="3 3" stroke="#78716c20" />
  const margin = { top: 10, right: 20, bottom: 60, left: 20 }

  return (
    <ResponsiveContainer width="100%" height={300} minWidth={0}>
      {type === 'line' ? (
        <LineChart data={data} margin={margin}>
          {grid}
          {xaxis}
          {yaxis}
          <Tooltip content={tip} cursor={false} />
          <Line
            type="monotone"
            dataKey={dataKey}
            stroke={color}
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      ) : (
        <BarChart data={data} margin={margin}>
          {grid}
          {xaxis}
          {yaxis}
          <Tooltip content={tip} cursor={false} />
          <Bar
            dataKey={dataKey}
            fill={color}
            activeBar={{ fill: color, opacity: 0.8, strokeWidth: 2, stroke: color }}
            isAnimationActive={false}
          />
        </BarChart>
      )}
    </ResponsiveContainer>
  )
}
