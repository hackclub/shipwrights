'use client'

import { useState, useEffect, useCallback } from 'react'
import { can, PERMS } from '@/lib/perms'
import { useUser } from '@/components/providers/user-context'

export type SpotCheckSessionState = {
  id: number
  status: 'active' | 'paused'
  startedAt: string
  pausedAt: string | null
  totalSecondsAccrued: number
  totalSeconds: number
  certs: { certId: number; projectName: string | null; status: string; addedAt: string }[]
}

export type SpotCheckSummary = {
  certCount: number
  reviewedCount: number
  leftCount: number
  certs: { certId: number; projectName: string | null; status: string }[]
}

export function SpotCheckSessionBar({ forceShow = false, compact = false }: { forceShow?: boolean; compact?: boolean }) {
  const { user } = useUser()
  const [session, setSession] = useState<SpotCheckState | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [summary, setSummary] = useState<SpotCheckSummary | null>(null)

  const canSpotCheck = forceShow || (user?.role ? can(user.role, PERMS.spot_check) : false)

  const fetchSession = useCallback(async () => {
    if (!canSpotCheck) {
      setLoading(false)
      return
    }
    try {
      const res = await fetch('/api/admin/spot_check_session')
      const data = await res.json()
      if (res.ok && data.session) {
        setSession(data.session)
      } else {
        setSession(null)
      }
    } catch {
      setSession(null)
    } finally {
      setLoading(false)
    }
  }, [canSpotCheck])

  useEffect(() => {
    fetchSession()
  }, [fetchSession])

  useEffect(() => {
    const handler = () => fetchSession()
    window.addEventListener('spot-check-session-update', handler)
    return () => window.removeEventListener('spot-check-session-update', handler)
  }, [fetchSession])

  const startSession = async () => {
    setBusy(true)
    try {
      const res = await fetch('/api/admin/spot_check_session', { method: 'POST' })
      const data = await res.json()
      if (res.ok && data.session) {
        setSession(data.session)
      }
    } finally {
      setBusy(false)
    }
  }

  const pauseSession = async () => {
    setBusy(true)
    try {
      const res = await fetch('/api/admin/spot_check_session', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'pause' }),
      })
      const data = await res.json()
      if (res.ok && data.session) {
        setSession(data.session)
      }
    } finally {
      setBusy(false)
    }
  }

  const resumeSession = async () => {
    setBusy(true)
    try {
      const res = await fetch('/api/admin/spot_check_session', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'resume' }),
      })
      const data = await res.json()
      if (res.ok && data.session) {
        setSession(data.session)
      }
    } finally {
      setBusy(false)
    }
  }

  const endSession = async () => {
    setBusy(true)
    try {
      const res = await fetch('/api/admin/spot_check_session', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'end' }),
      })
      const data = await res.json()
      if (res.ok && data.summary) {
        setSession(null)
        setSummary(data.summary)
        window.dispatchEvent(new CustomEvent('spot-check-session-ended', { detail: data.summary }))
      } else {
        fetchSession()
      }
    } finally {
      setBusy(false)
    }
  }

  if (loading) return null
  if (!canSpotCheck) return null

  if (compact) {
    if (!session) return null
    return (
      <>
        <div className="inline-flex flex-wrap items-center gap-2 font-mono text-xs bg-amber-950/60 border border-amber-700/50 rounded-lg px-3 py-1.5">
          <span className="text-amber-400"><strong>{session.certs.length}</strong> project{session.certs.length !== 1 ? 's' : ''} in batch</span>
          {session.status === 'paused' && <span className="text-amber-500/80">(paused)</span>}
          <span className="text-amber-500/80">·</span>
          {session.status === 'active' ? (
            <button onClick={pauseSession} disabled={busy} className="text-amber-400 hover:text-amber-300 disabled:opacity-50">
              Pause
            </button>
          ) : (
            <button onClick={resumeSession} disabled={busy} className="text-green-400 hover:text-green-300 disabled:opacity-50">
              Resume
            </button>
          )}
          <span className="text-amber-500/80">·</span>
          <button onClick={endSession} disabled={busy} className="text-amber-400 hover:text-amber-300 disabled:opacity-50">
            End & summary
          </button>
        </div>
        {summary && (
          <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
            <div className="bg-gradient-to-br from-zinc-900 to-black border-4 border-amber-700/60 rounded-3xl max-w-lg w-full overflow-hidden flex flex-col shadow-2xl">
              <div className="p-6">
                <h3 className="text-xl font-mono font-bold text-amber-400 mb-2">Spot check summary</h3>
                <p className="font-mono text-amber-200">You&apos;ve reviewed <strong>{summary.reviewedCount}</strong> project{summary.reviewedCount !== 1 ? 's' : ''}.</p>
                <p className="font-mono text-amber-200 mt-1">There {summary.leftCount === 1 ? 'is' : 'are'} <strong>{summary.leftCount}</strong> left in the batch.</p>
              </div>
              <div className="p-4 border-t border-amber-900/40">
                <button onClick={() => setSummary(null)} className="w-full bg-amber-700/40 hover:bg-amber-600/50 text-amber-200 font-mono py-2 rounded-xl border border-amber-600/60 transition-colors">
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    )
  }

  return (
    <>
      <div className="bg-amber-950/80 border-2 border-amber-700/60 rounded-2xl px-4 py-3 font-mono text-sm flex flex-wrap items-center gap-3 shadow-lg">
        {!session ? (
          <button
            onClick={startSession}
            disabled={busy}
            className="bg-amber-700/40 hover:bg-amber-600/50 text-amber-200 px-4 py-2 rounded-xl border border-amber-600/60 transition-colors disabled:opacity-50"
          >
            {busy ? 'Starting…' : 'Start spot check'}
          </button>
        ) : (
          <>
            <span className="text-amber-300">
              <strong>{session.certs.length}</strong> project{session.certs.length !== 1 ? 's' : ''} in batch
              {session.status === 'paused' && <span className="text-amber-500/80 ml-1">(paused)</span>}
            </span>
            <div className="flex gap-2">
              {session.status === 'active' ? (
                <button
                  onClick={pauseSession}
                  disabled={busy}
                  className="bg-zinc-700/50 hover:bg-zinc-600/50 text-white px-3 py-1.5 rounded-lg border border-zinc-600 transition-colors disabled:opacity-50"
                >
                  Pause
                </button>
              ) : (
                <button
                  onClick={resumeSession}
                  disabled={busy}
                  className="bg-green-700/40 hover:bg-green-600/50 text-green-200 px-3 py-1.5 rounded-lg border border-green-600/60 transition-colors disabled:opacity-50"
                >
                  Resume
                </button>
              )}
              <button
                onClick={endSession}
                disabled={busy}
                className="bg-amber-600/50 hover:bg-amber-500/60 text-amber-100 px-3 py-1.5 rounded-lg border border-amber-500/60 transition-colors disabled:opacity-50"
              >
                End & summary
              </button>
            </div>
          </>
        )}
      </div>

      {summary && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-gradient-to-br from-zinc-900 to-black border-4 border-amber-700/60 rounded-3xl max-w-lg w-full overflow-hidden flex flex-col shadow-2xl">
            <div className="p-6">
              <h3 className="text-xl font-mono font-bold text-amber-400 mb-2">
                Spot check summary
              </h3>
              <p className="font-mono text-amber-200">You&apos;ve reviewed <strong>{summary.reviewedCount}</strong> project{summary.reviewedCount !== 1 ? 's' : ''}.</p>
              <p className="font-mono text-amber-200 mt-1">There {summary.leftCount === 1 ? 'is' : 'are'} <strong>{summary.leftCount}</strong> left in the batch.</p>
            </div>
            <div className="p-4 border-t border-amber-900/40">
              <button
                onClick={() => setSummary(null)}
                className="w-full bg-amber-700/40 hover:bg-amber-600/50 text-amber-200 font-mono py-2 rounded-xl border border-amber-600/60 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// Alias for the type used in state (API returns same shape)
type SpotCheckState = SpotCheckSessionState
