'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function Review({ wrightId }: { wrightId: string }) {
  const [showSetup, setShowSetup] = useState(true)
  const [totalCount, setTotalCount] = useState('')
  const [addOnReject, setAddOnReject] = useState('')

  const [certs, setCerts] = useState<any[]>([])
  const [idx, setIdx] = useState(0)
  const [reviewed, setReviewed] = useState(0)
  const [loading, setLoading] = useState(false)
  const [showReject, setShowReject] = useState<'full' | 'keep' | null>(null)

  const [why, setWhy] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const start = async () => {
    const n = parseInt(totalCount)
    if (!n || n < 1) {
      alert('gotta enter a valid number')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/admin/spot_checks/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start', wrightId: Number(wrightId), count: n }),
      })
      const data = await res.json()
      setCerts(data.certs || [])
      setShowSetup(false)
    } catch (e) {
      alert('load failed')
    } finally {
      setLoading(false)
    }
  }

  const approve = async () => {
    const cert = certs[idx]
    if (!cert) return

    setSubmitting(true)
    try {
      await fetch('/api/admin/spot_checks/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'decide',
          decision: 'approved',
          certId: cert.id,
          wrightId: Number(wrightId),
        }),
      })
      next()
    } catch (e) {
      alert('approve failed')
    } finally {
      setSubmitting(false)
    }
  }

  const reject = async (keepLb = false) => {
    const cert = certs[idx]
    if (!cert || !why) return

    setSubmitting(true)
    try {
      await fetch('/api/admin/spot_checks/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'decide',
          decision: 'rejected',
          certId: cert.id,
          wrightId: Number(wrightId),
          why,
          notes,
          keepLb,
        }),
      })

      if (!keepLb) {
        const add = parseInt(addOnReject)
        if (add && add > 0) {
          const res = await fetch('/api/admin/spot_checks/actions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'start', wrightId: Number(wrightId), count: add }),
          })
          const d = await res.json()
          setCerts([...certs, ...(d.certs || [])])
        }
      }

      setShowReject(null)
      setWhy('')
      setNotes('')
      next()
    } catch (e) {
      alert('reject failed')
    } finally {
      setSubmitting(false)
    }
  }

  const next = () => {
    setReviewed((r) => r + 1)
    if (idx + 1 < certs.length) {
      setIdx(idx + 1)
    } else {
      setCerts([])
      setIdx(0)
    }
  }

  if (showSetup)
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="bg-gradient-to-br from-zinc-900/90 to-black/90 border-4 border-amber-900/40 rounded-3xl max-w-md w-full p-6 shadow-2xl">
          <h3 className="text-xl font-mono font-bold text-amber-400 mb-2">Spot Check</h3>

          <div className="mb-4">
            <label className="block font-mono text-xs uppercase text-amber-500/60 font-bold mb-2">
              how many do you want to spot check?
            </label>
            <input
              type="number"
              className="w-full bg-zinc-950/50 border-2 border-amber-900/40 text-amber-200 font-mono rounded-xl p-3 focus:border-amber-500 outline-none transition-colors"
              placeholder="5"
              value={totalCount}
              onChange={(e) => setTotalCount(e.target.value)}
            />
          </div>

          <div className="mb-6">
            <label className="block font-mono text-xs uppercase text-amber-500/60 font-bold mb-2">
              if rejecting, how many add more to total?
            </label>
            <input
              type="number"
              className="w-full bg-zinc-950/50 border-2 border-amber-900/40 text-amber-200 font-mono rounded-xl p-3 focus:border-amber-500 outline-none transition-colors"
              placeholder="0"
              value={addOnReject}
              onChange={(e) => setAddOnReject(e.target.value)}
            />
            <p className="text-xs text-amber-500/40 font-mono mt-1">
              adds new random certs if u reject
            </p>
          </div>

          <div className="flex gap-4">
            <Link
              href={`/admin/spot_checks/${wrightId}`}
              className="flex-1 bg-zinc-800/50 hover:bg-zinc-700/50 border-2 border-amber-900/40 text-amber-200 font-mono py-2 rounded-xl transition-colors text-center"
            >
              cancel
            </Link>
            <button
              onClick={start}
              disabled={loading}
              className="flex-1 bg-blue-500/10 border-2 border-dashed border-blue-600 hover:border-blue-400 text-blue-400 hover:text-blue-300 font-mono py-2 rounded-xl transition-all hover:bg-blue-500/20 disabled:opacity-50"
            >
              {loading ? 'loading...' : 'start'}
            </button>
          </div>
        </div>
      </div>
    )

  if (loading)
    return (
      <div className="flex h-full items-center justify-center font-mono text-amber-400">
        loading...
      </div>
    )

  if (certs.length === 0 || idx >= certs.length)
    return (
      <div className="flex h-full flex-col items-center justify-center p-8">
        <div className="text-4xl mb-4">🎉</div>
        <h2 className="text-2xl font-mono font-bold text-amber-400 mb-2">done</h2>
        <p className="text-amber-300/60 font-mono text-sm mb-6">checked all {reviewed} certs</p>
        <Link
          href="/admin/spot_checks"
          className="bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white font-mono text-sm px-6 py-3 rounded-2xl transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          back
        </Link>
      </div>
    )

  const cert = certs[idx]
  const ytId = cert.proofVideoUrl?.match(
    /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([^&?]+)/
  )?.[1]

  return (
    <div className="flex h-full relative">
      {showReject && (
        <div className="absolute inset-0 z-50 bg-black/80 flex items-center justify-center p-8">
          <div className="bg-gradient-to-br from-zinc-900/90 to-black/90 border-4 border-red-900/40 rounded-3xl max-w-lg w-full p-6 shadow-2xl">
            <h3 className="text-xl font-mono font-bold text-red-500 mb-2">flag this</h3>
            <p className="font-mono text-sm text-amber-300/50 mb-4">
              {showReject === 'keep'
                ? 'creates case, lb stays untouched'
                : 'removes from LB and creates case'}
            </p>

            <div className="mb-4">
              <label className="block font-mono text-xs uppercase text-amber-500/60 font-bold mb-2">
                why? (required)
              </label>
              <textarea
                className="w-full bg-zinc-950/50 border-2 border-amber-900/40 text-amber-200 font-mono rounded-xl p-3 h-24 focus:border-red-500 outline-none transition-colors"
                placeholder="what's wrong?"
                value={why}
                onChange={(e) => setWhy(e.target.value)}
              />
            </div>

            <div className="mb-6">
              <label className="block font-mono text-xs uppercase text-amber-500/60 font-bold mb-2">
                notes (internal)
              </label>
              <textarea
                className="w-full bg-zinc-950/50 border-2 border-amber-900/40 text-amber-200 font-mono rounded-xl p-3 h-24 focus:border-blue-500 outline-none transition-colors"
                placeholder="staff notes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => setShowReject(null)}
                className="flex-1 bg-zinc-800/50 hover:bg-zinc-700/50 border-2 border-amber-900/40 text-amber-200 font-mono py-2 rounded-xl transition-colors"
              >
                cancel
              </button>
              <button
                onClick={() => reject(showReject === 'keep')}
                disabled={!why || submitting}
                className="flex-1 bg-red-500/10 border-2 border-dashed border-red-600 hover:border-red-400 text-red-400 hover:text-red-300 font-mono py-2 rounded-xl transition-all hover:bg-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'flagging...' : 'flag'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col p-6 overflow-hidden">
        <div className="flex items-center justify-between mb-6">
          <Link
            href={`/admin/spot_checks/${wrightId}`}
            className="text-amber-300/70 hover:text-amber-200 font-mono text-sm"
          >
            ← back
          </Link>
          <div className="flex items-center gap-4">
            <div className="font-mono text-lg font-bold text-amber-400">
              {idx + 1}/{certs.length}
            </div>
            <div className="font-mono text-sm text-amber-500/50">cert #{cert.id}</div>
          </div>
        </div>

        <div className="flex-1 grid grid-cols-2 gap-8 min-h-0">
          <div className="bg-gradient-to-br from-zinc-900/90 to-black/90 border-4 border-amber-900/40 rounded-3xl overflow-hidden shadow-2xl">
            {ytId ? (
              <iframe
                src={`https://www.youtube.com/embed/${ytId}`}
                className="w-full h-full"
                allowFullScreen
              />
            ) : cert.proofVideoUrl ? (
              <video src={cert.proofVideoUrl} controls className="w-full h-full" />
            ) : (
              <div className="flex items-center justify-center h-full text-amber-500/50 font-mono">
                no video
              </div>
            )}
          </div>

          <div className="overflow-y-auto pr-2 space-y-6">
            <div>
              <h1 className="text-3xl font-mono font-bold text-amber-200 mb-4">
                {cert.projectName || 'untitled'}
              </h1>

              <div className="flex gap-2 mb-4">
                {cert.ftProjectId && (
                  <a
                    href={`${process.env.NEXT_PUBLIC_FLAVORTOWN_URL}/projects/${cert.ftProjectId}`}
                    target="_blank"
                    className="bg-zinc-900/50 border-2 border-amber-900/40 px-3 py-1 rounded-xl font-mono text-sm text-amber-300 hover:border-amber-700/50 transition-colors"
                  >
                    ft project
                  </a>
                )}
                {cert.repoUrl && (
                  <a
                    href={cert.repoUrl}
                    target="_blank"
                    className="bg-zinc-900/50 border-2 border-amber-900/40 px-3 py-1 rounded-xl font-mono text-sm text-amber-300 hover:border-amber-700/50 transition-colors"
                  >
                    repo
                  </a>
                )}
                {cert.demoUrl && (
                  <a
                    href={cert.demoUrl}
                    target="_blank"
                    className="bg-zinc-900/50 border-2 border-amber-900/40 px-3 py-1 rounded-xl font-mono text-sm text-amber-300 hover:border-amber-700/50 transition-colors"
                  >
                    demo
                  </a>
                )}
              </div>

              <div className="bg-gradient-to-br from-zinc-900/90 to-black/90 border-4 border-amber-900/40 rounded-2xl p-4">
                <h4 className="font-mono text-xs uppercase text-amber-500/60 font-bold mb-2">
                  description
                </h4>
                <p className="font-mono text-amber-300/80 text-sm whitespace-pre-wrap">
                  {cert.description}
                </p>
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-900/20 to-black/90 border-4 border-blue-900/40 rounded-2xl p-4">
              <h4 className="font-mono text-xs uppercase text-blue-400/70 font-bold mb-2">
                shipwright verdict:{' '}
                <span className="text-white text-lg ml-2">{cert.status.toUpperCase()}</span>
              </h4>
              <p className="font-mono text-amber-300/80 text-sm italic">"{cert.reviewFeedback}"</p>
            </div>

            <div className="pt-6 border-t border-amber-900/20">
              <h3 className="font-mono font-bold text-amber-400 text-center mb-4">your call</h3>
              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => setShowReject('full')}
                  className="bg-red-500/10 border-2 border-dashed border-red-600 hover:border-red-400 text-red-400 hover:text-red-300 font-mono py-3 rounded-2xl transition-all hover:bg-red-500/20 hover:scale-[1.02] active:scale-[0.98] text-sm"
                >
                  reject
                </button>
                <button
                  onClick={() => setShowReject('keep')}
                  className="bg-orange-500/10 border-2 border-dashed border-orange-600 hover:border-orange-400 text-orange-400 hover:text-orange-300 font-mono py-3 rounded-2xl transition-all hover:bg-orange-500/20 hover:scale-[1.02] active:scale-[0.98] text-sm"
                >
                  reject (keep lb)
                </button>
                <button
                  onClick={approve}
                  className="bg-green-500/10 border-2 border-dashed border-green-600 hover:border-green-400 text-green-400 hover:text-green-300 font-mono py-3 rounded-2xl transition-all hover:bg-green-500/20 hover:scale-[1.02] active:scale-[0.98] text-sm"
                >
                  approve
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
