'use client'

interface Props {
  label: string
  value: string | number
  delta?: number
  trend?: 'up' | 'down' | 'neutral'
  color?: string
}

export function StatsCard({ label, value, delta, trend, color = 'amber' }: Props) {
  let trendColor = 'text-gray-400'
  let trendIcon = '→'

  if (trend === 'up') {
    trendColor = 'text-green-400'
    trendIcon = '↗'
  } else if (trend === 'down') {
    trendColor = 'text-red-400'
    trendIcon = '↘'
  }

  const colorMap: Record<string, { border: string; label: string; value: string }> = {
    amber: { border: 'border-amber-800/30', label: 'text-amber-500/70', value: 'text-amber-100' },
    cyan: { border: 'border-cyan-700/30', label: 'text-cyan-400/70', value: 'text-cyan-100' },
    purple: {
      border: 'border-purple-700/30',
      label: 'text-purple-400/70',
      value: 'text-purple-100',
    },
  }

  const colors = colorMap[color] || colorMap.amber

  return (
    <div className={`bg-zinc-900/50 border-2 ${colors.border} rounded-xl p-4 shadow-lg`}>
      <div className={`${colors.label} text-xs font-mono uppercase mb-2`}>{label}</div>
      <div className="flex items-baseline gap-2">
        <div className={`text-3xl font-bold ${colors.value}`}>{value}</div>
        {delta !== undefined && (
          <div className={`text-sm font-mono ${trendColor}`}>
            {trendIcon} {delta > 0 ? '+' : ''}
            {delta}%
          </div>
        )}
      </div>
    </div>
  )
}
