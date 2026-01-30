'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { can, PERMS } from '@/lib/perms'
import { useShipCert } from '@/hooks/useShipCert'
import { AiSummary } from './ai-summary'

interface Props {
  shipId: string
}

export function Form({ shipId }: Props) {
  const {
    cert,
    setCert,
    file,
    loading,
    reason,
    setReason,
    note,
    setNote,
    uploading,
    url,
    user,
    show,
    setShow,
    err,
    dragging,
    setDragging,
    showPick,
    picks,
    fraudUrls,
    claimedBy,
    canEditClaim,
    isMyClaim,
    claimed,
    canEdit,
    canOverride,
    isViewOnly,
    submitting,
    startReview,
    unclaim,
    update,
    save,
    del,
    onChange,
    pick,
    fmt,
    upload,
    updateType,
    bounty,
    updateBounty,
    saveBounty,
    bountySaved,
  } = useShipCert(shipId)

  const [timeLeft, setTimeLeft] = useState<number | null>(null)
  const [confirmAction, setConfirmAction] = useState<'approve' | 'reject' | null>(null)

  useEffect(() => {
    if (!cert?.claimedAt) {
      setTimeLeft(null)
      return
    }

    const calc = () => {
      const claimed = new Date(cert.claimedAt!).getTime()
      const now = Date.now()
      const remaining = Math.max(0, 30 * 60 * 1000 - (now - claimed))
      setTimeLeft(Math.floor(remaining / 1000))
    }

    calc()
    const iv = setInterval(calc, 1000)
    return () => clearInterval(iv)
  }, [cert?.claimedAt])

  if (loading) {
    return (
      <main className="bg-grid min-h-screen w-full flex items-center justify-center" role="main">
        <div className="text-amber-400 font-mono">loading...</div>
      </main>
    )
  }

  if (!cert) {
    return (
      <main className="bg-grid min-h-screen w-full flex items-center justify-center" role="main">
        <div className="text-red-400 font-mono">ship not found</div>
      </main>
    )
  }

  const fmtDt = (d: string | null) => (d ? new Date(d).toLocaleString() : '-')
  const created = fmtDt(cert.createdAt)
  const updated = fmtDt(cert.updatedAt)

  return (
    <main
      className="bg-grid min-h-screen w-full p-4 md:p-8"
      role="main"
      onDragOver={(e) => {
        e.preventDefault()
        if (!uploading && canEdit) setDragging(true)
      }}
      onDragLeave={(e) => {
        if (e.currentTarget === e.target) setDragging(false)
      }}
      onDrop={(e) => {
        e.preventDefault()
        setDragging(false)
        if (uploading || !canEdit) return
        const f = e.dataTransfer.files?.[0]
        if (f && f.type.startsWith('video/')) upload(f)
      }}
    >
      {dragging && (
        <div className="fixed inset-0 bg-amber-900/80 z-50 flex items-center justify-center pointer-events-none backdrop-blur-sm">
          <div className="text-white font-mono text-xl md:text-2xl drop-shadow-2xl">
            gimme videos
          </div>
        </div>
      )}
      <div className="w-full">
        <Link
          href="/admin/ship_certifications"
          className="text-amber-400 font-mono text-sm hover:text-amber-300 transition-colors mb-4 md:mb-6 inline-flex items-center gap-2"
        >
          ← back
        </Link>

        <h1 className="text-2xl md:text-4xl font-mono text-amber-400 mb-1 md:mb-2">Edit Cert</h1>
        <h2 className="text-lg md:text-2xl font-mono text-amber-300 mb-4 md:mb-8 truncate">
          {cert.project}
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 mb-4 md:mb-6">
          <div className="lg:col-span-2 space-y-4 md:space-y-6">
            <AiSummary cert={cert} />

            <div className="bg-gradient-to-br from-zinc-900/90 to-black/90 border-4 border-amber-900/40 rounded-3xl p-4 md:p-6 shadow-xl shadow-amber-950/20">
              <h3 className="text-amber-400 font-mono text-sm font-bold mb-2 md:mb-3">
                Description
              </h3>
              <div className="bg-zinc-950/50 border-2 border-amber-900/30 rounded-2xl p-4">
                <pre className="text-gray-300 font-mono text-sm whitespace-pre-wrap">
                  {cert.desc}
                </pre>
              </div>
            </div>

            <div className="bg-gradient-to-br from-zinc-900/90 to-black/90 border-4 border-amber-900/40 rounded-3xl p-4 md:p-6 shadow-xl shadow-amber-950/20">
              <h3 className="text-amber-400 font-mono text-sm font-bold mb-2 md:mb-3">Links</h3>
              <div className="flex flex-wrap gap-3 md:gap-4">
                {cert.links?.demo && (
                  <a
                    href={cert.links.demo}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-amber-400 font-mono text-sm hover:text-amber-300 underline"
                  >
                    Play
                  </a>
                )}
                {cert.links?.repo && (
                  <a
                    href={cert.links.repo}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-amber-400 font-mono text-sm hover:text-amber-300 underline"
                  >
                    Repo
                  </a>
                )}
                {cert.links?.readme && (
                  <a
                    href={cert.links.readme}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-amber-400 font-mono text-sm hover:text-amber-300 underline"
                  >
                    Readme
                  </a>
                )}
              </div>
            </div>

            <div className="bg-gradient-to-br from-zinc-900/90 to-black/90 border-4 border-amber-900/40 rounded-3xl p-4 md:p-6 shadow-xl shadow-amber-950/20">
              <h3 className="text-amber-400 font-mono text-sm font-bold mb-3 md:mb-4">Decision</h3>
              <div className="mb-2 text-gray-400 font-mono text-xs md:text-sm">
                I <span className="text-amber-400">(approve/reject)</span>{' '}
                <span className="text-white truncate">{cert.project}</span> cuz:
              </div>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                disabled={isViewOnly}
                className="w-full bg-zinc-950/50 border-2 border-amber-900/30 text-white font-mono text-sm p-3 rounded-2xl focus:outline-none focus:border-amber-600/50 min-h-[100px] disabled:opacity-50 disabled:cursor-not-allowed"
                placeholder="enter your reasoning here..."
              />
            </div>

            <div className="bg-gradient-to-br from-zinc-900/90 to-black/90 border-4 border-amber-900/40 rounded-3xl p-4 md:p-6 shadow-xl shadow-amber-950/20">
              <h3 className="text-amber-400 font-mono text-sm font-bold mb-3 md:mb-4">
                Proof Video
              </h3>
              <div className="mb-4">
                <label className="block mb-2">
                  <div
                    className={`bg-amber-900/20 border-2 border-dashed border-amber-700/60 rounded-2xl p-4 text-center transition-all ${uploading || isViewOnly ? 'opacity-50 cursor-not-allowed' : 'hover:border-amber-500 cursor-pointer'}`}
                    onDragOver={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      if (!uploading && canEdit) {
                        e.currentTarget.classList.add('border-amber-400', 'bg-amber-900/40')
                      }
                    }}
                    onDragLeave={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      e.currentTarget.classList.remove('border-amber-400', 'bg-amber-900/40')
                    }}
                    onDrop={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      e.currentTarget.classList.remove('border-amber-400', 'bg-amber-900/40')
                      if (uploading || !canEdit) return
                      const f = e.dataTransfer.files?.[0]
                      if (f && f.type.startsWith('video/')) upload(f)
                    }}
                  >
                    <input
                      type="file"
                      accept="video/*"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0]
                        if (f) upload(f)
                      }}
                      disabled={uploading || isViewOnly}
                    />
                    <span className="text-amber-400 font-mono text-sm">
                      {uploading
                        ? 'uploading video...'
                        : file
                          ? `✓ ${file.name}`
                          : 'drag & drop or click to upload'}
                    </span>
                  </div>
                </label>
                {uploading && (
                  <div className="mt-2 text-yellow-400 font-mono text-xs text-center">
                    wait for upload to finish before submitting...
                  </div>
                )}
              </div>
              {(url || cert.proofVideo) && (
                <div className="mb-4">
                  <div className="text-gray-400 font-mono text-xs mb-1">
                    {url ? 'New video:' : 'Current:'}
                  </div>
                  <a
                    href={url || cert.proofVideo}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-amber-400 font-mono text-sm hover:text-amber-300 underline break-all"
                  >
                    {url || cert.proofVideo}
                  </a>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4 md:space-y-6">
            <div className="bg-gradient-to-br from-zinc-900/90 to-black/90 border-4 border-amber-900/40 rounded-3xl p-4 md:p-6 shadow-xl shadow-amber-950/20">
              <div className="flex justify-between items-center mb-3 md:mb-4">
                <h3 className="text-amber-400 font-mono text-sm font-bold">Details</h3>
                {user?.role && can(user.role, PERMS.certs_admin) && (
                  <button
                    onClick={() => setShow(!show)}
                    className="bg-orange-500/10 border border-dashed border-orange-500 hover:border-orange-400 text-orange-400 hover:text-orange-300 font-mono text-xs px-2 py-1 rounded transition-all"
                  >
                    inspect ship deets
                  </button>
                )}
              </div>
              <div className="space-y-3 text-sm font-mono">
                <div>
                  <span className="text-gray-400">Project:</span>{' '}
                  <a
                    href={`${process.env.NEXT_PUBLIC_FLAVORTOWN_URL}/projects/${cert.ftId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-amber-400 hover:text-amber-300 underline"
                  >
                    {cert.project}
                  </a>{' '}
                  <span className="text-gray-500">(FT #{cert.ftId})</span>
                </div>
                <div>
                  <span className="text-gray-400">Submitter:</span>{' '}
                  <span className="text-white">{cert.submitter.username}</span>{' '}
                  <span className="text-gray-500">({cert.submitter.slackId})</span>
                  {fraudUrls &&
                    user?.role &&
                    (can(user.role, PERMS.billy_btn) || can(user.role, PERMS.joe_btn)) && (
                      <div className="flex gap-2 mt-2">
                        <a
                          href={fraudUrls.billy}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bg-amber-900/40 text-amber-200 px-3 py-1.5 rounded-xl font-mono text-xs hover:bg-amber-800/50 hover:scale-[1.02] active:scale-[0.98] transition-all border-2 border-amber-900/40"
                        >
                          Billy
                        </a>
                        <a
                          href={fraudUrls.joe}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bg-amber-900/40 text-amber-200 px-3 py-1.5 rounded-xl font-mono text-xs hover:bg-amber-800/50 hover:scale-[1.02] active:scale-[0.98] transition-all border-2 border-amber-900/40"
                        >
                          Joe
                        </a>
                      </div>
                    )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-400">Type:</span>
                  {user?.role && can(user.role, PERMS.certs_edit) ? (
                    <div
                      className="relative"
                      tabIndex={0}
                      onBlur={(e) => {
                        if (!e.currentTarget.contains(e.relatedTarget)) {
                          const menu = e.currentTarget.querySelector('[data-menu]') as HTMLElement
                          menu?.classList.add('hidden')
                        }
                      }}
                    >
                      <button
                        onClick={(e) => {
                          const menu = e.currentTarget.nextElementSibling as HTMLElement
                          menu.classList.toggle('hidden')
                        }}
                        className="text-white hover:text-amber-400 cursor-pointer underline decoration-dotted"
                      >
                        {cert.type || 'unknown'}
                      </button>
                      <div
                        data-menu
                        className="hidden absolute left-0 top-6 z-50 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl py-1 min-w-[180px]"
                      >
                        {[
                          'CLI',
                          'Cargo',
                          'Web App',
                          'Chat Bot',
                          'Extension',
                          'Desktop App (Windows)',
                          'Desktop App (Linux)',
                          'Desktop App (macOS)',
                          'Minecraft Mods',
                          'Hardware',
                          'Android App',
                          'iOS App',
                          'Other',
                        ].map((t) => (
                          <button
                            key={t}
                            onClick={(e) => {
                              ;(e.currentTarget.parentElement as HTMLElement).classList.add(
                                'hidden'
                              )
                              updateType(t)
                            }}
                            className="block w-full text-left px-3 py-1.5 text-sm text-gray-300 hover:bg-zinc-800 hover:text-white"
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <span className="text-white">{cert.type || 'unknown'}</span>
                  )}
                </div>
                <div>
                  <span className="text-gray-400">Dev Time:</span>{' '}
                  <span className="text-white">{cert.devTime || '-'}</span>
                </div>
                {user?.role && can(user.role, PERMS.certs_bounty) && (
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400">Bounty:</span>
                    <input
                      type="number"
                      value={bounty}
                      onChange={(e) => updateBounty(e.target.value)}
                      placeholder="cookies"
                      step="0.25"
                      min="0"
                      className="bg-zinc-950/50 border border-amber-900/30 text-white font-mono text-sm px-2 py-0.5 rounded w-24 focus:outline-none focus:border-amber-600/50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <button
                      onClick={saveBounty}
                      className="bg-amber-900/30 text-amber-300 px-2 py-0.5 font-mono text-xs hover:bg-amber-900/50 transition-all border border-amber-700/60 rounded"
                    >
                      set
                    </button>
                  </div>
                )}
                <div>
                  <span className="text-gray-400">Created:</span>{' '}
                  <span className="text-white">{created}</span>
                </div>
                <div>
                  <span className="text-gray-400">Last Updated:</span>{' '}
                  <span className="text-white">{updated}</span>
                </div>
                {claimedBy && cert.status === 'pending' && (
                  <div className="pt-2 mt-2 border-t border-orange-700/60">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-orange-400 font-bold">
                        {timeLeft && timeLeft > 0 ? '🔒 Claimed' : '⏰ Claim expired'}
                      </span>
                      {timeLeft !== null && (
                        <span
                          className={`font-mono text-xs ${timeLeft > 0 ? 'text-orange-300' : 'text-red-400'}`}
                        >
                          {timeLeft > 0
                            ? `${Math.floor(timeLeft / 60)}:${(timeLeft % 60).toString().padStart(2, '0')}`
                            : '0:00'}
                        </span>
                      )}
                    </div>
                    <div className="text-xs">
                      <span className="text-gray-400">by:</span>{' '}
                      <span className="text-white">@{claimedBy}</span>
                    </div>
                    {cert.claimedAt && (
                      <div className="text-xs text-gray-500">
                        {new Date(cert.claimedAt).toLocaleString()}
                      </div>
                    )}
                    {isMyClaim && (
                      <button
                        onClick={unclaim}
                        disabled={submitting}
                        className="mt-2 bg-red-900/30 text-red-400 px-3 py-1 font-mono text-xs hover:bg-red-900/50 transition-all border border-red-700/60 rounded disabled:opacity-50"
                      >
                        unclaim
                      </button>
                    )}
                  </div>
                )}
                {cert.assignment && (
                  <div className="pt-2 mt-2 border-t border-gray-700">
                    <div>
                      <span className="text-gray-400">Assigned to:</span>{' '}
                      <a
                        href={`/admin/assignments/${cert.assignment.id}/edit`}
                        className="text-amber-400 hover:text-amber-300 underline"
                      >
                        {cert.assignment.assignee || 'nobody'} (#{cert.assignment.id})
                      </a>
                    </div>
                    <div>
                      <span className="text-gray-400">Status:</span>{' '}
                      <span
                        className={
                          cert.assignment.status === 'completed'
                            ? 'text-green-400'
                            : cert.assignment.status === 'in_progress'
                              ? 'text-blue-400'
                              : 'text-yellow-400'
                        }
                      >
                        {cert.assignment.status}
                      </span>
                    </div>
                    <div className="text-gray-600 text-xs mt-1">
                      be a good boy and dont steal it
                    </div>
                  </div>
                )}
              </div>

              {user?.role && can(user.role, PERMS.certs_admin) && show && (
                <div className="mt-4 pt-4 border-t-2 border-dashed border-orange-600">
                  <div className="bg-black/80 border border-orange-600 p-3 rounded">
                    <pre className="text-gray-300 font-mono text-xs whitespace-pre-wrap break-all">
                      {JSON.stringify(cert, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-gradient-to-br from-zinc-900/90 to-black/90 border-4 border-amber-900/40 rounded-3xl p-4 md:p-6 shadow-xl shadow-amber-950/20">
              <h3 className="text-amber-400 font-mono text-sm font-bold mb-3 md:mb-4">Notes</h3>
              <div className="space-y-3 mb-4 max-h-64 overflow-y-auto">
                {cert.notes && cert.notes.length > 0 ? (
                  cert.notes.map((n) => (
                    <div
                      key={n.id}
                      className="bg-zinc-950/50 border-2 border-amber-900/30 rounded-2xl p-3"
                    >
                      <div className="flex items-start gap-2">
                        {n.author.avatar && (
                          <Image
                            src={n.author.avatar}
                            alt={n.author.username}
                            width={32}
                            height={32}
                            className="w-8 h-8 rounded-full border-2 border-amber-700/50 shadow-lg shadow-amber-900/30"
                          />
                        )}
                        <div className="flex-1">
                          <div className="flex justify-between items-start mb-1">
                            <span className="text-amber-400 font-mono text-xs font-bold">
                              {n.author.username}
                            </span>
                            <div className="flex gap-2 items-center">
                              <span className="text-gray-500 font-mono text-xs">
                                {new Date(n.createdAt).toLocaleString()}
                              </span>
                              {user?.role && can(user.role, PERMS.certs_admin) && (
                                <button
                                  onClick={() => del(n.id)}
                                  className="text-red-400 hover:text-red-300 font-mono text-xs"
                                >
                                  ✕
                                </button>
                              )}
                            </div>
                          </div>
                          <p className="text-gray-300 font-mono text-sm whitespace-pre-wrap break-words">
                            {fmt(n.text)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-gray-500 font-mono text-sm text-center py-4">
                    no notes...
                  </div>
                )}
              </div>
              <div className="relative">
                <textarea
                  value={note}
                  onChange={onChange}
                  disabled={isViewOnly}
                  className="w-full bg-zinc-950/50 border-2 border-amber-900/30 text-white font-mono text-sm p-3 rounded-2xl focus:outline-none focus:border-amber-600/50 min-h-[80px] mb-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  placeholder={
                    isViewOnly ? 'u can only view' : 'whats on ur mind? (use @username to tag)'
                  }
                />
                {showPick && picks.length > 0 && (
                  <div className="absolute z-10 w-full bg-zinc-950 border-2 border-amber-900/40 max-h-40 overflow-y-auto rounded-2xl shadow-2xl shadow-amber-950/40">
                    {picks
                      .filter((u) => u)
                      .map((u) => (
                        <button
                          key={u.id}
                          type="button"
                          onClick={() => pick(u.username)}
                          className="w-full text-left px-3 py-2 hover:bg-amber-950/30 text-amber-200 font-mono text-sm border-b border-amber-900/20 last:border-b-0 flex items-center gap-2 transition-colors"
                        >
                          <div className="w-6 h-6 bg-zinc-900 border border-amber-800/50 rounded flex items-center justify-center font-mono text-xs text-amber-400 overflow-hidden flex-shrink-0">
                            {u.avatar ? (
                              <Image
                                src={u.avatar}
                                alt={u.username}
                                width={24}
                                height={24}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              u.username?.charAt(0).toUpperCase() || '?'
                            )}
                          </div>
                          <span>@{u.username}</span>
                        </button>
                      ))}
                  </div>
                )}
              </div>
              <button
                onClick={save}
                disabled={!note.trim() || isViewOnly}
                className="w-full bg-amber-900/30 text-amber-300 px-4 py-2 font-mono text-sm hover:bg-amber-900/50 transition-all border-2 border-amber-700/60 rounded-2xl disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98]"
              >
                post note
              </button>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-zinc-900/90 to-black/90 border-4 border-amber-900/40 rounded-3xl p-4 md:p-6 shadow-2xl shadow-amber-950/30">
          <div className="flex flex-col sm:flex-row gap-3 md:gap-4 justify-center items-center">
            {cert.status === 'pending' &&
              !isMyClaim &&
              (!claimedBy || (timeLeft !== null && timeLeft <= 0)) &&
              canEdit && (
                <button
                  onClick={startReview}
                  disabled={submitting}
                  className="bg-blue-900/30 text-blue-400 border-2 border-blue-700/60 hover:bg-blue-900/40 font-mono text-sm px-4 md:px-8 py-3 rounded-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-950/20 hover:scale-[1.02] active:scale-[0.98]"
                >
                  Claim cert
                </button>
              )}
            <button
              onClick={() => setConfirmAction('approve')}
              disabled={
                isViewOnly ||
                submitting ||
                (claimedBy !== null &&
                  timeLeft !== null &&
                  timeLeft > 0 &&
                  !isMyClaim &&
                  !canOverride)
              }
              className="bg-green-950/30 text-green-400 border-2 border-green-700/60 hover:bg-green-900/40 font-mono text-sm px-4 md:px-8 py-3 rounded-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-green-950/20 hover:scale-[1.02] active:scale-[0.98]"
            >
              Approve
            </button>
            <button
              onClick={() => setConfirmAction('reject')}
              disabled={
                isViewOnly ||
                submitting ||
                (claimedBy !== null &&
                  timeLeft !== null &&
                  timeLeft > 0 &&
                  !isMyClaim &&
                  !canOverride)
              }
              className="bg-red-950/30 text-red-400 border-2 border-red-700/60 hover:bg-red-900/40 font-mono text-sm px-4 md:px-8 py-3 rounded-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-red-950/20 hover:scale-[1.02] active:scale-[0.98]"
            >
              Reject
            </button>
            {(cert.status === 'approved' || cert.status === 'rejected') && (
              <button
                onClick={() => update('pending')}
                disabled={isViewOnly || submitting}
                className="bg-yellow-950/30 text-yellow-400 border-2 border-yellow-700/60 hover:bg-yellow-900/40 font-mono text-sm px-4 md:px-8 py-3 rounded-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-yellow-950/20 hover:scale-[1.02] active:scale-[0.98]"
              >
                Uncert
              </button>
            )}
          </div>
        </div>
      </div>

      {err && (
        <div className="fixed top-4 left-4 right-4 md:left-auto md:right-6 md:max-w-sm bg-red-950/90 border-2 border-red-700/60 text-red-300 font-mono text-sm px-4 py-3 rounded-2xl shadow-2xl shadow-red-950/30 z-50">
          {err}
        </div>
      )}

      {claimed && (
        <div className="fixed top-4 left-4 right-4 md:left-auto md:right-6 md:max-w-sm bg-green-950/90 border-2 border-green-700/60 text-green-300 font-mono text-sm px-4 py-3 rounded-2xl shadow-2xl shadow-green-950/30 z-50">
          I've locked it to you for 30 min!
        </div>
      )}

      {bountySaved && (
        <div className="fixed top-4 left-4 right-4 md:left-auto md:right-6 md:max-w-sm bg-green-950/90 border-2 border-green-700/60 text-green-300 font-mono text-sm px-4 py-3 rounded-2xl shadow-2xl shadow-green-950/30 z-50">
          bounty set!
        </div>
      )}

      {confirmAction && (
        <div className="fixed inset-0 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-gradient-to-br from-zinc-900 to-black border-4 border-amber-900/60 rounded-3xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-amber-400 font-mono text-xl font-bold mb-4">
              {confirmAction === 'approve'
                ? 'you sure u want to APPROVE!?!?!?!?'
                : 'you sure u want to REJECT!?!?!?!?'}
            </h3>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  update(confirmAction === 'approve' ? 'approved' : 'rejected')
                  setConfirmAction(null)
                }}
                className={`flex-1 font-mono text-sm px-6 py-3 rounded-2xl transition-all hover:scale-[1.02] active:scale-[0.98] ${
                  confirmAction === 'approve'
                    ? 'bg-green-600 text-white border-2 border-green-500 hover:bg-green-500'
                    : 'bg-red-600 text-white border-2 border-red-500 hover:bg-red-500'
                }`}
              >
                YES
              </button>
              <button
                onClick={() => setConfirmAction(null)}
                className="flex-1 bg-zinc-800 text-gray-300 border-2 border-zinc-700 hover:bg-zinc-700 font-mono text-sm px-6 py-3 rounded-2xl transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                NOOOOOOOOOOOOOO
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
