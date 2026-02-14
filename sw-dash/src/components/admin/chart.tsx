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
  data: Array<{ date?: string; label?: string; value: number; [key: string]: any }>
  type?: 'line' | 'bar'
  dataKey?: string
  xKey?: string
  yLabel?: string
  xLabel?: string
  valueLabel?: string
  color?: string
}

export function Chart({
  data,
  type = 'line',
  dataKey = 'value',
  xKey = 'date',
  yLabel = 'Value',
  xLabel = 'Date',
  valueLabel = 'Value',
  color = '#f59e0b',
}: Props) {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const month = date.toLocaleString('en-US', { month: 'short' })
    const day = date.getDate()
    return `${month} ${day}`
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null

    const date = payload[0].payload[xKey]
    const value = payload[0].value

    return (
      <div className="bg-zinc-900 border-2 border-amber-600 rounded px-3 py-2 shadow-xl">
        <p className="text-amber-400 text-xs font-mono mb-1 font-bold">
          {date ? formatDate(date) : ''}
        </p>
        <p className="text-amber-100 text-base font-mono font-bold">
          {valueLabel}: {value}
        </p>
      </div>
    )
  }

  const formatXAxis = (value: string) => {
    return formatDate(value)
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      {type === 'line' ? (
        <LineChart data={data} margin={{ top: 10, right: 20, bottom: 60, left: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#78716c20" />
          <XAxis
            dataKey={xKey}
            stroke="#78716c"
            style={{ fontSize: '10px' }}
            tickFormatter={formatXAxis}
            interval={0}
            angle={-45}
            textAnchor="end"
            height={60}
          />
          <YAxis
            stroke="#78716c"
            style={{ fontSize: '11px' }}
            label={{
              value: yLabel,
              angle: -90,
              position: 'insideLeft',
              fill: '#78716c',
              fontSize: 12,
            }}
          />
          <Tooltip content={<CustomTooltip />} cursor={false} />
          <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} dot={false} />
        </LineChart>
      ) : (
        <BarChart data={data} margin={{ top: 10, right: 20, bottom: 60, left: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#78716c20" />
          <XAxis
            dataKey={xKey}
            stroke="#78716c"
            style={{ fontSize: '10px' }}
            tickFormatter={formatXAxis}
            interval={0}
            angle={-45}
            textAnchor="end"
            height={60}
          />
          <YAxis
            stroke="#78716c"
            style={{ fontSize: '11px' }}
            label={{
              value: yLabel,
              angle: -90,
              position: 'insideLeft',
              fill: '#78716c',
              fontSize: 12,
            }}
          />
          <Tooltip content={<CustomTooltip />} cursor={false} />
          <Bar
            dataKey={dataKey}
            fill={color}
            activeBar={{ fill: color, opacity: 0.8, strokeWidth: 2, stroke: color }}
          />
        </BarChart>
      )}
    </ResponsiveContainer>
  )
}
