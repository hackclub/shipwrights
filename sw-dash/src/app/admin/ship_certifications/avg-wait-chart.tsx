'use client'

import { useState } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'

interface Props {
  avgQueueTime: string
  history: { date: string; avgWaitHours: number }[]
}

export function AvgWaitChart({ avgQueueTime, history }: Props) {
  const [open, setOpen] = useState(false)

  const formatDate = (date: string) => {
    const d = new Date(date)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const formatHours = (hours: number) => {
    const days = Math.floor(hours / 24)
    const h = hours % 24
    return days > 0 ? `${days}d ${h}h` : `${h}h`
  }

  return (
    <>
      <div
        onClick={() => setOpen(true)}
        className="cursor-pointer hover:bg-zinc-800/50 rounded-lg p-2 -m-2 transition-colors"
      >
        <div className="text-gray-500 font-mono text-xs mb-1 flex items-center gap-1">
          Avg wait
          <span className="text-amber-400/60 text-[10px]">▶</span>
        </div>
        <span className="text-xl font-bold font-mono text-white">{avgQueueTime}</span>
      </div>

      {open && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-zinc-900 border-2 border-amber-900/60 rounded-2xl p-6 w-full max-w-2xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-amber-400 font-mono text-lg">Avg Wait Time (Last 14 Days)</h2>
              <button
                onClick={() => setOpen(false)}
                className="text-gray-400 hover:text-white font-mono text-xl"
              >
                ×
              </button>
            </div>

            <div className="text-gray-400 font-mono text-sm mb-4">
              Average time from submission to review completion
            </div>

            {history.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={history} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={formatDate}
                      stroke="#666"
                      fontSize={12}
                      fontFamily="monospace"
                    />
                    <YAxis
                      tickFormatter={formatHours}
                      stroke="#666"
                      fontSize={12}
                      fontFamily="monospace"
                      width={50}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1a1a1a',
                        border: '1px solid #444',
                        borderRadius: '8px',
                        fontFamily: 'monospace',
                        fontSize: '12px',
                      }}
                      labelFormatter={formatDate}
                      formatter={(value) => [formatHours(Number(value ?? 0)), 'Avg Wait']}
                    />
                    <Line
                      type="monotone"
                      dataKey="avgWaitHours"
                      stroke="#f59e0b"
                      strokeWidth={2}
                      dot={{ fill: '#f59e0b', strokeWidth: 0, r: 4 }}
                      activeDot={{ r: 6, fill: '#fbbf24' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-gray-500 font-mono">
                No data available
              </div>
            )}

            <div className="mt-4 pt-4 border-t border-zinc-800 flex justify-between text-sm font-mono">
              <span className="text-gray-500">Current avg wait:</span>
              <span className="text-amber-400">{avgQueueTime}</span>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
