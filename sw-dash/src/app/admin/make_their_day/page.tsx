'use client'

import { useState, useEffect } from 'react'

interface StickerReq {
  id: number
  ftProjectId: string
  shipped: boolean
  shippedAt: string | null
  createdAt: string
  requester: { id: number; username: string; avatar: string | null }
}

export default function MakeTheirDay() {
  const [projectId, setProjectId] = useState('')
  const [requests, setRequests] = useState<StickerReq[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [err, setErr] = useState('')
  const [showFull, setShowFull] = useState(false)
  const [myRole, setMyRole] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/admin/sticker_requests')
      .then((r) => r.json())
      .then((data) => {
        setRequests(data.requests)
        setLoading(false)
      })
    fetch('/api/me')
      .then((r) => r.json())
      .then((data) => setMyRole(data.role))
  }, [])

  const canShip = myRole === 'megawright' || myRole === 'hq'

  async function markShipped(id: number, shipped: boolean) {
    const res = await fetch(`/api/admin/sticker_requests/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ shipped }),
    })
    if (res.ok) {
      const updated = await res.json()
      setRequests((prev) => prev.map((r) => (r.id === id ? updated : r)))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const id = projectId.trim()
    if (!id || submitting) return

    if (requests.some((r) => r.ftProjectId === id)) {
      setErr('already on the list!')
      setTimeout(() => setErr(''), 3000)
      return
    }

    setSubmitting(true)
    setSuccess(false)
    setErr('')

    const res = await fetch('/api/admin/sticker_requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ftProjectId: id }),
    })

    const data = await res.json()
    if (res.ok) {
      setRequests((prev) => [data, ...prev])
      setProjectId('')
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } else {
      setErr(data.error || 'shit broke')
      setTimeout(() => setErr(''), 3000)
    }

    setSubmitting(false)
  }

  return (
    <main className="bg-grid min-h-screen w-full flex flex-col items-center p-4 md:p-8 pt-12 md:pt-20">
      <div className="max-w-3xl w-full">
        <div className="flex flex-col md:flex-row gap-6 md:gap-10 items-start mb-12">
          <div className="shrink-0 md:-rotate-3 md:mt-4 mx-auto md:mx-0">
            <button onClick={() => setShowFull(true)} className="cursor-pointer">
              <div className="w-72 md:w-80 rounded-2xl overflow-hidden border-2 border-dashed border-pink-500/40 bg-zinc-500 p-3 shadow-lg shadow-pink-500/20 border-pink-500/70">
                <img
                  src="https://pub-64293201d44f43b4ac080769f6b433af.r2.dev/stickersToFT.png"
                  alt="Stickers for Flavortown"
                  className="w-full h-auto"
                />
              </div>
              <p className="text-zinc-500 text-xs font-mono mt-2 text-center">(click me)</p>
            </button>
          </div>

          {showFull && (
            <div
              className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer"
              onClick={() => setShowFull(false)}
            >
              <img
                src="https://pub-64293201d44f43b4ac080769f6b433af.r2.dev/stickersToFT.png"
                alt="Stickers for Flavortown"
                className="max-w-full max-h-[90vh] rounded-2xl shadow-2xl shadow-pink-500/20"
              />
            </div>
          )}

          <div className="flex-1 min-w-0 pt-2">
            <h1 className="text-3xl md:text-4xl font-bold text-pink-400 mb-4 font-mono">
              Make their day special :3
            </h1>
            <p className="text-zinc-400 text-sm md:text-base leading-relaxed mb-8">
              Send stickers directly to projects that made you automatically say{' '}
              <span className="text-pink-300 font-semibold">
                &quot;Wow... this is so cool&quot;
              </span>
              . Make someone&apos;s day by nominating their project below! :333
            </p>

            <form onSubmit={handleSubmit}>
              <div className="bg-gradient-to-br from-zinc-900/90 to-black/90 border-2 border-dashed border-pink-500/40 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-2">
                  <label htmlFor="ftProjectId" className="text-pink-300 font-mono text-sm">
                    FT Project ID
                  </label>
                  <span className="text-zinc-500 font-mono text-xs">
                    {requests.length}/100 spots taken
                  </span>
                </div>
                <div className="flex gap-3">
                  <input
                    id="ftProjectId"
                    type="text"
                    value={projectId}
                    onChange={(e) => setProjectId(e.target.value.replace(/\D/g, ''))}
                    placeholder="e.g. 1234..."
                    className="flex-1 bg-zinc-950/70 border-2 border-zinc-700 focus:border-pink-500 text-white font-mono text-sm px-4 py-3 rounded-xl outline-none transition-colors placeholder:text-zinc-600"
                  />
                  <button
                    type="submit"
                    disabled={!projectId.trim() || submitting || requests.length >= 100}
                    className="bg-pink-500/20 border-2 border-dashed border-pink-500 hover:border-pink-400 text-pink-300 hover:text-pink-200 font-mono text-sm px-6 py-3 rounded-xl transition-all duration-200 hover:bg-pink-500/30 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
                  >
                    {submitting ? '...' : 'Send it!'}
                  </button>
                </div>
                {success && (
                  <p className="text-pink-400 font-mono text-xs mt-3 animate-pulse">
                    Nominated! You just made someone&apos;s day :3
                  </p>
                )}
                {err && <p className="text-red-400 font-mono text-xs mt-3">{err}</p>}
              </div>
            </form>
          </div>
        </div>

        <div>
          <h2 className="text-pink-500/70 font-mono text-xs uppercase tracking-wider mb-3 px-2">
            recent nominations
          </h2>
          {loading ? (
            <div className="text-zinc-600 font-mono text-sm text-center py-8">loading...</div>
          ) : requests.length === 0 ? (
            <div className="text-zinc-600 font-mono text-sm text-center py-8">
              no nominations yet... be the first! :3
            </div>
          ) : (
            <div className="space-y-2">
              {requests.map((r) => (
                <div
                  key={r.id}
                  className={`border rounded-xl px-4 py-3 flex items-center justify-between gap-3 ${r.shipped ? 'bg-green-900/20 border-green-800/50' : 'bg-zinc-900/60 border-zinc-800'}`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-pink-400 font-mono text-sm truncate">
                      {r.ftProjectId}
                    </span>
                    {r.shipped && (
                      <span className="text-green-400 font-mono text-xs shrink-0">shipped!</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-zinc-500 text-xs font-mono">{r.requester.username}</span>
                    <span className="text-zinc-600 text-xs font-mono">
                      {new Date(r.createdAt).toLocaleDateString()}
                    </span>
                    {canShip && (
                      <button
                        onClick={() => markShipped(r.id, !r.shipped)}
                        className={`font-mono text-xs px-2 py-1 rounded-lg border transition-all ${r.shipped ? 'border-zinc-700 text-zinc-500 hover:text-red-400 hover:border-red-800' : 'border-green-800 text-green-500 hover:text-green-300 hover:border-green-600'}`}
                      >
                        {r.shipped ? 'unship' : 'mark shipped'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
