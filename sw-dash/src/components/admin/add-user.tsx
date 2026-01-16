'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { ROLES } from '@/lib/perms'

const ROLES_LIST = Object.keys(ROLES).filter((r) => !['captain', 'megawright'].includes(r))
const SOURCES = ['slack application', 'direct invite', 'referral', 'other']

interface Preview {
  username: string
  avatar: string | null
  tz: string | null
}

interface Props {
  open: boolean
  onClose: () => void
  myName: string
  mySlackId: string
}

export function AddUser({ open, onClose, myName, mySlackId }: Props) {
  const [slackId, setSlackId] = useState('')
  const [username, setUsername] = useState('')
  const [role, setRole] = useState('shipwright')
  const [source, setSource] = useState('')
  const [fraudDone, setFraudDone] = useState(false)
  const [fraudById, setFraudById] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [preview, setPreview] = useState<Preview | null>(null)
  const [fraudPreview, setFraudPreview] = useState<Preview | null>(null)
  const [fetching, setFetching] = useState(false)
  const [fetchingFraud, setFetchingFraud] = useState(false)
  const [error, setError] = useState('')
  const [roleOpen, setRoleOpen] = useState(false)
  const [sourceOpen, setSourceOpen] = useState(false)

  const fetchSlack = useCallback(async (id: string) => {
    if (!id.trim() || id.length < 9) {
      setPreview(null)
      setUsername('')
      return
    }
    setFetching(true)
    try {
      const res = await fetch('/api/admin/users/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slackId: id }),
      })
      if (!res.ok) {
        setPreview(null)
        setUsername('')
        setError('cant find that slack user')
        return
      }
      const data = await res.json()
      setPreview({
        username: data.displayName || data.username,
        avatar: data.avatar,
        tz: data.timezone,
      })
      setUsername(data.displayName || data.username || '')
      setError('')
    } catch {
      setPreview(null)
      setError('slack fetch died')
    } finally {
      setFetching(false)
    }
  }, [])

  const fetchFraud = useCallback(async (id: string) => {
    if (!id.trim() || id.length < 9) {
      setFraudPreview(null)
      return
    }
    setFetchingFraud(true)
    try {
      const res = await fetch('/api/admin/users/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slackId: id }),
      })
      if (res.ok) {
        const data = await res.json()
        setFraudPreview({
          username: data.displayName || data.username,
          avatar: data.avatar,
          tz: null,
        })
      } else {
        setFraudPreview(null)
      }
    } catch {
      setFraudPreview(null)
    } finally {
      setFetchingFraud(false)
    }
  }, [])

  useEffect(() => {
    const t = setTimeout(() => {
      if (slackId.startsWith('U') && slackId.length >= 9) fetchSlack(slackId)
      else {
        setPreview(null)
        setUsername('')
      }
    }, 400)
    return () => clearTimeout(t)
  }, [slackId, fetchSlack])

  useEffect(() => {
    const t = setTimeout(() => {
      if (fraudById.startsWith('U') && fraudById.length >= 9) fetchFraud(fraudById)
      else setFraudPreview(null)
    }, 400)
    return () => clearTimeout(t)
  }, [fraudById, fetchFraud])

  if (!open) return null

  const reset = () => {
    setSlackId('')
    setUsername('')
    setRole('shipwright')
    setSource('')
    setFraudDone(false)
    setFraudById('')
    setNotes('')
    setPreview(null)
    setFraudPreview(null)
    setError('')
    setRoleOpen(false)
    setSourceOpen(false)
  }

  const close = () => {
    reset()
    onClose()
  }

  const setMe = () => {
    setFraudById(mySlackId)
  }

  const submit = async () => {
    if (!preview) return
    if (!username.trim()) {
      setError('need a username')
      return
    }
    if (!source) {
      setError('pick a source')
      return
    }
    if (role !== 'observer' && !fraudDone) {
      setError('fraud check required')
      return
    }
    if (role !== 'observer' && !fraudById) {
      setError('who did the fraud check?')
      return
    }

    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/admin/users/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slackId: slackId.trim(),
          username: username.trim(),
          role,
          source,
          fraudDone: role !== 'observer' ? fraudDone : false,
          fraudById: fraudById || null,
          notes: notes || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'shit broke')
        return
      }
      close()
      window.location.reload()
    } catch {
      setError('network died')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={close} />
      <div className="relative bg-gradient-to-br from-zinc-900 to-black border-4 border-amber-900/60 rounded-3xl p-6 w-full max-w-md shadow-2xl shadow-amber-950/40">
        <div className="space-y-4">
          <div>
            <label className="block text-amber-400/80 font-mono text-xs mb-1">
              SLACK ID <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={slackId}
              onChange={(e) => setSlackId(e.target.value)}
              placeholder="U0XXXXXXXXX"
              className="w-full bg-zinc-950/50 border-2 border-amber-900/30 text-amber-200 rounded-xl p-2 font-mono text-sm focus:outline-none focus:border-amber-700 transition-colors"
            />
            {fetching && (
              <span className="text-amber-500/60 font-mono text-xs mt-1 block">fetching...</span>
            )}
            {preview && (
              <div className="mt-2 p-2 border border-amber-900/30 bg-zinc-950/50 rounded-xl flex items-center gap-3">
                {preview.avatar && (
                  <Image
                    src={preview.avatar}
                    alt=""
                    width={32}
                    height={32}
                    className="w-8 h-8 rounded-full border border-amber-800/50"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-amber-200 font-mono text-xs truncate">
                    {preview.username}
                  </div>
                  {preview.tz && (
                    <div className="text-amber-500/60 font-mono text-xs">{preview.tz}</div>
                  )}
                </div>
              </div>
            )}
          </div>

          {preview && (
            <div>
              <label className="block text-amber-400/80 font-mono text-xs mb-1">
                USERNAME <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-zinc-950/50 border-2 border-amber-900/30 text-amber-200 rounded-xl p-2 font-mono text-sm focus:outline-none focus:border-amber-700 transition-colors"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="relative">
              <label className="block text-amber-400/80 font-mono text-xs mb-1">ROLE</label>
              <button
                type="button"
                onClick={() => {
                  setRoleOpen(!roleOpen)
                  setSourceOpen(false)
                }}
                className="w-full bg-zinc-950/50 border-2 border-amber-900/30 text-amber-200 rounded-xl p-2 font-mono text-sm text-left hover:border-amber-700 transition-colors flex justify-between items-center"
              >
                {role}
              </button>
              {roleOpen && (
                <div className="absolute top-full left-0 mt-1 bg-zinc-900 border-2 border-amber-900/40 rounded-xl overflow-hidden z-50 w-full max-h-48 overflow-y-auto">
                  {ROLES_LIST.map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => {
                        setRole(r)
                        setRoleOpen(false)
                      }}
                      className={`w-full text-left px-3 py-2 font-mono text-sm hover:bg-amber-900/30 transition-colors ${role === r ? 'text-amber-400 bg-amber-900/20' : 'text-amber-200'}`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="relative">
              <label className="block text-amber-400/80 font-mono text-xs mb-1">
                SOURCE <span className="text-red-400">*</span>
              </label>
              <button
                type="button"
                onClick={() => {
                  setSourceOpen(!sourceOpen)
                  setRoleOpen(false)
                }}
                className="w-full bg-zinc-950/50 border-2 border-amber-900/30 text-amber-200 rounded-xl p-2 font-mono text-sm text-left hover:border-amber-700 transition-colors flex justify-between items-center"
              >
                {source || 'pick...'}
              </button>
              {sourceOpen && (
                <div className="absolute top-full left-0 mt-1 bg-zinc-900 border-2 border-amber-900/40 rounded-xl overflow-hidden z-50 w-full">
                  {SOURCES.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => {
                        setSource(s)
                        setSourceOpen(false)
                      }}
                      className={`w-full text-left px-3 py-2 font-mono text-sm hover:bg-amber-900/30 transition-colors ${source === s ? 'text-amber-400 bg-amber-900/20' : 'text-amber-200'}`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {role !== 'observer' && (
            <div className="border border-amber-900/30 rounded-xl p-3 bg-zinc-950/30">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={fraudDone}
                  onChange={(e) => setFraudDone(e.target.checked)}
                  className="w-4 h-4 accent-amber-500"
                />
                <span className="text-amber-400/80 font-mono text-xs">FRAUD CHECK DONE</span>
              </label>
              {fraudDone && (
                <div className="mt-2 space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={fraudById}
                      onChange={(e) => setFraudById(e.target.value)}
                      placeholder="reviewer slack id"
                      className="flex-1 bg-zinc-950/50 border border-amber-900/30 text-amber-200 rounded-lg p-1.5 px-2 font-mono text-xs focus:outline-none focus:border-amber-700"
                    />
                    <button
                      type="button"
                      onClick={setMe}
                      className="px-2 py-1.5 bg-amber-900/30 hover:bg-amber-900/50 border border-amber-800/50 text-amber-400 font-mono text-xs rounded-lg transition-colors"
                    >
                      me
                    </button>
                  </div>
                  {fetchingFraud && (
                    <span className="text-amber-500/60 font-mono text-xs">fetching...</span>
                  )}
                  {fraudPreview && (
                    <div className="p-2 border border-amber-900/30 bg-zinc-950/50 rounded-lg flex items-center gap-2">
                      {fraudPreview.avatar && (
                        <Image
                          src={fraudPreview.avatar}
                          alt=""
                          width={24}
                          height={24}
                          className="w-6 h-6 rounded-full"
                        />
                      )}
                      <span className="text-amber-200 font-mono text-xs">
                        {fraudPreview.username}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div>
            <label className="block text-amber-400/80 font-mono text-xs mb-1">NOTES</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="optional..."
              rows={2}
              className="w-full bg-zinc-950/50 border-2 border-amber-900/30 text-amber-200 rounded-xl p-2 font-mono text-sm focus:outline-none focus:border-amber-700 transition-colors resize-none"
            />
          </div>

          {error && <div className="text-red-400 font-mono text-xs">{error}</div>}

          <button
            onClick={submit}
            disabled={loading || !preview}
            className="w-full bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 disabled:from-zinc-700 disabled:to-zinc-800 text-white font-mono py-3 rounded-xl transition-all duration-200 border-2 border-amber-500/50 disabled:border-zinc-600"
          >
            {loading ? 'ADDING...' : 'ADD USER'}
          </button>
        </div>
      </div>
    </div>
  )
}
