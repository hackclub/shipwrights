'use client'

import { useEffect, useState } from 'react'
import { StatsCard } from '@/components/admin/stats-card'
import { Chart } from '@/components/admin/chart'

interface AnalyticsData {
  certs: {
    total: number
    approved: number
    rejected: number
    pending: number
    approvalRate: number
    decisionsToday: number
    newToday: number
    avgQueue: string
    leaderboard: Array<{ name: string; count: number }>
    trend: Array<{ date: string; avgWaitHours: number }>
    decisionsPerDay: Array<{ date: string; decisions: number }>
    approvalRatePerDay: Array<{ date: string; rate: number }>
  }
  ysws: {
    total: number
    pending: number
    done: number
    returned: number
    hoursApproved: number
    hoursRejected: number
    hoursReduced: number
    avgHang: number
    leaderboard: Array<{ name: string; count: number }>
    trend: Array<{ date: string; count: number }>
  }
  tickets: {
    total: number
    open: number
    closed: number
    trend: Array<{ date: string; count: number }>
  }
}

export function AnalyticsView() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/analytics')
      .then((r) => r.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-amber-400 font-mono">loading stats...</div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-red-400 font-mono">failed to load analytics</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-zinc-900/30 border-2 border-amber-700/20 rounded-2xl p-6">
          <h2 className="text-amber-500 font-mono text-xl mb-6">Ship Certifications</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <StatsCard label="Total Judged" value={data.certs.total} />
            <StatsCard label="Pending" value={data.certs.pending} />
            <StatsCard label="Approval Rate" value={`${data.certs.approvalRate}%`} />
            <StatsCard label="Avg Queue" value={data.certs.avgQueue} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <StatsCard label="Decisions Today" value={data.certs.decisionsToday} />
            <StatsCard label="New Today" value={data.certs.newToday} />
          </div>

          {data.certs.trend && data.certs.trend.length > 0 && (
            <div className="bg-zinc-900/50 border-2 border-amber-800/30 rounded-xl p-6 mb-6">
              <h3 className="text-amber-500/70 text-sm font-mono uppercase mb-4">Avg Wait Time</h3>
              <Chart
                data={data.certs.trend.map((t) => ({ ...t, value: t.avgWaitHours }))}
                type="line"
                dataKey="value"
                xKey="date"
                yLabel="Hours"
                xLabel="Date"
                valueLabel="Avg Wait (hrs)"
              />
            </div>
          )}

          <div className="grid grid-cols-1 gap-6 mb-6">
            {data.certs.decisionsPerDay && data.certs.decisionsPerDay.length > 0 && (
              <div className="bg-zinc-900/50 border-2 border-amber-800/30 rounded-xl p-6">
                <h3 className="text-amber-500/70 text-sm font-mono uppercase mb-4">
                  Daily Decisions
                </h3>
                <Chart
                  data={data.certs.decisionsPerDay.map((d) => ({ ...d, value: d.decisions }))}
                  type="bar"
                  dataKey="value"
                  xKey="date"
                  yLabel="Count"
                  xLabel="Date"
                  valueLabel="Decisions"
                />
              </div>
            )}

            {data.certs.approvalRatePerDay && data.certs.approvalRatePerDay.length > 0 && (
              <div className="bg-zinc-900/50 border-2 border-amber-800/30 rounded-xl p-6">
                <h3 className="text-amber-500/70 text-sm font-mono uppercase mb-4">
                  Approval Rate
                </h3>
                <Chart
                  data={data.certs.approvalRatePerDay.map((d) => ({ ...d, value: d.rate }))}
                  type="line"
                  dataKey="value"
                  xKey="date"
                  yLabel="Percent"
                  xLabel="Date"
                  valueLabel="Rate"
                />
              </div>
            )}
          </div>

          {data.certs.leaderboard.length > 0 && (
            <div className="bg-zinc-900/50 border-2 border-amber-800/30 rounded-xl p-6">
              <h3 className="text-amber-500/70 text-sm font-mono uppercase mb-4">Top Reviewers</h3>
              <div className="space-y-2">
                {data.certs.leaderboard.map((user, i) => (
                  <div
                    key={user.name}
                    className="flex items-center justify-between py-2 border-b border-amber-900/20 last:border-0"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-amber-500 font-mono text-sm w-6">#{i + 1}</span>
                      <span className="text-amber-100 font-mono">{user.name}</span>
                    </div>
                    <span className="text-amber-400 font-mono text-sm">{user.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="bg-zinc-900/30 border-2 border-cyan-600/30 rounded-2xl p-6">
          <h2 className="text-cyan-400 font-mono text-xl mb-6">YSWS Reviews</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <StatsCard label="Total" value={data.ysws.total} color="cyan" />
            <StatsCard label="Pending" value={data.ysws.pending} color="cyan" />
            <StatsCard label="Done" value={data.ysws.done} color="cyan" />
            <StatsCard label="Returned" value={data.ysws.returned} color="cyan" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <StatsCard label="Hours Approved" value={data.ysws.hoursApproved} color="cyan" />
            <StatsCard label="Hours Rejected" value={data.ysws.hoursRejected} color="cyan" />
            <StatsCard label="Hours Reduced" value={data.ysws.hoursReduced} color="cyan" />
          </div>

          <div className="mb-6">
            <StatsCard label="Avg Turnaround" value={`${data.ysws.avgHang}h`} color="cyan" />
          </div>

          {data.ysws.trend && data.ysws.trend.length > 0 && (
            <div className="bg-zinc-900/50 border-2 border-cyan-700/30 rounded-xl p-6 mb-6">
              <h3 className="text-cyan-400/70 text-sm font-mono uppercase mb-4">Daily Reviews</h3>
              <Chart
                data={data.ysws.trend.map((t) => ({ ...t, value: t.count }))}
                type="bar"
                dataKey="value"
                xKey="date"
                yLabel="Reviews"
                xLabel="Date"
                valueLabel="Done"
                color="#22d3ee"
              />
            </div>
          )}

          {data.ysws.leaderboard.length > 0 && (
            <div className="bg-zinc-900/50 border-2 border-cyan-700/30 rounded-xl p-6">
              <h3 className="text-cyan-400/70 text-sm font-mono uppercase mb-4">Top Reviewers</h3>
              <div className="space-y-2">
                {data.ysws.leaderboard.map((user, i) => (
                  <div
                    key={user.name}
                    className="flex items-center justify-between py-2 border-b border-amber-900/20 last:border-0"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-cyan-400 font-mono text-sm w-6">#{i + 1}</span>
                      <span className="text-amber-100 font-mono">{user.name}</span>
                    </div>
                    <span className="text-cyan-300 font-mono text-sm">{user.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-zinc-900/30 border-2 border-purple-600/30 rounded-2xl p-6">
        <h2 className="text-purple-400 font-mono text-xl mb-6">Support Tickets</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <StatsCard label="Total Tickets" value={data.tickets.total} color="purple" />
          <StatsCard label="Open" value={data.tickets.open} color="purple" />
          <StatsCard label="Closed" value={data.tickets.closed} color="purple" />
        </div>

        {data.tickets.trend && data.tickets.trend.length > 0 && (
          <div className="bg-zinc-900/50 border-2 border-purple-700/30 rounded-xl p-6">
            <h3 className="text-purple-400/70 text-sm font-mono uppercase mb-4">Daily Tickets</h3>
            <Chart
              data={data.tickets.trend.map((t) => ({ ...t, value: t.count }))}
              type="bar"
              dataKey="value"
              xKey="date"
              yLabel="Tickets"
              xLabel="Date"
              valueLabel="Created"
              color="#c084fc"
            />
          </div>
        )}
      </div>
    </div>
  )
}
