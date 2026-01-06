'use client'

import Link from 'next/link'
import Image from 'next/image'
import { can, PERMS } from '@/lib/perms'
import { SKILLS } from '@/lib/skills'
import { useAssignment } from '@/hooks/useAssignment'
import { useAssignmentActions } from '@/hooks/useAssignmentActions'

interface Props {
  assignmentId: string
}

export function Form({ assignmentId }: Props) {
  const id = assignmentId

  const {
    loading,
    cert,
    setCert,
    user,
    error,
    setError,
    notes,
    setNotes,
    users,
    setUsers,
    subbed,
    setSubbed,
    gif,
  } = useAssignment(id)

  const {
    updating,
    show,
    setShow,
    pick,
    setPick,
    moving,
    msg,
    setMsg,
    adding,
    notify,
    setNotify,
    unsubbing,
    showPick,
    picks,
    editing,
    sel,
    saving,
    types,
    canEdit,
    canUpdate,
    startEdit,
    cancel,
    flip,
    save,
    update,
    loadU,
    reassign,
    add,
    del,
    unsub,
    onChange,
    pickMention,
    fmt,
  } = useAssignmentActions({
    id,
    cert,
    setCert,
    user,
    notes,
    setNotes,
    users,
    setUsers,
    subbed,
    setSubbed,
    setError,
  })

  if (loading) {
    return (
      <main className="bg-grid min-h-screen w-full flex items-center justify-center" role="main">
        <div className="text-amber-400 font-mono text-lg">loading cert...</div>
      </main>
    )
  }

  if (error || !cert) {
    return (
      <main className="bg-grid min-h-screen w-full flex items-center justify-center" role="main">
        <div className="bg-gradient-to-br from-zinc-900/90 to-black/90 border-4 border-amber-900/40 rounded-3xl p-8 w-full max-w-md text-center shadow-2xl shadow-amber-950/30">
          <div className="text-red-400 font-mono text-sm mb-4">{error || 'cert not found'}</div>
          <Link
            href="/admin/assignments"
            className="bg-gradient-to-br from-amber-900/50 to-amber-950/50 hover:scale-105 active:scale-95 text-amber-200 font-mono text-sm px-4 py-2 border-2 border-amber-700 rounded-2xl transition-all inline-block shadow-lg shadow-amber-950/30"
          >
            ← back to certs
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="bg-grid min-h-screen w-full overflow-hidden" role="main">
      <div className="md:hidden p-4 overflow-y-auto">
        <Link
          href="/admin/assignments"
          className="text-amber-400 font-mono text-sm hover:text-amber-300 mb-3 inline-block"
        >
          ← back
        </Link>

        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-amber-400 text-xl font-mono">Cert #{cert.shipCertId || id}</h1>
            <div className="text-amber-300/60 font-mono text-xs">
              {types().join(', ') || 'no type'}
            </div>
          </div>
          <span
            className={`font-mono text-xs px-2 py-1 border-2 rounded-xl ${cert.status === 'pending' ? 'bg-amber-900/50 text-amber-300 border-amber-700' : cert.status === 'in_progress' ? 'bg-amber-800/50 text-amber-200 border-amber-600' : cert.status === 'completed' ? 'bg-green-900/50 text-green-400 border-green-700' : 'bg-amber-900/50 text-amber-400 border-amber-700'}`}
          >
            {cert.status === 'in_progress'
              ? 'WIP'
              : cert.status === 'completed'
                ? 'DONE'
                : cert.status.toUpperCase()}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-4 text-xs font-mono">
          <div className="bg-gradient-to-br from-zinc-900/90 to-black/90 border-2 border-amber-900/40 p-2 rounded-2xl shadow-lg shadow-amber-950/20">
            <div className="text-amber-300/60">by</div>
            <div className="text-amber-300 truncate">{cert.author?.username || '?'}</div>
          </div>
          <div className="bg-gradient-to-br from-zinc-900/90 to-black/90 border-2 border-amber-900/40 p-2 rounded-2xl shadow-lg shadow-amber-950/20">
            <div className="text-amber-300/60">assigned</div>
            <div className={cert.assignee ? 'text-green-400 truncate' : 'text-amber-300/60'}>
              {cert.assignee?.username || 'nobody'}
            </div>
          </div>
        </div>

        {error && <div className="text-red-400 font-mono text-xs mb-3">{error}</div>}

        {editing ? (
          <div className="bg-gradient-to-br from-zinc-900/90 to-black/90 border-4 border-amber-900/40 p-3 rounded-3xl mb-4 shadow-xl shadow-amber-950/20">
            <div className="text-amber-300 font-mono text-xs mb-2">types:</div>
            <div className="flex flex-wrap gap-2 mb-3">
              {SKILLS.map((t) => (
                <button
                  key={t}
                  onClick={() => flip(t)}
                  className={`font-mono text-xs px-2 py-1 border-2 rounded-2xl transition-all ${sel.includes(t) ? 'bg-amber-900/50 text-amber-200 border-amber-700 shadow-lg shadow-amber-950/30' : 'bg-black/50 text-amber-300/70 border-amber-900/30 hover:border-amber-800/50'}`}
                >
                  {t}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button
                onClick={save}
                disabled={saving || sel.length === 0}
                className="flex-1 bg-gradient-to-br from-green-900/50 to-green-950/50 text-green-200 px-3 py-2 font-mono text-xs border-2 border-green-700 rounded-2xl disabled:opacity-50 hover:scale-105 active:scale-95 transition-all"
              >
                {saving ? '...' : 'save'}
              </button>
              <button
                onClick={cancel}
                disabled={saving}
                className="flex-1 bg-gradient-to-br from-amber-900/50 to-amber-950/50 text-amber-200 px-3 py-2 font-mono text-xs border-2 border-amber-700 rounded-2xl disabled:opacity-50 hover:scale-105 active:scale-95 transition-all"
              >
                cancel
              </button>
            </div>
          </div>
        ) : (
          canEdit() && (
            <button
              onClick={startEdit}
              className="w-full bg-gradient-to-br from-zinc-900/90 to-black/90 border-2 border-amber-900/40 p-2 rounded-2xl mb-4 text-amber-300/70 font-mono text-xs hover:text-amber-300 hover:border-amber-800/50 transition-all"
            >
              tap to edit types
            </button>
          )
        )}

        {canUpdate() && (
          <div className="bg-gradient-to-br from-zinc-900/90 to-black/90 border-4 border-amber-900/40 p-3 rounded-3xl mb-4 shadow-xl shadow-amber-950/20">
            <div className="text-amber-300 font-mono text-xs mb-2">status</div>
            <div className="flex gap-2">
              <button
                onClick={() => update('pending')}
                disabled={updating || cert.status === 'pending'}
                className={`flex-1 font-mono text-xs px-2 py-2 border-2 rounded-2xl transition-all ${cert.status === 'pending' ? 'bg-amber-900/50 text-amber-200 border-amber-700 shadow-lg shadow-amber-950/30' : 'bg-black/50 text-amber-300/70 border-amber-900/30 hover:border-amber-800/50'} disabled:opacity-50`}
              >
                pending
              </button>
              <button
                onClick={() => update('in_progress')}
                disabled={updating || cert.status === 'in_progress'}
                className={`flex-1 font-mono text-xs px-2 py-2 border-2 rounded-2xl transition-all ${cert.status === 'in_progress' ? 'bg-amber-900/50 text-amber-200 border-amber-700 shadow-lg shadow-amber-950/30' : 'bg-black/50 text-amber-300/70 border-amber-900/30 hover:border-amber-800/50'} disabled:opacity-50`}
              >
                wip
              </button>
              <button
                onClick={() => update('completed')}
                disabled={updating || cert.status === 'completed'}
                className={`flex-1 font-mono text-xs px-2 py-2 border-2 rounded-2xl transition-all ${cert.status === 'completed' ? 'bg-green-900/50 text-green-200 border-green-700 shadow-lg shadow-green-950/30' : 'bg-black/50 text-amber-300/70 border-amber-900/30 hover:border-amber-800/50'} disabled:opacity-50`}
              >
                done
              </button>
            </div>
          </div>
        )}

        {can(user?.role || '', PERMS.assign_override) && (
          <div className="bg-gradient-to-br from-zinc-900/90 to-black/90 border-4 border-amber-900/40 p-3 rounded-3xl mb-4 shadow-xl shadow-amber-950/20">
            {!show ? (
              <button
                onClick={() => {
                  setShow(true)
                  loadU()
                }}
                className="w-full bg-gradient-to-br from-amber-900/50 to-amber-950/50 text-amber-200 py-2 font-mono text-xs border-2 border-amber-700 rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-lg shadow-amber-950/30"
              >
                reassign
              </button>
            ) : (
              <div className="space-y-2">
                <select
                  value={pick}
                  onChange={(e) => setPick(e.target.value)}
                  className="w-full bg-black border-2 border-amber-900/40 px-2 py-2 text-amber-200 font-mono text-xs rounded-xl"
                  disabled={moving}
                >
                  <option value="">pick someone</option>
                  {users
                    .filter((u) => u)
                    .map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.username}
                      </option>
                    ))}
                </select>
                <div className="flex gap-2">
                  <button
                    onClick={reassign}
                    disabled={!pick || moving}
                    className="flex-1 bg-gradient-to-br from-green-900/50 to-green-950/50 text-green-200 py-2 font-mono text-xs border-2 border-green-700 rounded-2xl disabled:opacity-50 hover:scale-105 active:scale-95 transition-all"
                  >
                    {moving ? '...' : 'confirm'}
                  </button>
                  <button
                    onClick={() => {
                      setShow(false)
                      setPick('')
                    }}
                    disabled={moving}
                    className="flex-1 bg-gradient-to-br from-amber-900/50 to-amber-950/50 text-amber-200 py-2 font-mono text-xs border-2 border-amber-700 rounded-2xl disabled:opacity-50 hover:scale-105 active:scale-95 transition-all"
                  >
                    cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="bg-gradient-to-br from-zinc-900/90 to-black/90 border-4 border-amber-900/40 p-3 rounded-3xl mb-4 shadow-xl shadow-amber-950/20">
          <div className="text-amber-400 font-mono text-sm mb-2">
            {cert.projectName || 'Ship Details'}
          </div>
          {cert.shipCert?.description && (
            <div className="text-amber-300/70 font-mono text-xs mb-3 max-h-20 overflow-y-auto">
              {cert.shipCert.description}
            </div>
          )}
          {cert.shipCert?.devTime && (
            <div className="text-amber-300/60 font-mono text-xs mb-2">
              time: {cert.shipCert.devTime}
            </div>
          )}
          <div className="space-y-1">
            {(cert.demoUrl || cert.shipCert?.demoUrl) && (
              <a
                href={cert.demoUrl || cert.shipCert?.demoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-amber-300 hover:text-amber-200 font-mono text-xs truncate"
              >
                demo
              </a>
            )}
            {(cert.repoUrl || cert.shipCert?.repoUrl) && (
              <a
                href={cert.repoUrl || cert.shipCert?.repoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-amber-300 hover:text-amber-200 font-mono text-xs truncate"
              >
                repo
              </a>
            )}
            {cert.shipCert?.readmeUrl && (
              <a
                href={cert.shipCert.readmeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-amber-300 hover:text-amber-200 font-mono text-xs truncate"
              >
                readme
              </a>
            )}
            {cert.shipCertId && (
              <Link
                href={`/admin/ship_certifications/${cert.shipCertId}/edit`}
                className="block text-amber-300 hover:text-amber-200 font-mono text-xs"
              >
                → cert #{cert.shipCertId}
              </Link>
            )}
          </div>
        </div>

        <div className="bg-gradient-to-br from-zinc-900/90 to-black/90 border-4 border-amber-900/40 p-3 rounded-3xl mb-4 shadow-xl shadow-amber-950/20">
          <div className="text-amber-400 font-mono text-sm mb-3">notes</div>
          <div className="space-y-2 mb-3 max-h-48 overflow-y-auto">
            {notes.length === 0 ? (
              <div className="text-amber-300/60 font-mono text-xs text-center py-2">no notes</div>
            ) : (
              notes
                .filter((n) => n?.author)
                .map((n) => (
                  <div
                    key={n.id}
                    className="bg-black/30 border-2 border-amber-900/30 p-2 rounded-2xl"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-amber-300 font-mono text-xs">
                        {n.author?.username || '?'}
                      </span>
                      <span className="text-amber-300/50 font-mono text-xs">
                        {new Date(n.createdAt).toLocaleDateString()}
                      </span>
                      {(n.author?.id === String(user?.id) ||
                        can(user?.role || '', PERMS.assign_override)) && (
                        <button
                          onClick={() => del(n.id)}
                          className="text-red-400 hover:text-red-300 font-mono text-xs ml-auto"
                        >
                          ×
                        </button>
                      )}
                    </div>
                    <div className="text-amber-200 font-mono text-xs">{fmt(n.message)}</div>
                  </div>
                ))
            )}
          </div>
          <form onSubmit={add} className="relative">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={msg}
                  onChange={onChange}
                  placeholder="add note..."
                  className="w-full bg-black border-2 border-amber-900/40 rounded-xl px-2 py-2 text-amber-200 font-mono text-xs focus:border-amber-700 focus:outline-none"
                  disabled={adding}
                  autoComplete="off"
                />
                {showPick && picks.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-zinc-950 border-2 border-amber-900/40 rounded-xl max-h-32 overflow-y-auto">
                    {picks
                      .filter((u) => u)
                      .map((u) => (
                        <button
                          key={u.id}
                          type="button"
                          onClick={() => pickMention(u.username)}
                          className="w-full text-left px-2 py-1 hover:bg-amber-900/30 text-amber-200 font-mono text-xs border-b border-amber-900/30 last:border-b-0"
                        >
                          @{u.username}
                        </button>
                      ))}
                  </div>
                )}
              </div>
              <button
                type="submit"
                disabled={!msg.trim() || adding}
                className="bg-gradient-to-br from-amber-900/50 to-amber-950/50 text-amber-200 px-3 py-2 font-mono text-xs border-2 border-amber-700 rounded-2xl disabled:opacity-50 hover:scale-105 active:scale-95 transition-all"
              >
                {adding ? '...' : 'send'}
              </button>
            </div>
            <label className="flex items-center gap-2 text-amber-300/70 font-mono text-xs mt-2">
              <input
                type="checkbox"
                checked={notify}
                onChange={(e) => setNotify(e.target.checked)}
                className="accent-amber-600"
              />
              notify
            </label>
          </form>
        </div>

        {gif && (
          <div className="text-center mb-4">
            <Image
              src={gif}
              alt="vibe"
              width={300}
              height={200}
              className="mx-auto rounded"
              style={{ maxHeight: '180px' }}
            />
          </div>
        )}
      </div>

      <div className="hidden md:flex h-full">
        <div className="w-80 bg-grid bg-black/95 border-r border-amber-900/40 p-6 overflow-y-auto">
          <div className="mb-8 bg-gradient-to-br from-zinc-900/90 to-black/90 border-4 border-amber-900/40 rounded-3xl p-4 shadow-2xl shadow-amber-950/30">
            <Link
              href="/admin/assignments"
              className="text-amber-400 font-mono text-sm hover:text-amber-300 transition-colors mb-4 inline-block"
            >
              ← back to assignments
            </Link>
            <h1 className="text-amber-400 text-xl font-mono mb-3">
              Cert {cert.shipCertId ? `#${cert.shipCertId}` : `#${id}`}
            </h1>
          </div>

          <div className="mb-8 bg-gradient-to-br from-zinc-900/90 to-black/90 border-4 border-amber-900/40 rounded-3xl p-4 shadow-2xl shadow-amber-950/30">
            <h2 className="text-amber-400 font-mono text-sm mb-4 border-b border-amber-900/40 pb-2">
              Assignment Details
            </h2>
            <div className="space-y-3">
              <div className="p-2 bg-black/50 border-2 border-amber-900/30 rounded-xl">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <span className="text-amber-300/70 font-mono text-sm">Types:</span>
                    {editing ? (
                      <div className="mt-2">
                        <div className="text-amber-300 font-mono text-xs mb-2">Select types:</div>
                        <div className="flex flex-wrap gap-2 mb-3">
                          {SKILLS.map((t) => (
                            <button
                              key={t}
                              onClick={() => flip(t)}
                              className={`font-mono text-xs px-2 py-1 border-2 rounded-2xl transition-all ${
                                sel.includes(t)
                                  ? 'bg-amber-900/50 text-amber-200 border-amber-700 shadow-lg shadow-amber-950/30'
                                  : 'bg-black/50 text-amber-300/70 border-amber-900/30 hover:border-amber-800/50'
                              }`}
                            >
                              {t}
                            </button>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={save}
                            disabled={saving || sel.length === 0}
                            className="bg-gradient-to-br from-green-900/50 to-green-950/50 text-green-200 px-3 py-1 font-mono text-xs hover:scale-105 active:scale-95 transition-all border-2 border-green-700 rounded-2xl disabled:opacity-50"
                          >
                            {saving ? 'saving...' : 'save types'}
                          </button>
                          <button
                            onClick={cancel}
                            disabled={saving}
                            className="bg-gradient-to-br from-amber-900/50 to-amber-950/50 text-amber-200 px-3 py-1 font-mono text-xs hover:scale-105 active:scale-95 transition-all border-2 border-amber-700 rounded-2xl disabled:opacity-50"
                          >
                            cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div
                        className={`text-amber-200 font-mono text-sm mt-1 ${canEdit() ? 'cursor-pointer hover:text-amber-300' : ''}`}
                        onClick={canEdit() ? startEdit : undefined}
                        title={canEdit() ? 'click to add/edit types' : ''}
                      >
                        {types().length > 0 ? (
                          types().join(', ')
                        ) : (
                          <span className="text-amber-300/60">click to add types</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="p-2 bg-black/50 border-2 border-amber-900/30 rounded-xl">
                <span className="text-amber-300/70 font-mono text-sm">Cert ID:</span>
                <div className="text-amber-200 font-mono text-sm">{cert.shipCertId || cert.id}</div>
              </div>
              <div className="p-2 bg-black/50 border-2 border-amber-900/30 rounded-xl">
                <span className="text-amber-300/70 font-mono text-sm">Created by:</span>
                <div className="text-amber-300 font-mono text-sm">
                  {cert.author?.username || 'unknown'}
                </div>
              </div>
              <div className="p-2 bg-black/50 border-2 border-amber-900/30 rounded-xl">
                <span className="text-amber-300/70 font-mono text-sm">Assigned to:</span>
                <div className="text-green-400 font-mono text-sm">
                  {cert.assignee?.username || 'unassigned'}
                </div>
              </div>
              <div className="p-2 bg-black/50 border-2 border-amber-900/30 rounded-xl">
                <span className="text-amber-300/70 font-mono text-sm">Created:</span>
                <div className="text-amber-200 font-mono text-sm">
                  {new Date(cert.createdAt).toLocaleDateString()}
                </div>
              </div>
            </div>
          </div>

          {canUpdate() && (
            <div className="mb-8 bg-gradient-to-br from-zinc-900/90 to-black/90 border-4 border-amber-900/40 rounded-3xl p-4 shadow-2xl shadow-amber-950/30">
              <h2 className="text-amber-400 font-mono text-sm mb-4 border-b border-amber-900/40 pb-2">
                Update Status
              </h2>
              <div className="space-y-2">
                <button
                  onClick={() => update('pending')}
                  disabled={updating || cert.status === 'pending'}
                  className={`w-full font-mono text-xs px-3 py-2 border-2 rounded-2xl transition-all ${
                    cert.status === 'pending'
                      ? 'bg-amber-900/50 text-amber-200 border-amber-700 shadow-lg shadow-amber-950/30'
                      : 'bg-black/50 text-amber-300/70 border-amber-900/30 hover:border-amber-800/50'
                  } disabled:opacity-50`}
                >
                  Pending Review
                </button>
                <button
                  onClick={() => update('in_progress')}
                  disabled={updating || cert.status === 'in_progress'}
                  className={`w-full font-mono text-xs px-3 py-2 border-2 rounded-2xl transition-all ${
                    cert.status === 'in_progress'
                      ? 'bg-amber-900/50 text-amber-200 border-amber-700 shadow-lg shadow-amber-950/30'
                      : 'bg-black/50 text-amber-300/70 border-amber-900/30 hover:border-amber-800/50'
                  } disabled:opacity-50`}
                >
                  In Progress
                </button>
                <button
                  onClick={() => update('completed')}
                  disabled={updating || cert.status === 'completed'}
                  className={`w-full font-mono text-xs px-3 py-2 border-2 rounded-2xl transition-all ${
                    cert.status === 'completed'
                      ? 'bg-green-900/50 text-green-200 border-green-700 shadow-lg shadow-green-950/30'
                      : 'bg-black/50 text-amber-300/70 border-amber-900/30 hover:border-amber-800/50'
                  } disabled:opacity-50`}
                >
                  Completed
                </button>
              </div>
              {updating && (
                <div className="text-amber-300/70 font-mono text-xs mt-2 text-center">
                  updating status...
                </div>
              )}
            </div>
          )}

          {can(user?.role || '', PERMS.assign_override) && (
            <div className="bg-gradient-to-br from-zinc-900/90 to-black/90 border-4 border-amber-900/40 rounded-3xl p-4 shadow-2xl shadow-amber-950/30">
              <h2 className="text-amber-400 font-mono text-sm mb-4 border-b border-amber-900/40 pb-2">
                Admin Controls
              </h2>

              {!show ? (
                <button
                  onClick={() => {
                    setShow(true)
                    loadU()
                  }}
                  className="w-full bg-gradient-to-br from-amber-900/50 to-amber-950/50 text-amber-200 py-2 font-mono text-xs hover:scale-105 active:scale-95 transition-all border-2 border-amber-700 rounded-2xl shadow-lg shadow-amber-950/30"
                >
                  Reassign to Another User
                </button>
              ) : (
                <div className="space-y-3">
                  <select
                    value={pick}
                    onChange={(e) => setPick(e.target.value)}
                    className="w-full bg-black border-2 border-amber-900/40 rounded-xl px-3 py-2 text-amber-200 font-mono text-xs focus:outline-none focus:border-amber-700"
                    disabled={moving}
                  >
                    <option value="">select user to assign</option>
                    {users
                      .filter((u) => u)
                      .map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.username} ({u.skills?.join(', ') || 'no skills'})
                        </option>
                      ))}
                  </select>

                  <div className="flex gap-2">
                    <button
                      onClick={reassign}
                      disabled={!pick || moving}
                      className="flex-1 bg-gradient-to-br from-green-900/50 to-green-950/50 text-green-200 py-2 font-mono text-xs hover:scale-105 active:scale-95 transition-all border-2 border-green-700 rounded-2xl disabled:opacity-50"
                    >
                      {moving ? 'reassigning...' : 'confirm reassign'}
                    </button>
                    <button
                      onClick={() => {
                        setShow(false)
                        setPick('')
                      }}
                      disabled={moving}
                      className="flex-1 bg-gradient-to-br from-amber-900/50 to-amber-950/50 text-amber-200 py-2 font-mono text-xs hover:scale-105 active:scale-95 transition-all border-2 border-amber-700 rounded-2xl disabled:opacity-50"
                    >
                      cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-hidden bg-grid">
          <div className="h-full flex flex-col">
            <div className="bg-gradient-to-br from-zinc-900/90 to-black/90 border-4 border-amber-900/40 rounded-3xl p-6 m-4 mb-0 shadow-2xl shadow-amber-950/30">
              <div className="flex justify-between items-center">
                <div>
                  <div className="text-amber-400 font-mono text-sm">
                    {types().join(', ')} • Ship ID: {cert.shipCertId || cert.id}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span
                    className={`font-mono text-sm px-4 py-2 border-2 rounded-xl ${
                      cert.status === 'pending'
                        ? 'bg-amber-900/50 text-amber-300 border-amber-700'
                        : cert.status === 'in_progress'
                          ? 'bg-amber-800/50 text-amber-200 border-amber-600'
                          : cert.status === 'completed'
                            ? 'bg-green-900/50 text-green-400 border-green-700'
                            : 'bg-amber-900/50 text-amber-400 border-amber-700'
                    }`}
                  >
                    {cert.status.toUpperCase()}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-auto p-4">
              {error && (
                <div className="text-red-400 font-mono text-sm text-center mb-4">{error}</div>
              )}

              <div className="bg-gradient-to-br from-zinc-900/90 to-black/90 border-4 border-amber-900/40 rounded-3xl p-6 mb-6 shadow-xl shadow-amber-950/20">
                <h2 className="text-amber-400 font-mono text-lg mb-4 border-b border-amber-900/40 pb-2">
                  Ship Certification Details
                </h2>

                {cert.projectName && (
                  <div className="mb-4">
                    <span className="text-amber-300/70 font-mono text-sm">Project Name:</span>
                    <div className="text-amber-400 font-mono text-lg mt-1">{cert.projectName}</div>
                  </div>
                )}

                {cert.shipCert?.description && (
                  <div className="mb-4">
                    <span className="text-amber-300/70 font-mono text-sm">Description:</span>
                    <div className="mt-2 p-3 bg-black/80 border-2 border-amber-900/30 rounded-xl max-h-32 overflow-y-auto">
                      <p className="text-amber-300 font-mono text-sm whitespace-pre-wrap">
                        {cert.shipCert.description}
                      </p>
                    </div>
                  </div>
                )}

                {cert.shipCert?.devTime && (
                  <div className="mb-4">
                    <span className="text-amber-300/70 font-mono text-sm">Dev Time:</span>
                    <div className="text-amber-200 font-mono text-sm mt-1">
                      {cert.shipCert.devTime}
                    </div>
                  </div>
                )}

                <div className="mb-4">
                  <span className="text-amber-300/70 font-mono text-sm">Project Links:</span>
                  <div className="mt-2 p-3 bg-black/80 border-2 border-amber-900/30 rounded-xl space-y-2">
                    {(cert.demoUrl || cert.shipCert?.demoUrl) && (
                      <div className="flex items-center gap-2">
                        <span className="text-amber-300/60 font-mono text-xs w-16">Play:</span>
                        <a
                          href={cert.demoUrl || cert.shipCert?.demoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-amber-300 font-mono text-sm hover:text-amber-200 transition-colors break-all"
                        >
                          {cert.demoUrl || cert.shipCert?.demoUrl}
                        </a>
                      </div>
                    )}
                    {(cert.repoUrl || cert.shipCert?.repoUrl) && (
                      <div className="flex items-center gap-2">
                        <span className="text-amber-300/60 font-mono text-xs w-16">Repo:</span>
                        <a
                          href={cert.repoUrl || cert.shipCert?.repoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-amber-300 font-mono text-sm hover:text-amber-200 transition-colors break-all"
                        >
                          {cert.repoUrl || cert.shipCert?.repoUrl}
                        </a>
                      </div>
                    )}
                    {cert.shipCert?.readmeUrl && (
                      <div className="flex items-center gap-2">
                        <span className="text-amber-300/60 font-mono text-xs w-16">Readme:</span>
                        <a
                          href={cert.shipCert.readmeUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-amber-300 font-mono text-sm hover:text-amber-200 transition-colors break-all"
                        >
                          {cert.shipCert.readmeUrl}
                        </a>
                      </div>
                    )}
                    {cert.shipCertId && (
                      <div className="flex items-center gap-2">
                        <span className="text-amber-300/60 font-mono text-xs w-16">Cert:</span>
                        <a
                          href={`/admin/ship_certifications/${cert.shipCertId}/edit`}
                          className="text-amber-300 font-mono text-sm hover:text-amber-200 transition-colors"
                        >
                          View Ship Cert #{cert.shipCertId}
                        </a>
                      </div>
                    )}
                    {!cert.demoUrl &&
                      !cert.repoUrl &&
                      !cert.shipCert?.demoUrl &&
                      !cert.shipCert?.repoUrl &&
                      !cert.shipCert?.readmeUrl &&
                      !cert.shipCertId && (
                        <div className="text-amber-300/60 font-mono text-sm">
                          no links available
                        </div>
                      )}
                  </div>
                </div>

                {cert.shipCert?.ftUsername && (
                  <div className="mb-4">
                    <span className="text-amber-300/70 font-mono text-sm">Submitted by:</span>
                    <div className="text-green-400 font-mono text-sm mt-1">
                      {cert.shipCert.ftUsername}
                    </div>
                  </div>
                )}

                {!canUpdate() && (
                  <div className="bg-amber-900/20 border-2 border-amber-900/40 p-4 rounded-xl">
                    <p className="text-amber-300/70 font-mono text-sm text-center">
                      You can only update status for certs assigned to you
                    </p>
                  </div>
                )}
              </div>

              <div className="bg-gradient-to-br from-zinc-900/90 to-black/90 border-4 border-amber-900/40 rounded-3xl p-6 shadow-xl shadow-amber-950/20">
                <h2 className="text-amber-400 font-mono text-lg mb-4 border-b border-amber-900/40 pb-2">
                  Notes
                </h2>

                <div className="space-y-3 mb-4 max-h-64 overflow-y-auto">
                  {notes.length === 0 ? (
                    <div className="text-amber-300/60 font-mono text-sm text-center py-4">
                      no notes yet
                    </div>
                  ) : (
                    notes
                      .filter((n) => n?.author)
                      .map((n) => (
                        <div
                          key={n.id}
                          className="bg-black/50 border-2 border-amber-900/30 p-3 rounded-2xl"
                        >
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 bg-black border-2 border-amber-700/50 rounded flex items-center justify-center font-mono text-xs text-amber-300 overflow-hidden">
                              {n.author?.avatar ? (
                                <Image
                                  src={n.author.avatar}
                                  alt={n.author.username || 'user'}
                                  width={32}
                                  height={32}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                n.author?.username?.charAt(0).toUpperCase() || '?'
                              )}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-amber-300 font-mono text-sm">
                                  {n.author?.username || 'unknown'}
                                </span>
                                {can(n.author?.role || '', PERMS.eng_full) && (
                                  <span className="bg-red-800 text-red-200 px-1 text-xs font-mono border border-red-600 rounded">
                                    ADMIN
                                  </span>
                                )}
                                <span className="text-amber-300/50 font-mono text-xs">
                                  {new Date(n.createdAt).toLocaleString()}
                                </span>
                                {(n.author?.id === String(user?.id) ||
                                  can(user?.role || '', PERMS.assign_override)) && (
                                  <button
                                    onClick={() => del(n.id)}
                                    className="text-red-400 hover:text-red-300 font-mono text-xs ml-auto"
                                  >
                                    delete
                                  </button>
                                )}
                              </div>
                              <div className="text-amber-200 font-mono text-sm whitespace-pre-wrap">
                                {fmt(n.message)}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                  )}
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-4 text-sm">
                    <label className="flex items-center gap-2 text-amber-300/70 font-mono">
                      <input
                        type="checkbox"
                        checked={notify}
                        onChange={(e) => setNotify(e.target.checked)}
                        className="accent-amber-600"
                      />
                      notify assigned user
                    </label>
                    {subbed && (
                      <button
                        onClick={unsub}
                        disabled={unsubbing}
                        className="text-amber-300/60 hover:text-amber-300 font-mono text-xs"
                      >
                        {unsubbing ? 'unsubscribing...' : 'unsubscribe from thread'}
                      </button>
                    )}
                  </div>

                  <form onSubmit={add} className="relative">
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <input
                          type="text"
                          value={msg}
                          onChange={onChange}
                          placeholder="add a note... (use @username to tag people)"
                          className="w-full bg-black border-2 border-amber-900/40 rounded-xl px-3 py-2 text-amber-200 font-mono text-sm focus:outline-none focus:border-amber-700"
                          disabled={adding}
                          autoComplete="off"
                          data-1p-ignore="true"
                          data-lpignore="true"
                          spellCheck="false"
                        />

                        {showPick && picks.length > 0 && (
                          <div className="absolute z-10 w-full mt-1 bg-zinc-950 border-2 border-amber-900/40 rounded-xl max-h-40 overflow-y-auto">
                            {picks
                              .filter((u) => u)
                              .map((u) => (
                                <button
                                  key={u.id}
                                  type="button"
                                  onClick={() => pickMention(u.username)}
                                  className="w-full text-left px-3 py-2 hover:bg-amber-900/30 text-amber-200 font-mono text-sm border-b border-amber-900/30 last:border-b-0 flex items-center gap-2"
                                >
                                  <div className="w-6 h-6 bg-black border-2 border-amber-700/50 rounded flex items-center justify-center font-mono text-xs text-amber-300 overflow-hidden flex-shrink-0">
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
                        type="submit"
                        disabled={!msg.trim() || adding}
                        className="bg-gradient-to-br from-amber-900/50 to-amber-950/50 text-amber-200 px-4 py-2 font-mono text-sm hover:scale-105 active:scale-95 transition-all border-2 border-amber-700 rounded-2xl disabled:opacity-50 shadow-lg shadow-amber-950/30"
                      >
                        {adding ? 'adding...' : 'send'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>

              {gif && (
                <div className="mt-6 text-center">
                  <Image
                    src={gif}
                    alt="motivation"
                    width={384}
                    height={250}
                    className="mx-auto max-w-sm"
                    style={{ maxHeight: '250px' }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
