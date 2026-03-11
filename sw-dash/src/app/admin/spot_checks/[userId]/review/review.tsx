'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { SpotCheckSessionBar } from '@/components/spot-check-session-bar'

function DoneView({
  reviewed,
  doneSummary,
  setDoneSummary,
  endedSessionRef,
}: {
  reviewed: number
  doneSummary: {
    certCount: number
    reviewedCount?: number
    leftCount?: number
    certs: { certId: number; projectName: string | null; status: string }[]
  } | null
  setDoneSummary: (s: typeof doneSummary) => void
  endedSessionRef: React.MutableRefObject<boolean>
}) {
  useEffect(() => {
    if (reviewed === 0 || endedSessionRef.current) return
    endedSessionRef.current = true
    fetch('/api/admin/spot_check_session', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'end' }),
    })
      .then((r) => r.json())
      .then((data) => data.summary && setDoneSummary(data.summary))
      .catch(() => {})
  }, [reviewed, setDoneSummary, endedSessionRef])

  return (
    <div className="flex h-full flex-col items-center justify-center p-8">
      <div className="text-4xl mb-4">🎉</div>
      <h2 className="text-2xl font-mono font-bold text-amber-400 mb-2">done</h2>
      <p className="text-amber-300/60 font-mono text-sm mb-4">checked all {reviewed} certs</p>
      {reviewed > 0 && !doneSummary && (
        <p className="text-amber-500/60 font-mono text-xs mb-4">loading summary…</p>
      )}
      {doneSummary && (
        <div className="bg-zinc-900/80 border-2 border-amber-800/40 rounded-2xl p-6 max-w-md w-full mb-6 text-left">
          <h3 className="font-mono font-bold text-amber-400 mb-2">Spot check summary</h3>
          <p className="font-mono text-amber-200 text-sm">
            You&apos;ve reviewed <strong>{doneSummary.reviewedCount ?? doneSummary.certCount}</strong> project{(doneSummary.reviewedCount ?? doneSummary.certCount) !== 1 ? 's' : ''}.
          </p>
          {(doneSummary.leftCount !== undefined && doneSummary.leftCount !== null) && (
            <p className="font-mono text-amber-200 text-sm mt-1">
              There {doneSummary.leftCount === 1 ? 'is' : 'are'} <strong>{doneSummary.leftCount}</strong> left in the batch.
            </p>
          )}
        </div>
      )}
      <Link
        href="/admin/spot_checks"
        className="bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white font-mono text-sm px-6 py-3 rounded-2xl transition-all hover:scale-[1.02] active:scale-[0.98]"
      >
        back
      </Link>
    </div>
  )
}

export default function Review({ wrightId }: { wrightId: string }) {
  const searchParams = useSearchParams()
  const sessionIdParam = searchParams.get('sessionId')

  const [certs, setCerts] = useState<any[]>([])
  const [idx, setIdx] = useState(0)
  const [reviewed, setReviewed] = useState(0)
  const [loading, setLoading] = useState(true)
  const [showReject, setShowReject] = useState<'full' | 'keep' | null>(null)

  const [why, setWhy] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const [doneSummary, setDoneSummary] = useState<{
    certCount: number
    reviewedCount?: number
    leftCount?: number
    certs: { certId: number; projectName: string | null; status: string }[]
  } | null>(null)
  const endedSessionRef = useRef(false)
  const autoStartedRef = useRef(false)

  useEffect(() => {
    if (!sessionIdParam) return
    const id = parseInt(sessionIdParam, 10)
    if (!Number.isFinite(id)) {
      setLoading(false)
      return
    }
    fetch(`/api/admin/spot_check_session/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.certs && data.certs.length > 0) {
          setCerts(data.certs)
          if (data.session?.status === 'paused') {
            fetch('/api/admin/spot_check_session', {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'resume' }),
            }).then(() => window.dispatchEvent(new Event('spot-check-session-update')))
          }
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [sessionIdParam])

  useEffect(() => {
    if (sessionIdParam || autoStartedRef.current) return
    autoStartedRef.current = true
    const wrightIdNum = Number(wrightId)
    const DEFAULT_BATCH = 5
    fetch('/api/admin/spot_checks/actions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'start', wrightId: wrightIdNum, count: DEFAULT_BATCH }),
    })
      .then((r) => r.json())
      .then((data) => {
        const certsList = data.certs || []
        if (certsList.length > 0) {
          let sessionOk = false
          fetch('/api/admin/spot_check_session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ wrightId: Number.isFinite(wrightIdNum) ? wrightIdNum : null }),
          })
            .then((sessionRes) => {
              if (sessionRes.ok) sessionOk = true
              return Promise.all(
                certsList.map((c: { id: number }) =>
                  fetch('/api/admin/spot_check_session/certs', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      certId: c.id,
                      ...(Number.isFinite(wrightIdNum) ? { wrightId: wrightIdNum } : {}),
                    }),
                  }).then((addRes) => {
                    if (addRes.ok) sessionOk = true
                  })
                )
              )
            })
            .then(() => {
              if (sessionOk) window.dispatchEvent(new Event('spot-check-session-update'))
            })
        }
        setCerts(certsList)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [sessionIdParam, wrightId])

  useEffect(() => {
    const handler = (e: CustomEvent<{
      certCount: number
      reviewedCount?: number
      leftCount?: number
      certs: { certId: number; projectName: string | null; status: string }[]
    }>) => {
      if (e.detail) {
        endedSessionRef.current = true
        setDoneSummary(e.detail)
        setCerts([])
      }
    }
    window.addEventListener('spot-check-session-ended', handler as EventListener)
    return () => window.removeEventListener('spot-check-session-ended', handler as EventListener)
  }, [])

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

  if (loading)
    return (
      <div className="flex h-full items-center justify-center font-mono text-amber-400">
        loading...
      </div>
    )

  if (certs.length === 0 || idx >= certs.length)
    return (
      <DoneView
        reviewed={reviewed}
        doneSummary={doneSummary}
        setDoneSummary={setDoneSummary}
        endedSessionRef={endedSessionRef}
      />
    )

  const cert = certs[idx]
  const ytId = cert.proofVideoUrl?.match(
    /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([^&?]+)/
  )?.[1]

  return (
    <div className="flex h-full relative flex-col">
      <div className="flex-1 flex flex-col min-h-0">
      {showReject && (
        <div className="absolute inset-0 z-50 bg-black/80 flex items-center justify-center p-8">
          <div className="bg-gradient-to-br from-zinc-900/90 to-black/90 border-4 border-red-900/40 rounded-3xl max-w-lg w-full p-6 shadow-2xl">
            <h3 className="text-xl font-mono font-bold text-red-500 mb-2">flag this</h3>
            <p className="font-mono text-sm text-amber-300/50 mb-4">
              {showReject === 'keep'
                ? 'creates case, lb stays untouched'
                : 'removes from LB and creates case'}
            </p>
            <p className="font-mono text-xs text-amber-500/60 mb-4">
              After you flag: a case is created and appears under Spot Checks for staff to resolve. Reject (full) also reduces the reviewer&apos;s leaderboard position; Reject (keep lb) does not.
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
        <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
          <Link
            href={`/admin/spot_checks/${wrightId}`}
            className="text-amber-300/70 hover:text-amber-200 font-mono text-sm"
          >
            ← back
          </Link>
          <div className="flex items-center gap-4 flex-wrap">
            <SpotCheckSessionBar forceShow compact />
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
  </div>
  )
}
