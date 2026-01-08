import { db } from '@/lib/db'
import { ShipsBg } from '@/components/ships-bg'

async function load() {
  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  const [reviewed, pending] = await Promise.all([
    db.shipCert.findMany({
      where: {
        status: { in: ['approved', 'rejected'] },
        reviewCompletedAt: { gte: thirtyDaysAgo },
      },
      select: {
        projectType: true,
        createdAt: true,
        reviewCompletedAt: true,
      },
    }),
    db.shipCert.findMany({
      where: { status: 'pending' },
      select: {
        id: true,
        projectType: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    }),
  ])

  const times = reviewed
    .filter((s) => s.reviewCompletedAt)
    .map((s) => s.reviewCompletedAt!.getTime() - s.createdAt.getTime())
    .sort((a, b) => a - b)

  const median = (arr: number[]) => {
    if (!arr.length) return 0
    const mid = Math.floor(arr.length / 2)
    return arr.length % 2 ? arr[mid] : (arr[mid - 1] + arr[mid]) / 2
  }

  const fmt = (ms: number) => {
    if (ms <= 0) return '-'
    const h = Math.floor(ms / (1000 * 60 * 60))
    const d = Math.floor(h / 24)
    if (d > 0) return `${d}d ${h % 24}h`
    if (h > 0) return `${h}h`
    return '<1h'
  }

  const byType = new Map<string, number[]>()
  reviewed.forEach((s) => {
    if (!s.reviewCompletedAt) return
    const t = s.projectType || 'other'
    const time = s.reviewCompletedAt.getTime() - s.createdAt.getTime()
    if (!byType.has(t)) byType.set(t, [])
    byType.get(t)!.push(time)
  })

  const typeStats = Array.from(byType.entries())
    .map(([type, arr]) => ({
      type,
      median: fmt(median(arr.sort((a, b) => a - b))),
      count: arr.length,
    }))
    .sort((a, b) => b.count - a.count)

  const queue = pending.map((s) => {
    const wait = now.getTime() - s.createdAt.getTime()
    return {
      id: s.id,
      type: s.projectType || 'other',
      waiting: fmt(wait),
      waitMs: wait,
    }
  })

  const medianMs = median(times)
  const avgWait = queue.length ? queue.reduce((sum, q) => sum + q.waitMs, 0) / queue.length : 0

  const oldest = queue.length ? queue[0].waitMs : 0
  const newest = queue.length ? queue[queue.length - 1].waitMs : 0

  const p90 = times.length ? times[Math.floor(times.length * 0.9)] : 0

  return {
    medianTime: fmt(medianMs),
    p90Time: fmt(p90),
    reviewedCount: reviewed.length,
    typeStats,
    queue,
    queueSize: pending.length,
    avgQueueWait: fmt(avgWait),
    oldestInQueue: fmt(oldest),
    newestInQueue: fmt(newest),
  }
}

export default async function Page() {
  const data = await load()

  return (
    <div className="ocean-bg min-h-screen">
      <ShipsBg />
      <main className="relative z-10 p-4 md:p-8 max-w-5xl mx-auto">
        <header className="text-center mb-8 pt-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-2 text-white">Queue Stats</h1>
          <p className="text-zinc-500">review speed & pending ships</p>
        </header>

        <div className="mb-8 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent rounded-2xl p-5 border border-amber-500/20">
          <div className="flex items-start gap-4">
            <div className="text-3xl">⏳</div>
            <div>
              <p className="text-amber-300 font-medium mb-1">Waiting longer than expected?</p>
              <p className="text-zinc-400 text-sm leading-relaxed">
                We're a team of volunteers juggling school, work, and life stuff. Some ships take
                longer to review depending on complexity - we promise we're getting to yours. Thanks
                for being patient with us! 💛
              </p>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div className="content-box rounded-xl p-6">
            <h2 className="text-zinc-400 text-sm mb-1">Median Review Time</h2>
            <p className="text-zinc-600 text-xs mb-3">time from submit → decision (30d)</p>
            <div className="text-4xl font-bold text-cyan-400">{data.medianTime}</div>
            <p className="text-zinc-600 text-sm mt-2">based on {data.reviewedCount} reviews</p>
            <div className="mt-3 pt-3 border-t border-zinc-800">
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500">90th percentile:</span>
                <span className="text-zinc-300">{data.p90Time}</span>
              </div>
            </div>
          </div>

          <div className="content-box rounded-xl p-6">
            <h2 className="text-zinc-400 text-sm mb-1">Current Queue</h2>
            <p className="text-zinc-600 text-xs mb-3">ships waiting for review</p>
            <div className="text-4xl font-bold text-amber-400">{data.queueSize}</div>
            <div className="mt-3 pt-3 border-t border-zinc-800 space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500">oldest waiting:</span>
                <span className="text-red-400">{data.oldestInQueue}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500">newest waiting:</span>
                <span className="text-green-400">{data.newestInQueue}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500">avg wait:</span>
                <span className="text-zinc-300">{data.avgQueueWait}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="content-box rounded-xl p-6 mb-8">
          <h2 className="text-zinc-400 text-sm mb-1">By Type</h2>
          <p className="text-zinc-600 text-xs mb-4">median review time per ship type (30d)</p>
          <div className="flex flex-wrap gap-4">
            {data.typeStats.map((t) => (
              <div
                key={t.type}
                className="bg-zinc-900/50 px-4 py-3 rounded-lg border border-zinc-800"
              >
                <div className="text-zinc-400 text-xs mb-1">{t.type}</div>
                <div className="text-xl font-bold text-white">{t.median}</div>
                <div className="text-zinc-600 text-xs">{t.count} reviews</div>
              </div>
            ))}
            {data.typeStats.length === 0 && <p className="text-zinc-600">no data yet</p>}
          </div>
        </div>

        <div className="mt-6 text-center">
          <a href="/" className="text-zinc-600 hover:text-zinc-400 text-sm transition-colors">
            ← back to crew
          </a>
        </div>
      </main>
    </div>
  )
}
