'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'

export default function Case({ caseId }: { caseId: string }) {
  const [data, setData] = useState<any>(null)
  const [error, setError] = useState(false)
  const [toggling, setToggling] = useState(false)
  const [showFp, setShowFp] = useState(false)
  const [fpReason, setFpReason] = useState('')
  const [marking, setMarking] = useState(false)
  const [copied, setCopied] = useState(false)

  const load = () => {
    fetch(`/api/admin/spot_checks/case/${caseId}`)
      .then((r) => r.json())
      .then(setData)
      .catch(() => setError(true))
  }

  useEffect(() => {
    load()
  }, [caseId])

  if (error)
    return (
      <div className="bg-gradient-to-br from-red-900/20 to-black/90 border-4 border-red-900/40 rounded-3xl p-6 font-mono text-red-400">
        load failed
      </div>
    )
  if (!data)
    return (
      <div className="bg-gradient-to-br from-zinc-900/90 to-black/90 border-4 border-amber-900/40 rounded-3xl p-6 animate-pulse h-96"></div>
    )

  const { spot } = data
  const { cert, reviewed, staff } = spot

  const toggle = async () => {
    setToggling(true)
    try {
      await fetch(`/api/admin/spot_checks/case/${caseId}`, { method: 'PATCH' })
      load()
    } catch (e) {
      alert('update failed')
    } finally {
      setToggling(false)
    }
  }

  const markFp = async () => {
    if (!fpReason) return
    setMarking(true)
    try {
      await fetch(`/api/admin/spot_checks/case/${caseId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: fpReason }),
      })
      setShowFp(false)
      setFpReason('')
      load()
    } catch (e) {
      alert('shit broke')
    } finally {
      setMarking(false)
    }
  }

  const copy = () => {
    const certUrl = `${window.location.origin}/admin/ship_certifications/${cert.id}/edit`
    const text = [
      `-- Case details --`,
      `Case number: ${spot.caseId}`,
      `Reviewer: ${reviewed.username}`,
      `The reason for rejection: ${spot.reasoning}`,
      ``,
      `-- Cert details --`,
      `Video: ${cert.proofVideoUrl || 'none'}`,
      `Project: ${cert.projectName}`,
      `Verdict: ${cert.status}`,
      `Feedback: ${cert.reviewFeedback}`,
      `Cert link: ${certUrl}`,
    ].join('\n')
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const resolved = spot.status === 'resolved'

  const fmt = (d: string) =>
    new Date(d).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })

  const ytId = cert.proofVideoUrl?.match(
    /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([^&?]+)/
  )?.[1]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-mono font-bold text-amber-400">{spot.caseId}</h1>
          <span
            className={`px-3 py-1 rounded-full text-sm font-mono font-bold uppercase tracking-wider ${
              resolved ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
            }`}
          >
            {spot.status}
          </span>
        </div>

        <div className="flex items-center gap-3">
          {spot.lbRemoved && spot.status !== 'false_positive' && (
            <button
              onClick={() => setShowFp(true)}
              className="bg-orange-500/10 border-2 border-dashed border-orange-600 hover:border-orange-400 text-orange-400 hover:text-orange-300 font-mono text-sm px-6 py-2 rounded-2xl transition-all hover:bg-orange-500/20 hover:scale-[1.02] active:scale-[0.98]"
            >
              false positive
            </button>
          )}
          {spot.status !== 'false_positive' && (
            <button
              onClick={toggle}
              disabled={toggling}
              className={`${
                resolved
                  ? 'bg-red-500/10 border-red-600 hover:border-red-400 text-red-400 hover:text-red-300 hover:bg-red-500/20'
                  : 'bg-green-500/10 border-green-600 hover:border-green-400 text-green-400 hover:text-green-300 hover:bg-green-500/20'
              } border-2 border-dashed font-mono text-sm px-6 py-2 rounded-2xl transition-all disabled:opacity-50 hover:scale-[1.02] active:scale-[0.98]`}
            >
              {toggling ? 'updating...' : resolved ? 'mark unresolved' : 'mark resolved'}
            </button>
          )}
        </div>
      </div>

      {showFp && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-8">
          <div className="bg-gradient-to-br from-zinc-900/90 to-black/90 border-4 border-orange-900/40 rounded-3xl max-w-lg w-full p-6 shadow-2xl">
            <h3 className="text-xl font-mono font-bold text-orange-400 mb-2">false positive</h3>
            <p className="font-mono text-sm text-amber-300/50 mb-4">
              restores lb position and marks case invalid
            </p>
            <div className="mb-6">
              <label className="block font-mono text-xs uppercase text-amber-500/60 font-bold mb-2">
                why is this a false positive?
              </label>
              <textarea
                className="w-full bg-zinc-950/50 border-2 border-amber-900/40 text-amber-200 font-mono rounded-xl p-3 h-24 focus:border-orange-500 outline-none transition-colors"
                placeholder="explain..."
                value={fpReason}
                onChange={(e) => setFpReason(e.target.value)}
              />
            </div>
            <div className="flex gap-4">
              <button
                onClick={() => {
                  setShowFp(false)
                  setFpReason('')
                }}
                className="flex-1 bg-zinc-800/50 hover:bg-zinc-700/50 border-2 border-amber-900/40 text-amber-200 font-mono py-2 rounded-xl transition-colors"
              >
                cancel
              </button>
              <button
                onClick={markFp}
                disabled={!fpReason || marking}
                className="flex-1 bg-orange-500/10 border-2 border-dashed border-orange-600 hover:border-orange-400 text-orange-400 hover:text-orange-300 font-mono py-2 rounded-xl transition-all hover:bg-orange-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {marking ? 'marking...' : 'confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-gradient-to-br from-red-900/20 to-black/90 border-4 border-red-900/40 rounded-3xl p-6 shadow-2xl">
            <h3 className="text-red-400 font-mono font-bold uppercase tracking-wider text-sm mb-3">
              why was this flagged?
            </h3>
            <p className="font-mono text-amber-200 leading-relaxed">{spot.reasoning}</p>

            {spot.fpReason && (
              <div className="mt-4 bg-orange-500/10 border border-orange-500/40 rounded-xl p-3">
                <p className="font-mono text-xs uppercase text-orange-400/70 font-bold mb-1">
                  false positive reason
                </p>
                <p className="font-mono text-orange-200 text-sm">{spot.fpReason}</p>
              </div>
            )}

            {!spot.lbRemoved && (
              <div className="mt-4 inline-flex items-center gap-2 bg-orange-500/10 border border-orange-500/40 text-orange-400 font-mono text-xs px-3 py-1.5 rounded-xl">
                lb not reduced - minor case for reference only
              </div>
            )}

            {spot.notes && (
              <div className="mt-6 pt-6 border-t border-red-900/20">
                <h4 className="text-amber-500/60 font-mono font-bold uppercase text-xs mb-2">
                  staff notes (internal)
                </h4>
                <p className="font-mono text-amber-300/70 italic text-sm">{spot.notes}</p>
              </div>
            )}

            <div className="mt-6 flex items-center gap-2 font-mono text-sm text-amber-500/60">
              <span>flagged by</span>
              <div className="flex items-center gap-2 text-amber-200 font-medium bg-zinc-900/50 px-2 py-1 rounded-xl">
                {staff.avatar && (
                  <Image
                    src={staff.avatar}
                    alt=""
                    width={20}
                    height={20}
                    className="w-5 h-5 rounded"
                  />
                )}
                {staff.username}
              </div>
              <span>on {fmt(spot.createdAt)}</span>
            </div>
          </div>

          <div className="bg-gradient-to-br from-zinc-900/90 to-black/90 border-4 border-amber-900/40 rounded-3xl shadow-2xl overflow-hidden">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-mono font-bold text-amber-500">original cert &amp; review</h3>
                <button
                  onClick={copy}
                  className="font-mono text-xs text-amber-500/60 hover:text-amber-300 border border-amber-900/40 hover:border-amber-700/50 px-3 py-1 rounded-xl transition-colors"
                >
                  {copied ? 'copied!' : 'copy deets'}
                </button>
              </div>

              <div className="space-y-3 font-mono text-sm mb-6">
                <div className="flex justify-between pb-3 border-b border-amber-900/20">
                  <span className="text-amber-500/60">project</span>
                  <span className="text-amber-200 font-bold">{cert.projectName}</span>
                </div>
                <div className="flex justify-between pb-3 border-b border-amber-900/20">
                  <span className="text-amber-500/60">verdict</span>
                  <span className="text-amber-200 font-bold uppercase">{cert.status}</span>
                </div>
                <div className="flex justify-between pb-3 border-b border-amber-900/20">
                  <span className="text-amber-500/60">feedback</span>
                  <span className="text-right text-amber-300/80 italic max-w-md">
                    "{cert.reviewFeedback}"
                  </span>
                </div>
              </div>

              <div className="flex gap-3">
                {cert.ftProjectId && (
                  <a
                    href={`${process.env.NEXT_PUBLIC_FLAVORTOWN_URL}/projects/${cert.ftProjectId}`}
                    target="_blank"
                    className="text-blue-400 hover:underline font-mono text-sm"
                  >
                    ft project
                  </a>
                )}
                {cert.repoUrl && (
                  <a
                    href={cert.repoUrl}
                    target="_blank"
                    className="text-blue-400 hover:underline font-mono text-sm"
                  >
                    repo
                  </a>
                )}
                {cert.demoUrl && (
                  <a
                    href={cert.demoUrl}
                    target="_blank"
                    className="text-blue-400 hover:underline font-mono text-sm"
                  >
                    demo
                  </a>
                )}
                <a
                  href={`/admin/ship_certifications/${cert.id}/edit`}
                  className="text-amber-400 hover:underline font-mono text-sm"
                >
                  ship cert
                </a>
              </div>
            </div>

            {cert.proofVideoUrl && (
              <div className="aspect-video bg-black">
                {ytId ? (
                  <iframe
                    src={`https://www.youtube.com/embed/${ytId}`}
                    className="w-full h-full"
                    allowFullScreen
                  />
                ) : (
                  <video src={cert.proofVideoUrl} controls className="w-full h-full" />
                )}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-gradient-to-br from-zinc-900/90 to-black/90 border-4 border-amber-900/40 rounded-3xl p-6 text-center shadow-2xl">
            <h3 className="text-amber-500/60 font-mono text-xs uppercase tracking-wider mb-4">
              {reviewed.role}
            </h3>
            {reviewed.avatar && (
              <div className="flex justify-center mb-4">
                <Image
                  src={reviewed.avatar}
                  alt=""
                  width={80}
                  height={80}
                  className="w-20 h-20 rounded"
                />
              </div>
            )}
            <h2 className="text-xl font-mono font-bold text-amber-200 mb-2">{reviewed.username}</h2>
            <Link
              href={`/admin/spot_checks/${reviewed.id}`}
              className="text-sm text-blue-400 hover:text-blue-300 font-mono"
            >
              view profile
            </Link>
          </div>

          {resolved && spot.resolver && (
            <div className="bg-gradient-to-br from-green-900/20 to-black/90 border-4 border-green-900/40 rounded-3xl p-6 text-center shadow-2xl">
              <div className="text-green-400 font-mono font-bold mb-2">resolved</div>
              <div className="font-mono text-sm text-amber-500/60">
                by {spot.resolver.username}
                <br />
                {fmt(spot.resolvedAt)}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
