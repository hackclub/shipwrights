'use client'

import { useMemo, useState, useCallback } from 'react'

type DayData = { date: string; count: number }

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
const WEEKS = 12
const DAYS_PER_WEEK = 7

function toDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function formatWeekLabel(dateStr: string) {
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function monthLabelForWeek(weekStart: string, index: number, allWeekStarts: string[]): string {
  const d = new Date(weekStart + 'T12:00:00')
  if (index === 0) return d.toLocaleDateString('en-US', { month: 'short' })
  const prev = new Date(allWeekStarts[index - 1] + 'T12:00:00')
  if (d.getMonth() !== prev.getMonth()) return d.toLocaleDateString('en-US', { month: 'short' })
  return ''
}

export function ReviewActivityGrid({ data }: { data: DayData[] }) {
  const byDate = useMemo(() => {
    const m = new Map<string, number>()
    for (const { date, count } of data) m.set(date, count)
    return m
  }, [data])

  const { weekStarts, gridByWeek } = useMemo(() => {
    if (data.length === 0) {
      return {
        weekStarts: [] as string[],
        gridByWeek: [] as { weekStart: string; dayOfWeek: number; date: string; count: number }[][],
      }
    }
    const first = data[0].date
    const start = new Date(first + 'T12:00:00')
    const weekStarts: string[] = []
    const gridByWeek: { weekStart: string; dayOfWeek: number; date: string; count: number }[][] = []
    for (let w = 0; w < WEEKS; w++) {
      const weekStart = new Date(start)
      weekStart.setDate(start.getDate() + w * 7)
      const weekStartStr = toDateStr(weekStart)
      weekStarts.push(weekStartStr)
      const week: { weekStart: string; dayOfWeek: number; date: string; count: number }[] = []
      for (let d = 0; d < DAYS_PER_WEEK; d++) {
        const cellDate = new Date(weekStart)
        cellDate.setDate(weekStart.getDate() + d)
        const dateStr = toDateStr(cellDate)
        week.push({
          weekStart: weekStartStr,
          dayOfWeek: d,
          date: dateStr,
          count: byDate.get(dateStr) ?? 0,
        })
      }
      gridByWeek.push(week)
    }
    return { weekStarts, gridByWeek }
  }, [data, byDate])

  const [selectedWeekIndex, setSelectedWeekIndex] = useState(
    weekStarts.length > 0 ? weekStarts.length - 1 : 0
  )
  const [hoverCell, setHoverCell] = useState<{
    date: string
    count: number
    weekTotal: number
  } | null>(null)

  const selectedWeekStart = weekStarts[selectedWeekIndex] ?? null
  const weekTotals = useMemo(() => {
    const totals = new Map<string, number>()
    for (const week of gridByWeek) {
      let t = 0
      for (const cell of week) t += cell.count
      totals.set(week[0].weekStart, t)
    }
    return totals
  }, [gridByWeek])

  const totalReviews = useMemo(() => data.reduce((a, b) => a + b.count, 0), [data])

  const maxCount = useMemo(() => Math.max(1, ...data.map((d) => d.count)), [data])
  const colorFor = useCallback(
    (count: number) => {
      if (count <= 0) return 'bg-zinc-700/60'
      const level = Math.min(4, Math.ceil((count / maxCount) * 4))
      return ['bg-amber-900/70', 'bg-amber-700/80', 'bg-amber-600', 'bg-amber-500', 'bg-amber-400'][
        level
      ] as string
    },
    [maxCount]
  )

  if (weekStarts.length === 0) {
    return (
      <div className="font-mono text-amber-500/60 text-sm py-8 text-center">No activity data</div>
    )
  }

  const hoverLine =
    hoverCell != null
      ? `${hoverCell.count} review${hoverCell.count !== 1 ? 's' : ''} on ${hoverCell.date} · ${hoverCell.weekTotal} that week`
      : 'Hover a day for details'

  const selectedWeekTotal = selectedWeekStart != null ? (weekTotals.get(selectedWeekStart) ?? 0) : 0

  return (
    <div className="space-y-4">
      {/* Week selector + week-of + hover line */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setSelectedWeekIndex((i) => Math.max(0, i - 1))}
            className="p-1.5 rounded border border-amber-800/60 text-amber-400 hover:bg-amber-900/40 font-mono text-sm disabled:opacity-40 disabled:cursor-not-allowed"
            disabled={selectedWeekIndex <= 0}
            aria-label="Previous week"
          >
            ←
          </button>
          <button
            type="button"
            onClick={() => setSelectedWeekIndex((i) => Math.min(weekStarts.length - 1, i + 1))}
            className="p-1.5 rounded border border-amber-800/60 text-amber-400 hover:bg-amber-900/40 font-mono text-sm disabled:opacity-40 disabled:cursor-not-allowed"
            disabled={selectedWeekIndex >= weekStarts.length - 1}
            aria-label="Next week"
          >
            →
          </button>
        </div>
        <span className="font-mono text-amber-400 text-sm">
          Week of {selectedWeekStart != null ? formatWeekLabel(selectedWeekStart) : '—'}
        </span>
        <span className="font-mono text-amber-500/70 text-xs">
          {selectedWeekTotal} review{selectedWeekTotal !== 1 ? 's' : ''} that week
        </span>
        <span className="font-mono text-amber-500/50 text-xs ml-auto">{hoverLine}</span>
      </div>

      {/* Header row: empty corner + month labels at boundaries, clickable week cells */}
      <div
        className="grid gap-2 gap-y-0"
        style={{
          gridTemplateColumns: '2.5rem repeat(12, 2rem)',
        }}
      >
        <div />
        {weekStarts.map((weekStart, week) => {
          const monthLabel = monthLabelForWeek(weekStart, week, weekStarts)
          return (
            <button
              key={weekStart}
              type="button"
              onClick={() => setSelectedWeekIndex(week)}
              className={`
                font-mono text-[11px] px-0.5 py-0.5 rounded text-left overflow-visible whitespace-nowrap
                ${selectedWeekIndex === week ? 'text-amber-300 underline underline-offset-2' : 'text-amber-500/60 hover:text-amber-400'}
              `}
              title={`Week of ${formatWeekLabel(weekStart)}`}
            >
              {monthLabel}
            </button>
          )
        })}
      </div>

      {/* Grid: 7 rows (days) × 12 columns (weeks) */}
      <div
        className="grid gap-2 gap-y-2"
        style={{
          gridTemplateColumns: '2.5rem repeat(12, 2rem)',
        }}
      >
        {DAY_LABELS.map((label, dayOfWeek) => (
          <div key={label + dayOfWeek} className="contents">
            <div className="font-mono text-[11px] text-amber-500/60 flex items-center justify-center">
              {label}
            </div>
            {gridByWeek.map((week, weekIdx) => {
              const cell = week[dayOfWeek]
              if (!cell) return <div key={`${weekIdx}-${dayOfWeek}`} />
              const weekTotal = weekTotals.get(cell.weekStart) ?? 0
              const isSelected = selectedWeekIndex === weekIdx
              return (
                <button
                  key={`${weekIdx}-${dayOfWeek}`}
                  type="button"
                  className={`
                    w-5 h-5 rounded flex-shrink-0 transition-colors
                    ${colorFor(cell.count)}
                    ${isSelected ? 'ring-2 ring-amber-400 ring-offset-1 ring-offset-zinc-900' : ''}
                  `}
                  onClick={() => setSelectedWeekIndex(weekIdx)}
                  onMouseEnter={() =>
                    setHoverCell({ date: cell.date, count: cell.count, weekTotal })
                  }
                  onMouseLeave={() => setHoverCell(null)}
                  title={`${cell.count} on ${cell.date}`}
                  aria-label={`${cell.count} reviews on ${cell.date}`}
                />
              )
            })}
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-mono text-xs text-amber-500/70">
          {totalReviews} review{totalReviews !== 1 ? 's' : ''} in 12 weeks
        </span>
        <span className="font-mono text-[11px] text-amber-500/50 flex items-center gap-2">
          <span>Less</span>
          <span className="flex gap-0.5">
            {[0, 1, 2, 3, 4].map((i) => (
              <span
                key={i}
                className={`w-3 h-3 rounded ${colorFor(i === 0 ? 0 : Math.ceil((i / 4) * maxCount) || 1)}`}
                aria-hidden
              />
            ))}
          </span>
          <span>More</span>
        </span>
      </div>
    </div>
  )
}
