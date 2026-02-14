'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { CommitChart } from '@/components/commit-chart'
import { TimeChart } from '@/components/time-chart'

interface Commit {
  sha: string
  msg: string
  author: string
  adds: number
  dels: number
  ts: string
}

interface Media {
  url: string
  type: string
}

interface Devlog {
  id: string
  ftDevlogId: string
  desc: string | null
  media: Media[]
  origSecs: number
  status: string
  approvedMins: number | null
  notes: string | null
  commits: Commit[]
}

interface ShipCert {
  id: number
  ftProjectId: string | null
  ftUsername: string | null
  projectName: string | null
  projectType: string | null
  description: string | null
  demoUrl: string | null
  repoUrl: string | null
  readmeUrl: string | null
  proofVideoUrl: string | null
  devTime: string | null
  reviewer: { username: string } | null
  reviewCompletedAt: Date | null
  createdAt: Date
}

interface ReviewData {
  id: number
  status: string
  returnReason: string | null
  shipCert: ShipCert
  devlogs: Devlog[]
  reviewer: { username: string } | null
  aiDeclaration?: string | null
  fraudUrls?: { billy: string; joe: string } | null
}

interface Props {
  data: ReviewData
  canEdit: boolean
}

interface LocalDevlog {
  id: string
  status: string
  approvedMins: number
  notes: string
}

const RETURN_REASONS = [
  'Functionality not clearly demonstrated',
  'Unclear or confusing cert video',
  'Technical issues in cert video',
  'Insufficient proof in cert video that project works',
  'Demo Link not working during YSWS review',
  'GitHub repository not accessible',
  'No demo video provided',
  'No AI use declaration',
  'Insufficient README',
  'Project started before Flavortown, but not labelled as an updated project.',
  'Other certification-related issues',
]

export function Review({ data, canEdit }: Props) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [showReturn, setShowReturn] = useState(false)
  const [returnReasons, setReturnReasons] = useState<string[]>([])
  const [customReturnReason, setCustomReturnReason] = useState('')
  const [demoOpened, setDemoOpened] = useState(false)
  const [repoOpened, setRepoOpened] = useState(false)

  const [local, setLocal] = useState<LocalDevlog[]>(
    data.devlogs.map((d) => ({
      id: d.id,
      status: d.status,
      approvedMins: d.approvedMins ?? Math.floor(d.origSecs / 60),
      notes: d.notes || '',
    }))
  )
  const [showReport, setShowReport] = useState(false)
  const [reportReason, setReportReason] = useState('')
  const [reportBusy, setReportBusy] = useState(false)
  const [refreshBusy, setRefreshBusy] = useState(false)
  const [showRefreshWarn, setShowRefreshWarn] = useState(false)

  const totalSecs = data.devlogs.reduce((s, d) => s + d.origSecs, 0)
  const avgSecs = data.devlogs.length > 0 ? totalSecs / data.devlogs.length : 0
  const maxSecs = data.devlogs.length > 0 ? Math.max(...data.devlogs.map((d) => d.origSecs)) : 0
  const oneHrCount = data.devlogs.filter((d) => d.origSecs >= 3600).length

  const fmtTime = (secs: number) => {
    const hrs = Math.floor(secs / 3600)
    const mins = Math.floor((secs % 3600) / 60)
    return `${hrs}h ${mins}m`
  }

  const fmtMins = (secs: number) => Math.floor(secs / 60)

  const upd = (id: string, changes: Partial<LocalDevlog>) => {
    setLocal((prev) => prev.map((d) => (d.id === id ? { ...d, ...changes } : d)))
  }

  const cap600 = () => {
    setLocal((prev) => prev.map((d) => (d.approvedMins > 600 ? { ...d, approvedMins: 600 } : d)))
  }

  const approveAll = () => {
    setLocal((prev) => prev.map((d) => ({ ...d, status: 'approved' })))
  }

  const rejectAll = () => {
    setLocal((prev) => prev.map((d) => ({ ...d, status: 'rejected', approvedMins: 0 })))
  }

  const submit = async (action: 'complete' | 'return', extra?: object) => {
    setBusy(true)
    try {
      const res = await fetch(`/api/admin/ysws_reviews/${data.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, devlogs: local, ...extra }),
      })
      if (res.ok) {
        router.push('/admin/ysws_reviews?success=1')
      }
    } finally {
      setBusy(false)
    }
  }

  const getLocal = (id: string) =>
    local.find((d) => d.id === id) ?? { id, status: 'pending', approvedMins: 0, notes: '' }

  const submitReport = async () => {
    if (!reportReason.trim()) return
    setReportBusy(true)
    try {
      await fetch(`/api/admin/ysws_reviews/${data.id}/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ftProjectId: data.shipCert.ftProjectId,
          details: `YSWS Review is reporting this project: ${reportReason}`,
        }),
      })
      setShowReport(false)
      setReportReason('')
    } finally {
      setReportBusy(false)
    }
  }

  const refreshData = async () => {
    setRefreshBusy(true)
    setShowRefreshWarn(false)

    fetch(`/api/admin/ysws_reviews/${data.id}/refresh`, {
      method: 'POST',
    })
      .then((res) => {
        if (res.ok) {
          router.refresh()
        }
        setRefreshBusy(false)
      })
      .catch(() => {
        setRefreshBusy(false)
      })
  }

  return (
    <div className="w-full">
      <Link
        href="/admin/ysws_reviews"
        className="text-amber-400 font-mono text-sm hover:text-amber-300 transition-colors mb-4 md:mb-6 inline-flex items-center gap-2"
      >
        ← back
      </Link>

      <div className="flex items-start justify-between gap-4 mb-4 md:mb-8">
        <div className="min-w-0">
          <h1 className="text-2xl md:text-4xl font-mono text-amber-400 mb-1 md:mb-2">
            YSWS Review
          </h1>
          <h2 className="text-lg md:text-2xl font-mono text-amber-300 truncate">
            {data.shipCert.projectName}
          </h2>
        </div>
        <div className="shrink-0 flex gap-2">
          <button
            onClick={() => setShowRefreshWarn(true)}
            disabled={refreshBusy}
            className="bg-purple-950/30 text-purple-400 border-2 border-purple-700/60 hover:bg-purple-900/40 px-4 py-2 rounded-2xl font-mono text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {refreshBusy ? 'refreshing...' : 'FORCE reload Data'}
          </button>
          <button
            onClick={() => setShowReport(true)}
            className="bg-red-950/30 text-red-400 border-2 border-red-700/60 hover:bg-red-900/40 px-4 py-2 rounded-2xl font-mono text-sm transition-all"
          >
            🚩 Report to Fraud Squad!
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 mb-4 md:mb-6">
        <div className="lg:col-span-2 space-y-4 md:space-y-6">
          {data.shipCert.proofVideoUrl && (
            <div className="bg-gradient-to-br from-zinc-900/90 to-black/90 border-4 border-amber-900/40 rounded-3xl p-4 md:p-6 shadow-xl shadow-amber-950/20">
              <h3 className="text-amber-400 font-mono text-sm font-bold mb-2 md:mb-3">
                Ship Cert Video
              </h3>
              <video
                src={data.shipCert.proofVideoUrl}
                controls
                className="w-full max-w-md rounded-xl"
              />
            </div>
          )}

          <div className="bg-gradient-to-br from-zinc-900/90 to-black/90 border-4 border-amber-900/40 rounded-3xl p-4 md:p-6 shadow-xl shadow-amber-950/20">
            <h3 className="text-amber-400 font-mono text-sm font-bold mb-2 md:mb-3">Time Stats</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-zinc-950/50 border-2 border-amber-900/30 rounded-2xl p-3 text-center">
                <div className="text-gray-400 font-mono text-xs mb-1">Total Time</div>
                <div className="text-white font-mono text-lg font-bold">{fmtTime(totalSecs)}</div>
              </div>
              <div className="bg-zinc-950/50 border-2 border-amber-900/30 rounded-2xl p-3 text-center">
                <div className="text-gray-400 font-mono text-xs mb-1">Avg per Devlog</div>
                <div className="text-white font-mono text-lg font-bold">{fmtTime(avgSecs)}</div>
              </div>
              <div className="bg-zinc-950/50 border-2 border-amber-900/30 rounded-2xl p-3 text-center">
                <div className="text-gray-400 font-mono text-xs mb-1">Longest</div>
                <div className="text-white font-mono text-lg font-bold">{fmtTime(maxSecs)}</div>
              </div>
              <div className="bg-zinc-950/50 border-2 border-amber-900/30 rounded-2xl p-3 text-center">
                <div className="text-gray-400 font-mono text-xs mb-1">Devlogs ≥1hr</div>
                <div className="text-white font-mono text-lg font-bold">
                  {oneHrCount}/{data.devlogs.length}
                </div>
              </div>
            </div>
            <TimeChart devlogs={data.devlogs} />
          </div>
        </div>

        <div className="space-y-4 md:space-y-6">
          <div className="bg-gradient-to-br from-zinc-900/90 to-black/90 border-4 border-amber-900/40 rounded-3xl p-4 md:p-6 shadow-xl shadow-amber-950/20">
            <h3 className="text-amber-400 font-mono text-sm font-bold mb-3 md:mb-4">Details</h3>
            <div className="space-y-3 text-sm font-mono">
              <div>
                <span className="text-gray-400">Project:</span>{' '}
                <a
                  href={`${process.env.NEXT_PUBLIC_FLAVORTOWN_URL}/projects/${data.shipCert.ftProjectId}`}
                  target="_blank"
                  className="text-amber-400 hover:text-amber-300 underline"
                >
                  {data.shipCert.projectName}
                </a>
              </div>
              <div>
                <span className="text-gray-400">Submitter:</span>{' '}
                <span className="text-white">{data.shipCert.ftUsername}</span>
                {data.fraudUrls && (
                  <div className="flex gap-2 mt-2">
                    <a
                      href={data.fraudUrls.billy}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-amber-900/40 text-amber-200 px-3 py-1.5 rounded-xl font-mono text-xs hover:bg-amber-800/50 hover:scale-[1.02] active:scale-[0.98] transition-all border-2 border-amber-900/40"
                    >
                      Billy
                    </a>
                    <a
                      href={data.fraudUrls.joe}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-amber-900/40 text-amber-200 px-3 py-1.5 rounded-xl font-mono text-xs hover:bg-amber-800/50 hover:scale-[1.02] active:scale-[0.98] transition-all border-2 border-amber-900/40"
                    >
                      Joe
                    </a>
                  </div>
                )}
              </div>
              <div>
                <span className="text-gray-400">Type:</span>{' '}
                <span className="text-white">{data.shipCert.projectType || 'unknown'}</span>
              </div>
              {data.aiDeclaration !== undefined && (
                <div>
                  <span className="text-gray-400">AI Declaration:</span>{' '}
                  <span
                    className={data.aiDeclaration ? 'text-amber-300' : 'text-red-400 font-bold'}
                  >
                    {data.aiDeclaration || 'NOT DECLARED!'}
                  </span>
                </div>
              )}
              <div>
                <span className="text-gray-400">Ship Certified:</span>{' '}
                <span className="text-green-400">{data.shipCert.reviewer?.username || '-'}</span>
              </div>
              <div>
                <span className="text-gray-400">YSWS Status:</span>{' '}
                <span
                  className={
                    data.status === 'done'
                      ? 'text-green-400'
                      : data.status === 'returned'
                        ? 'text-red-400'
                        : 'text-yellow-400'
                  }
                >
                  {data.status}
                </span>
              </div>
              {data.reviewer && (
                <div>
                  <span className="text-gray-400">YSWS Reviewer:</span>{' '}
                  <span className="text-white">{data.reviewer.username}</span>
                </div>
              )}
              {data.returnReason && (
                <div>
                  <span className="text-gray-400">Return Reason:</span>{' '}
                  <span className="text-red-400">{data.returnReason}</span>
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-amber-900/30">
              {data.shipCert.repoUrl && (
                <a
                  href={data.shipCert.repoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setRepoOpened(true)}
                  onAuxClick={() => setRepoOpened(true)}
                  className="bg-amber-900/50 text-amber-300 px-3 py-1.5 rounded font-mono text-xs hover:bg-amber-800/50 transition-colors"
                >
                  Repo
                </a>
              )}
              {data.shipCert.demoUrl && (
                <a
                  href={data.shipCert.demoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setDemoOpened(true)}
                  onAuxClick={() => setDemoOpened(true)}
                  className="bg-amber-900/50 text-amber-300 px-3 py-1.5 rounded font-mono text-xs hover:bg-amber-800/50 transition-colors"
                >
                  Demo
                </a>
              )}
              {data.shipCert.readmeUrl && (
                <a
                  href={data.shipCert.readmeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-amber-900/50 text-amber-300 px-3 py-1.5 rounded font-mono text-xs hover:bg-amber-800/50 transition-colors"
                >
                  Readme
                </a>
              )}
              <a
                href={`/admin/ship_certifications/${data.shipCert.id}/edit`}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-orange-900/50 text-orange-300 px-3 py-1.5 rounded font-mono text-xs hover:bg-orange-800/50 transition-colors"
              >
                Ship Cert
              </a>
            </div>
          </div>

          {data.shipCert.description && (
            <div className="bg-gradient-to-br from-zinc-900/90 to-black/90 border-4 border-amber-900/40 rounded-3xl p-4 md:p-6 shadow-xl shadow-amber-950/20">
              <h3 className="text-amber-400 font-mono text-sm font-bold mb-2 md:mb-3">
                Description
              </h3>
              <div className="bg-zinc-950/50 border-2 border-amber-900/30 rounded-2xl p-3">
                <pre className="text-gray-300 font-mono text-sm whitespace-pre-wrap">
                  {data.shipCert.description}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-gradient-to-br from-red-950/30 to-black/90 border-4 border-red-900/40 rounded-3xl p-4 md:p-6 shadow-xl shadow-red-950/20 mb-4 md:mb-6">
        <h3 className="text-red-400 font-mono text-sm font-bold mb-3">
          Note from da boss of YSWS - Alex (aka AVD)
        </h3>
        <div className="bg-zinc-950/50 border-2 border-red-900/30 rounded-2xl p-4">
          <div className="text-red-300 font-mono text-sm mb-2 font-bold">Reject if:</div>
          <ul className="space-y-1.5 text-gray-300 font-mono text-sm list-disc list-inside">
            <li>
              low quality to the point it doesn't do what it says it does (shipwrights messed up -
              return to them)
            </li>
            <li>Looks like ai, but is undeclared (check declaration on the ft project page) </li>
            <li>Looks like over 30% ai - even if it is declared</li>
            <li>Looks like it isn't shipped (shipwrights messed up)</li>
            <li>last project edit was before the event launch</li>
            <li>
              project was worked on before event, and not marked as Project Update: in description
              (return to shipwrights)
            </li>
          </ul>
        </div>
      </div>

      <div className="bg-gradient-to-br from-zinc-900/90 to-black/90 border-4 border-amber-900/40 rounded-3xl p-4 md:p-6 shadow-xl shadow-amber-950/20 mb-4 md:mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-amber-400 font-mono text-sm font-bold">
            Devlogs ({data.devlogs.length})
          </h3>
        </div>
        {data.devlogs.length === 0 ? (
          <div className="text-gray-500 font-mono text-sm text-center py-8">
            no devlogs found...
          </div>
        ) : (
          <div className="space-y-6">
            {data.devlogs.map((d) => {
              const loc = getLocal(d.id)
              return (
                <div
                  key={d.id}
                  className="border-b border-amber-900/30 pb-6 last:border-b-0 last:pb-0"
                >
                  <div className="flex flex-col lg:flex-row gap-6">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-3">
                        <span className="text-purple-400 font-mono text-base font-bold">
                          Devlog #{d.ftDevlogId}
                        </span>
                        {loc.status === 'approved' && (
                          <span className="bg-green-900/50 text-green-300 px-2 py-0.5 rounded text-xs font-mono">
                            Approved
                          </span>
                        )}
                        {loc.status === 'rejected' && (
                          <span className="bg-red-900/50 text-red-300 px-2 py-0.5 rounded text-xs font-mono">
                            Rejected
                          </span>
                        )}
                      </div>

                      {d.desc && <p className="text-gray-300 font-mono text-sm mb-4">{d.desc}</p>}

                      {d.media?.length > 0 && (
                        <div className="mb-4">
                          <div className="text-gray-400 font-mono text-xs mb-2">Devlog Media</div>
                          <div className="flex flex-wrap gap-3">
                            {d.media.map((m, i) =>
                              m.type.startsWith('video') ? (
                                <video
                                  key={i}
                                  src={m.url}
                                  controls
                                  className="rounded-xl bg-zinc-800 max-w-md"
                                />
                              ) : (
                                <a key={i} href={m.url} target="_blank" rel="noopener">
                                  <img
                                    src={m.url}
                                    alt="devlog"
                                    className="rounded-xl bg-zinc-800 object-cover w-80 h-auto hover:opacity-80 transition-opacity cursor-zoom-in"
                                  />
                                </a>
                              )
                            )}
                          </div>
                        </div>
                      )}

                      <div className="text-amber-400 font-mono text-sm">
                        Original Time:{' '}
                        <span className="text-white">{d.origSecs.toLocaleString()} seconds</span>{' '}
                        <em className="text-gray-400">({fmtTime(d.origSecs)})</em>
                      </div>

                      {d.commits.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-zinc-700">
                          <div className="text-gray-400 font-mono text-xs mb-2">
                            {(() => {
                              const sortedCommits = [...d.commits].sort(
                                (a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime()
                              )
                              const firstSha = sortedCommits[0]?.sha
                              const lastSha = sortedCommits[sortedCommits.length - 1]?.sha
                              const repoUrl = data.shipCert.repoUrl
                              if (repoUrl && firstSha && lastSha && firstSha !== lastSha) {
                                const compareUrl = `${repoUrl.replace(/\/$/, '')}/compare/${firstSha}...${lastSha}`
                                return (
                                  <a
                                    href={compareUrl}
                                    target="_blank"
                                    rel="noopener"
                                    className="text-amber-400 hover:text-amber-300 underline"
                                  >
                                    Git Activity
                                  </a>
                                )
                              }
                              return 'Git Activity'
                            })()}
                          </div>
                          <CommitChart
                            commits={d.commits.map((c) => ({ ...c, ts: new Date(c.ts) }))}
                            repoUrl={data.shipCert.repoUrl ?? undefined}
                          />
                        </div>
                      )}
                    </div>

                    {canEdit && (
                      <div className="w-full lg:w-72 shrink-0 self-start bg-zinc-900 border border-zinc-700 rounded-xl p-4 space-y-4">
                        <div className="text-white font-mono text-sm font-bold">
                          Review Decision
                        </div>

                        <div>
                          <div className="text-gray-400 font-mono text-xs mb-2">Status:</div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => upd(d.id, { status: 'approved' })}
                              className={`flex-1 px-3 py-2 rounded font-mono text-xs flex items-center justify-center gap-1 ${loc.status === 'approved' ? 'bg-green-600 text-white' : 'bg-zinc-800 text-gray-300 hover:bg-zinc-700'}`}
                            >
                              ✓ Approve
                            </button>
                            <button
                              onClick={() => upd(d.id, { status: 'rejected', approvedMins: 0 })}
                              className={`flex-1 px-3 py-2 rounded font-mono text-xs flex items-center justify-center gap-1 ${loc.status === 'rejected' ? 'bg-red-600 text-white' : 'bg-zinc-800 text-gray-300 hover:bg-zinc-700'}`}
                            >
                              ✗ Reject
                            </button>
                          </div>
                        </div>

                        <div>
                          <div className="text-gray-400 font-mono text-xs mb-2">
                            Approved Minutes:
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              value={loc.approvedMins}
                              onChange={(e) =>
                                upd(d.id, { approvedMins: parseInt(e.target.value) || 0 })
                              }
                              className="w-20 bg-zinc-800 text-white px-3 py-1.5 rounded font-mono text-sm border border-zinc-600"
                            />
                            <span className="text-gray-400 font-mono text-xs">minutes</span>
                          </div>
                          <div className="flex flex-wrap gap-1.5 mt-3">
                            <button
                              onClick={() =>
                                upd(d.id, { approvedMins: Math.floor(fmtMins(d.origSecs) * 0.5) })
                              }
                              className="bg-purple-900/60 text-purple-300 px-2.5 py-1 rounded font-mono text-xs hover:bg-purple-800/60"
                            >
                              50%
                            </button>
                            <button
                              onClick={() =>
                                upd(d.id, { approvedMins: Math.floor(fmtMins(d.origSecs) * 0.25) })
                              }
                              className="bg-purple-900/60 text-purple-300 px-2.5 py-1 rounded font-mono text-xs hover:bg-purple-800/60"
                            >
                              25%
                            </button>
                            <button
                              onClick={() => upd(d.id, { approvedMins: fmtMins(d.origSecs) - 30 })}
                              className="bg-amber-900/60 text-amber-300 px-2.5 py-1 rounded font-mono text-xs hover:bg-amber-800/60"
                            >
                              -30min
                            </button>
                            <button
                              onClick={() => upd(d.id, { approvedMins: fmtMins(d.origSecs) - 60 })}
                              className="bg-amber-900/60 text-amber-300 px-2.5 py-1 rounded font-mono text-xs hover:bg-amber-800/60"
                            >
                              -1hr
                            </button>
                            <button
                              onClick={() => upd(d.id, { approvedMins: fmtMins(d.origSecs) })}
                              className="bg-zinc-700 text-gray-300 px-2.5 py-1 rounded font-mono text-xs hover:bg-zinc-600"
                            >
                              Reset
                            </button>
                          </div>
                        </div>

                        <div>
                          <div className="text-gray-400 font-mono text-xs mb-2">
                            Internal Notes:
                          </div>
                          <textarea
                            value={loc.notes}
                            onChange={(e) => upd(d.id, { notes: e.target.value })}
                            className="w-full bg-zinc-800 text-white px-3 py-2 rounded font-mono text-sm h-20 resize-none border border-zinc-600"
                            placeholder="notes..."
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {canEdit && (
        <div className="bg-gradient-to-br from-zinc-900/90 to-black/90 border-4 border-amber-900/40 rounded-3xl p-4 md:p-6 shadow-2xl shadow-amber-950/30">
          {(!demoOpened || !repoOpened) && (
            <div className="bg-red-950/30 border-2 border-red-700/60 rounded-xl p-3 mb-4">
              <div className="text-red-400 font-mono text-sm font-bold mb-1">
                Checklist (do this if u don't wanna Alex to get mad..)
              </div>
              <div className="text-red-300 font-mono text-xs space-y-1">
                {data.shipCert.demoUrl && !demoOpened && (
                  <div>
                    •{' '}
                    <a
                      href={data.shipCert.demoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => setDemoOpened(true)}
                      className="text-red-300 hover:text-red-200 underline"
                    >
                      Check the Demo link (cuz u didn't..)
                    </a>
                  </div>
                )}
                {data.shipCert.repoUrl && !repoOpened && (
                  <div>
                    •{' '}
                    <a
                      href={data.shipCert.repoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => setRepoOpened(true)}
                      className="text-red-300 hover:text-red-200 underline"
                    >
                      Check the Repo link (cuz u didn't..)
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}
          <div className="flex flex-col sm:flex-row gap-3 md:gap-4 justify-center">
            <button
              onClick={cap600}
              className="bg-zinc-700 text-white px-4 py-2 rounded-2xl font-mono text-sm hover:bg-zinc-600 transition-all"
            >
              Cap Devlogs to 600 min
            </button>
            <button
              onClick={approveAll}
              className="bg-green-950/30 text-green-400 border-2 border-green-700/60 hover:bg-green-900/40 px-4 py-2 rounded-2xl font-mono text-sm transition-all"
            >
              Approve All Devlogs
            </button>
            <button
              onClick={rejectAll}
              className="bg-red-950/30 text-red-400 border-2 border-red-700/60 hover:bg-red-900/40 px-4 py-2 rounded-2xl font-mono text-sm transition-all"
            >
              Reject All Devlogs
            </button>
            <button
              onClick={() => setShowReturn(true)}
              className="bg-orange-950/30 text-orange-400 border-2 border-orange-700/60 hover:bg-orange-900/40 px-4 py-2 rounded-2xl font-mono text-sm transition-all"
            >
              Return to Ship Certs
            </button>
            <button
              onClick={() => submit('complete')}
              className="bg-cyan-950/30 text-cyan-400 border-2 border-cyan-700/60 hover:bg-cyan-900/40 px-4 py-2 rounded-2xl font-mono text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={
                busy ||
                (!!data.shipCert.demoUrl && !demoOpened) ||
                (!!data.shipCert.repoUrl && !repoOpened)
              }
            >
              Complete Review
            </button>
          </div>
        </div>
      )}

      {showReturn && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border-2 border-amber-800 rounded-2xl p-6 max-w-lg w-full max-h-[80vh] overflow-y-auto">
            <h3 className="text-white font-mono text-lg mb-2">Return to Ship Certs</h3>
            <p className="text-gray-400 font-mono text-sm mb-4">why u returning this:</p>
            <div className="space-y-2 mb-4">
              {RETURN_REASONS.map((r) => (
                <label
                  key={r}
                  className="flex items-center gap-2 text-gray-300 font-mono text-sm cursor-pointer hover:text-white"
                >
                  <input
                    type="checkbox"
                    checked={returnReasons.includes(r)}
                    onChange={(e) =>
                      setReturnReasons((prev) =>
                        e.target.checked ? [...prev, r] : prev.filter((x) => x !== r)
                      )
                    }
                    className="accent-amber-500"
                  />
                  {r}
                </label>
              ))}
            </div>
            <div className="mb-6">
              <label className="text-gray-400 font-mono text-sm mb-2 block">
                Additional details (optional):
              </label>
              <textarea
                value={customReturnReason}
                onChange={(e) => setCustomReturnReason(e.target.value)}
                className="w-full bg-zinc-800 text-white px-3 py-2 rounded font-mono text-sm h-20 resize-none border border-zinc-600"
                placeholder="Add any extra context..."
              />
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowReturn(false)}
                className="bg-gray-700 text-gray-300 px-4 py-2 rounded-xl font-mono text-sm disabled:opacity-50"
                disabled={busy}
              >
                nvm
              </button>
              <button
                onClick={() => {
                  const allReasons = [...returnReasons]
                  if (customReturnReason.trim()) {
                    allReasons.push(customReturnReason.trim())
                  }
                  submit('return', { returnReason: allReasons.join(', ') })
                }}
                className="bg-orange-700 text-white px-4 py-2 rounded-xl font-mono text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={busy || (returnReasons.length === 0 && !customReturnReason.trim())}
              >
                {busy ? 'returning...' : 'yeet it back'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showReport && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border-2 border-red-800 rounded-2xl p-6 max-w-lg w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-mono text-lg">🚩 Report to Fraud Squad</h3>
              <button
                onClick={() => setShowReport(false)}
                className="text-gray-400 hover:text-white text-xl"
              >
                ✕
              </button>
            </div>
            <p className="text-gray-400 font-mono text-sm mb-4">What sus stuff did you see?</p>
            <textarea
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              className="w-full bg-zinc-800 text-white px-3 py-2 rounded font-mono text-sm h-32 resize-none border border-zinc-600 mb-4"
              placeholder="Describe the suspicious activity..."
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowReport(false)}
                className="bg-gray-700 text-gray-300 px-4 py-2 rounded-xl font-mono text-sm"
              >
                Cancel
              </button>
              <button
                onClick={submitReport}
                className="bg-red-700 text-white px-4 py-2 rounded-xl font-mono text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={reportBusy || !reportReason.trim()}
              >
                {reportBusy ? 'Submitting...' : 'Submit'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showRefreshWarn && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-5 max-w-lg w-full">
            <div className="text-purple-400 font-mono text-base mb-4">listen up kid</div>
            <div className="space-y-2 mb-5">
              <div className="text-purple-300 font-mono text-sm">
                this refetches ALL devlogs, commits, and media from FT + GitHub
              </div>
              <div className="text-purple-300 font-mono text-sm">it can take 1-5 min</div>
              <div className="text-red-400 font-mono text-sm mt-3">
                don't abuse ts or you're done
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowRefreshWarn(false)}
                className="bg-zinc-800 text-gray-300 px-3 py-2 rounded font-mono text-sm hover:bg-zinc-700"
                disabled={refreshBusy}
              >
                sorry i wont touch this, im scared
              </button>
              <button
                onClick={refreshData}
                className="bg-purple-600 text-white px-3 py-2 rounded font-mono text-sm hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={refreshBusy}
              >
                {refreshBusy ? 'refreshing data...' : 'fk u just do ts'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
