'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { can, PERMS } from '@/lib/perms'
import { SKILLS } from '@/lib/skills'

interface User {
  id: number
  username: string
  slackId: string
  isActive: boolean
  role: string
  createdAt: string
  avatar?: string | null
  skills?: string[]
  staffNotes?: string | null
}

interface Key {
  id: string
  credentialId: string
  createdAt: string
}
interface Log {
  id: number
  action: string
  details?: string | null
  admin: { username: string }
  createdAt: string
}
interface Stats {
  total: number
  approved: number
  rejected: number
}

interface Props {
  user: User
  keys: Key[]
  logs: Log[]
  stats: Stats | null
  currentUser: { id: number; username: string; role: string }
}

const roleColor = (r: string) => {
  switch (r) {
    case 'megawright':
      return 'text-purple-400 bg-purple-900/30 border-purple-700/50'
    case 'hq':
      return 'text-pink-400 bg-pink-900/30 border-pink-700/50'
    case 'captain':
      return 'text-blue-400 bg-blue-900/30 border-blue-700/50'
    case 'shipwright':
      return 'text-green-400 bg-green-900/30 border-green-700/50'
    case 'fraudster':
      return 'text-orange-400 bg-orange-900/30 border-orange-700/50'
    case 'syswright':
      return 'text-red-400 bg-red-900/30 border-red-700/50'
    default:
      return 'text-amber-300/60 bg-zinc-800 border-amber-900/30'
  }
}

export function UserProfile({ user: init, keys: k, logs: l, stats: s, currentUser }: Props) {
  const [user, setUser] = useState(init)
  const [keys, setKeys] = useState(k)
  const [logs, setLogs] = useState(l)
  const [stats] = useState(s)
  const [error, setError] = useState('')
  const [updating, setUpdating] = useState(false)
  const [editing, setEditing] = useState(false)
  const [selected, setSelected] = useState<string[]>(init.skills || [])
  const [staffNotes, setStaffNotes] = useState(init.staffNotes || '')
  const [editStaffNotes, setEditStaffNotes] = useState(false)

  const userId = user.id
  const canEdit = can(currentUser.role, PERMS.users_edit)
  const canAdmin = can(currentUser.role, PERMS.users_admin)

  const refreshLogs = async () => {
    try {
      const r = await fetch(`/api/admin/users/${userId}/logs`)
      if (r.ok) {
        const d = await r.json()
        setLogs(d.logs || [])
      }
    } catch {}
  }

  const toggle = async () => {
    setUpdating(true)
    try {
      const r = await fetch(`/api/admin/users/${userId}/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !user.isActive }),
      })
      if (r.ok) {
        setUser((p) => ({ ...p, isActive: !p.isActive }))
        refreshLogs()
      } else {
        const d = await r.json()
        setError(d.error || 'toggle failed')
      }
    } catch {
      setError('network error')
    } finally {
      setUpdating(false)
    }
  }

  const grant = async (role: string) => {
    if (!confirm(`grant ${user.username} ${role}?`)) return
    setUpdating(true)
    try {
      const r = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      })
      if (r.ok) {
        setUser((p) => ({ ...p, role }))
        refreshLogs()
      } else {
        const d = await r.json()
        setError(d.error || 'grant failed')
      }
    } catch {
      setError('network error')
    } finally {
      setUpdating(false)
    }
  }

  const save = async () => {
    setUpdating(true)
    try {
      const r = await fetch(`/api/admin/users/${userId}/skills`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skills: selected }),
      })
      if (r.ok) {
        setUser((p) => ({ ...p, skills: selected }))
        setEditing(false)
        refreshLogs()
      } else {
        const d = await r.json()
        setError(d.error || 'save failed')
      }
    } catch {
      setError('network error')
    } finally {
      setUpdating(false)
    }
  }

  const saveNotes = async () => {
    setUpdating(true)
    try {
      const r = await fetch(`/api/admin/users/${userId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ staffNotes }),
      })
      if (r.ok) {
        setUser((p) => ({ ...p, staffNotes }))
        setEditStaffNotes(false)
        refreshLogs()
      } else {
        const d = await r.json()
        setError(d.error || 'notes failed')
      }
    } catch {
      setError('network error')
    } finally {
      setUpdating(false)
    }
  }

  const yoink = async () => {
    if (!confirm(`yoink ${user.username}?`)) return
    setUpdating(true)
    try {
      const r = await fetch(`/api/admin/users/${userId}/yoink`, { method: 'POST' })
      if (r.ok) {
        setUser((p) => ({ ...p, isActive: false, role: 'observer' }))
        setKeys([])
        refreshLogs()
      } else {
        const d = await r.json()
        setError(d.error || 'yoink failed')
      }
    } catch {
      setError('network error')
    } finally {
      setUpdating(false)
    }
  }

  const unyoink = async () => {
    if (!confirm(`bring back ${user.username}?`)) return
    setUpdating(true)
    try {
      const r = await fetch(`/api/admin/users/${userId}/unyoink`, { method: 'POST' })
      if (r.ok) {
        setUser((p) => ({ ...p, isActive: true }))
        refreshLogs()
      } else {
        const d = await r.json()
        setError(d.error || 'unyoink failed')
      }
    } catch {
      setError('network error')
    } finally {
      setUpdating(false)
    }
  }

  const rmKey = async (keyId: string) => {
    if (!confirm('yoink key?')) return
    setUpdating(true)
    try {
      const r = await fetch(`/api/webauthn/keys/${keyId}`, { method: 'DELETE' })
      if (r.ok) {
        setKeys((p) => p.filter((k) => k.id !== keyId))
        refreshLogs()
      } else {
        const d = await r.json()
        setError(d.error || 'key delete failed')
      }
    } catch {
      setError('network error')
    } finally {
      setUpdating(false)
    }
  }

  const flip = (s: string) =>
    setSelected((p) => (p.includes(s) ? p.filter((x) => x !== s) : [...p, s]))

  return (
    <>
      {error && (
        <div className="bg-red-900/30 border-2 border-red-700/50 text-red-400 font-mono text-sm p-4 rounded-2xl mb-6">
          {error}
        </div>
      )}

      <div className="bg-gradient-to-br from-zinc-900/90 to-black/90 border-4 border-amber-900/40 rounded-3xl p-4 md:p-6 shadow-2xl mb-6">
        <div className="flex flex-col md:flex-row md:items-start gap-4 md:gap-6">
          {user.avatar && (
            <Image
              src={user.avatar}
              alt=""
              width={96}
              height={96}
              className="w-20 h-20 md:w-24 md:h-24 rounded-2xl border-4 border-amber-900/40"
            />
          )}
          <div className="flex-1">
            <h2 className="text-amber-200 font-mono text-xl md:text-2xl mb-2">
              {user.username} <span className="text-amber-300/50">#{user.id}</span>
            </h2>
            <div className="flex flex-wrap items-center gap-2 md:gap-3 mb-3">
              <a
                href={`https://hackclub.slack.com/team/${user.slackId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-amber-400 font-mono text-sm hover:text-amber-300"
              >
                {user.slackId}
              </a>
              <span
                className={`px-2 py-1 rounded-lg font-mono text-xs border ${roleColor(user.role)}`}
              >
                {user.role}
              </span>
            </div>
            <div className="text-amber-300/50 font-mono text-xs">joined {user.createdAt}</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 mb-6">
        <div className="bg-gradient-to-br from-zinc-900/90 to-black/90 border-4 border-amber-900/40 rounded-3xl p-4 shadow-2xl">
          <h3 className="text-amber-400 font-mono text-sm mb-3">quick actions</h3>
          {canEdit ? (
            <div className="space-y-2">
              {(currentUser.role === 'megawright' || currentUser.role === 'hq') && (
                <>
                  <button
                    onClick={() => grant('megawright')}
                    disabled={updating || user.role === 'megawright'}
                    className="w-full bg-purple-900/30 border-2 border-purple-700/50 text-purple-400 hover:bg-purple-900/50 font-mono text-xs px-3 py-2 rounded-xl transition-colors disabled:opacity-50"
                  >
                    grant Megawright
                  </button>
                  <button
                    onClick={() => grant('hq')}
                    disabled={updating || user.role === 'hq'}
                    className="w-full bg-pink-900/30 border-2 border-pink-700/50 text-pink-400 hover:bg-pink-900/50 font-mono text-xs px-3 py-2 rounded-xl transition-colors disabled:opacity-50"
                  >
                    grant HQ
                  </button>
                </>
              )}
              {(currentUser.role === 'megawright' ||
                currentUser.role === 'hq' ||
                currentUser.role === 'captain') && (
                <button
                  onClick={() => grant('captain')}
                  disabled={updating || user.role === 'captain'}
                  className="w-full bg-blue-900/30 border-2 border-blue-700/50 text-blue-400 hover:bg-blue-900/50 font-mono text-xs px-3 py-2 rounded-xl transition-colors disabled:opacity-50"
                >
                  grant Captain
                </button>
              )}
              <button
                onClick={() => grant('shipwright')}
                disabled={updating || user.role === 'shipwright'}
                className="w-full bg-green-900/30 border-2 border-green-700/50 text-green-400 hover:bg-green-900/50 font-mono text-xs px-3 py-2 rounded-xl transition-colors disabled:opacity-50"
              >
                grant Shipwright
              </button>
              <button
                onClick={() => grant('observer')}
                disabled={updating || user.role === 'observer'}
                className="w-full bg-zinc-800 border-2 border-amber-900/30 text-amber-300/60 hover:bg-zinc-700 font-mono text-xs px-3 py-2 rounded-xl transition-colors disabled:opacity-50"
              >
                grant Observer
              </button>
              {(currentUser.role === 'megawright' ||
                currentUser.role === 'hq' ||
                currentUser.role === 'captain') && (
                <button
                  onClick={() => grant('fraudster')}
                  disabled={updating || user.role === 'fraudster'}
                  className="w-full bg-orange-900/30 border-2 border-orange-700/50 text-orange-400 hover:bg-orange-900/50 font-mono text-xs px-3 py-2 rounded-xl transition-colors disabled:opacity-50"
                >
                  grant Fraudster
                </button>
              )}
            </div>
          ) : (
            <div className="text-amber-300/40 font-mono text-xs">no perms</div>
          )}
        </div>

        <div className="bg-gradient-to-br from-zinc-900/90 to-black/90 border-4 border-amber-900/40 rounded-3xl p-4 shadow-2xl">
          <h3 className="text-amber-400 font-mono text-sm mb-3">role & status</h3>
          <div className="space-y-3">
            <div>
              <span className="text-amber-300/50 font-mono text-xs block mb-1">role</span>
              <span
                className={`inline-block px-2 py-1 font-mono text-xs border rounded-lg ${roleColor(user.role)}`}
              >
                {user.role}
              </span>
            </div>
            <div>
              <span className="text-amber-300/50 font-mono text-xs block mb-1">active</span>
              {canEdit ? (
                <button
                  onClick={toggle}
                  disabled={updating}
                  className={`px-3 py-1 font-mono text-xs border-2 rounded-xl transition-colors disabled:opacity-50 ${user.isActive ? 'bg-green-900/30 text-green-400 border-green-700/50 hover:bg-green-900/50' : 'bg-red-900/30 text-red-400 border-red-700/50 hover:bg-red-900/50'}`}
                >
                  {user.isActive ? 'yes' : 'no'}
                </button>
              ) : (
                <span
                  className={`inline-block px-3 py-1 font-mono text-xs border-2 rounded-lg ${user.isActive ? 'bg-green-900/30 text-green-400 border-green-700/50' : 'bg-red-900/30 text-red-400 border-red-700/50'}`}
                >
                  {user.isActive ? 'yes' : 'no'}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-red-950/50 to-black/90 border-4 border-dashed border-red-800/60 rounded-3xl p-4 shadow-2xl">
          <h3 className="text-red-400 font-mono text-sm mb-2">danger zone</h3>
          <p className="text-red-400/60 font-mono text-xs mb-3">kills session, keys, everything</p>
          {canAdmin && (
            <>
              <button
                onClick={yoink}
                disabled={updating || !user.isActive}
                className="w-full bg-red-900/50 text-red-200 font-mono text-xs px-4 py-2 hover:bg-red-900/70 border-2 border-red-700/50 rounded-xl transition-colors disabled:opacity-50 mb-2"
              >
                yoink
              </button>
              {!user.isActive && (
                <button
                  onClick={unyoink}
                  disabled={updating}
                  className="w-full bg-green-900/50 text-green-200 font-mono text-xs px-4 py-2 hover:bg-green-900/70 border-2 border-green-700/50 rounded-xl transition-colors disabled:opacity-50"
                >
                  bring em back
                </button>
              )}
            </>
          )}
        </div>
      </div>

      <div className="bg-gradient-to-br from-zinc-900/90 to-black/90 border-4 border-amber-900/40 rounded-3xl p-4 shadow-2xl mb-6">
        <h3 className="text-amber-400 font-mono text-sm mb-3">ship cert stats</h3>
        {stats ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-zinc-900/50 border-2 border-amber-900/30 p-3 rounded-2xl">
              <div className="text-amber-300/50 font-mono text-xs mb-1">total reviewed</div>
              <div className="text-amber-200 font-mono text-2xl">{stats.total}</div>
            </div>
            <div className="bg-green-900/20 border-2 border-green-700/50 p-3 rounded-2xl">
              <div className="text-green-400 font-mono text-xs mb-1">approved</div>
              <div className="text-green-400 font-mono text-2xl">{stats.approved}</div>
            </div>
            <div className="bg-red-900/20 border-2 border-red-700/50 p-3 rounded-2xl">
              <div className="text-red-400 font-mono text-xs mb-1">rejected</div>
              <div className="text-red-400 font-mono text-2xl">{stats.rejected}</div>
            </div>
          </div>
        ) : (
          <div className="text-amber-300/40 font-mono text-xs">no reviews yet</div>
        )}
      </div>

      {/* notes + skills */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 mb-6">
        <div className="bg-gradient-to-br from-zinc-900/90 to-black/90 border-4 border-amber-900/40 rounded-3xl p-4 shadow-2xl">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-amber-400 font-mono text-sm">staff notes</h3>
            {canEdit && (
              <button
                onClick={() => {
                  setEditStaffNotes(!editStaffNotes)
                  if (!editStaffNotes) setStaffNotes(user.staffNotes || '')
                }}
                className="text-amber-400 font-mono text-xs hover:text-amber-300"
              >
                {editStaffNotes ? 'cancel' : 'edit'}
              </button>
            )}
          </div>
          {editStaffNotes ? (
            <div>
              <textarea
                value={staffNotes}
                onChange={(e) => setStaffNotes(e.target.value)}
                rows={3}
                className="w-full bg-zinc-950/50 border-2 border-amber-900/30 text-amber-200 font-mono text-xs px-3 py-2 rounded-xl focus:outline-none focus:border-amber-700 mb-2 resize-none"
                placeholder="notes..."
              />
              <button
                onClick={saveNotes}
                disabled={updating}
                className="px-4 py-1.5 bg-amber-900/50 hover:bg-amber-900/70 border-2 border-amber-700 text-amber-200 font-mono text-xs rounded-xl disabled:opacity-50"
              >
                {updating ? 'saving...' : 'save'}
              </button>
            </div>
          ) : (
            <div className="text-amber-300/60 font-mono text-xs whitespace-pre-wrap">
              {user.staffNotes || 'no notes yet'}
            </div>
          )}
        </div>
        <div className="bg-gradient-to-br from-zinc-900/90 to-black/90 border-4 border-amber-900/40 rounded-3xl p-4 shadow-2xl">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-amber-400 font-mono text-sm">skills</h3>
            {canEdit && (
              <button
                onClick={() => setEditing(!editing)}
                className="text-amber-400 font-mono text-xs hover:text-amber-300"
              >
                {editing ? 'cancel' : 'edit'}
              </button>
            )}
          </div>
          {editing ? (
            <div>
              <div className="grid grid-cols-2 gap-1 mb-2 max-h-32 overflow-y-auto">
                {SKILLS.map((s) => (
                  <button
                    key={s}
                    onClick={() => flip(s)}
                    className={`font-mono text-xs px-2 py-1 border-2 rounded-lg transition-colors text-left ${selected.includes(s) ? 'bg-amber-900/30 text-amber-200 border-amber-700' : 'bg-zinc-900/20 text-amber-300/50 border-amber-900/30 hover:bg-zinc-900/30'}`}
                  >
                    {selected.includes(s) && '✓ '}
                    {s}
                  </button>
                ))}
              </div>
              <button
                onClick={save}
                disabled={updating}
                className="px-4 py-1.5 bg-amber-900/50 hover:bg-amber-900/70 border-2 border-amber-700 text-amber-200 font-mono text-xs rounded-xl disabled:opacity-50"
              >
                {updating ? 'saving...' : 'save'}
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap gap-1">
              {user.skills && user.skills.length > 0 ? (
                user.skills.map((s) => (
                  <span
                    key={s}
                    className="bg-amber-900/30 text-amber-200 px-2 py-1 font-mono text-xs border-2 border-amber-800/50 rounded-lg"
                  >
                    {s}
                  </span>
                ))
              ) : (
                <span className="text-amber-300/40 font-mono text-xs">none</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* keys + logs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 mb-6">
        <div className="bg-gradient-to-br from-zinc-900/90 to-black/90 border-4 border-amber-900/40 rounded-3xl p-4 shadow-2xl">
          <h3 className="text-amber-400 font-mono text-sm mb-3">yubikeys</h3>
          {keys.length > 0 ? (
            <div className="space-y-2">
              {keys.map((k) => (
                <div
                  key={k.id}
                  className="flex items-center justify-between bg-zinc-900/50 border border-amber-900/30 p-3 rounded-xl"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-amber-200 font-mono text-xs mb-1 truncate">
                      {k.credentialId.substring(0, 24)}...
                    </div>
                    <div className="text-amber-300/50 font-mono text-xs">
                      {new Date(k.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  {canEdit && (
                    <button
                      onClick={() => rmKey(k.id)}
                      disabled={updating}
                      className="bg-red-900/50 text-red-200 font-mono text-xs px-2 py-1 hover:bg-red-900/70 border-2 border-red-700/50 rounded-xl disabled:opacity-50 ml-2"
                    >
                      remove
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-amber-300/40 font-mono text-xs">none</div>
          )}
        </div>
        <div className="bg-gradient-to-br from-zinc-900/90 to-black/90 border-4 border-amber-900/40 rounded-3xl p-4 shadow-2xl">
          <h3 className="text-amber-400 font-mono text-sm mb-3">audit log</h3>
          {logs.length > 0 ? (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {logs.map((l) => (
                <div key={l.id} className="border-l-2 border-amber-700 pl-3 py-1">
                  <div className="text-amber-200 font-mono text-xs mb-1">{l.action}</div>
                  {l.details && (
                    <div className="text-amber-300/50 font-mono text-xs mb-1">{l.details}</div>
                  )}
                  <div className="text-amber-300/40 font-mono text-xs">
                    {l.admin.username} • {new Date(l.createdAt).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-amber-300/40 font-mono text-xs">no actions yet</div>
          )}
        </div>
      </div>
    </>
  )
}
