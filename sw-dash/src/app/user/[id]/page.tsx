'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { startRegistration } from '@simplewebauthn/browser'
import type { PublicKeyCredentialCreationOptionsJSON } from '@simplewebauthn/browser'
import { SKILLS } from '@/lib/skills'
import NotifToggle from '@/components/ui/notif-toggle'
import Wip from '@/components/ui/wip'

interface User {
  id: number
  username: string
  slackId: string
  avatar?: string
  role?: string
  createdAt: string
  skills: string[]
}

interface SecurityKey {
  id: string
  name: string
  createdAt: string
  lastUsedAt: string | null
}

interface Session {
  id: string
  os: string
  browser: string
  ip: string
  createdAt: string
  expiresAt: string
  isCurrent: boolean
}

export default function Profile() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string
  const [user, setUser] = useState<User | null>(null)
  const [skills, setSkills] = useState<string[]>([])
  const [keys, setKeys] = useState<SecurityKey[]>([])
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [name, setName] = useState('')
  const [reg, setReg] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [snow, setSnow] = useState(true)

  const load = useCallback(async () => {
    try {
      const authRes = await fetch('/api/admin')
      if (!authRes.ok) {
        router.push('/')
        return
      }
      const authData = await authRes.json()

      if (authData.currentUser.id !== parseInt(params.id as string)) {
        setError('cant peek at other peoples shit')
        setLoading(false)
        return
      }

      const [userRes, skillsRes, keysRes, sessionsRes] = await Promise.all([
        fetch(`/api/admin/users/${params.id}`),
        fetch(`/api/admin/users/${params.id}/skills`),
        fetch('/api/webauthn/keys'),
        fetch('/api/sessions'),
      ])

      if (userRes.ok) {
        const userData = await userRes.json()
        setUser(userData)
      }

      if (skillsRes.ok) {
        const skillsData = await skillsRes.json()
        setSkills(skillsData.skills || [])
      }

      if (keysRes.ok) {
        const keysData = await keysRes.json()
        setKeys(keysData.keys || [])
      }

      if (sessionsRes.ok) {
        const sessionsData = await sessionsRes.json()
        setSessions(sessionsData.sessions || [])
      }
    } catch {
      setError('profile load broke')
    } finally {
      setLoading(false)
    }
  }, [params.id, router])

  useEffect(() => {
    load()
    const saved = localStorage.getItem('snow')
    if (saved !== null) setSnow(saved === 'true')
  }, [id, load])

  const add = async () => {
    if (!name.trim()) {
      setError('name your key first')
      return
    }

    setReg(true)
    setError('')

    try {
      const optRes = await fetch('/api/webauthn/register-options', {
        method: 'POST',
      })

      if (!optRes.ok) {
        const err = await optRes.json()
        setError(err.error || 'key setup broke')
        setReg(false)
        return
      }

      const options: PublicKeyCredentialCreationOptionsJSON = await optRes.json()
      const credential = await startRegistration({ optionsJSON: options })

      const verifyRes = await fetch('/api/webauthn/register-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential, name }),
      })

      if (!verifyRes.ok) {
        const err = await verifyRes.json()
        setError(err.error || 'key verify broke')
        setReg(false)
        return
      }

      setName('')
      load()
    } catch (err) {
      if (err instanceof Error) {
        if (err.message.includes('timed out') || err.message.includes('timeout')) {
          setError('yubikey took forever to respond, try again or check if its plugged in')
        } else if (err.message.includes('not allowed')) {
          setError('u denied the yubikey prompt, try again if u want')
        } else {
          setError(err.message)
        }
      } else {
        setError('registration exploded, try again')
      }
    } finally {
      setReg(false)
    }
  }

  const del = async (keyId: string) => {
    if (!confirm('delete this key? no going back')) return

    try {
      const res = await fetch('/api/webauthn/keys', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyId }),
      })

      if (res.ok) {
        load()
      } else {
        setError('key delete broke')
      }
    } catch {
      setError('delete request died')
    }
  }

  const kill = async (sessionId: string) => {
    try {
      const res = await fetch('/api/sessions', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      })

      if (res.ok) {
        setSessions((prev) => prev.filter((s) => s.id !== sessionId))
      } else {
        const err = await res.json()
        setError(err.error || 'session kill broke')
      }
    } catch {
      setError('network exploded')
    }
  }

  const flip = async (skill: string) => {
    setUpdating(true)
    const action = skills.includes(skill) ? 'remove' : 'add'

    try {
      const res = await fetch('/api/admin/skills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skill, action }),
      })

      const data = await res.json()
      if (res.ok) {
        if (action === 'add') {
          setSkills((prev) => [...prev, skill])
        } else {
          setSkills((prev) => prev.filter((s) => s !== skill))
        }
        setError('')
      } else {
        setError(data.error || 'skill update broke')
      }
    } catch {
      setError('network broke')
    } finally {
      setUpdating(false)
    }
  }

  const skel = () => (
    <div className="bg-grid min-h-screen w-full p-8">
      <div className="max-w-4xl mx-auto">
        <div className="h-4 w-40 bg-zinc-800/40 rounded mb-6"></div>
        <div className="grid grid-cols-1 gap-8">
          <div className="bg-gradient-to-br from-zinc-900/90 to-black/90 border-4 border-amber-900/40 rounded-3xl p-6 min-h-[200px]">
            <div className="h-5 w-24 bg-zinc-800/50 rounded mb-4"></div>
            <div className="h-4 w-40 bg-zinc-800/30 rounded mb-4"></div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-10 bg-zinc-800/30 rounded-2xl"></div>
              ))}
            </div>
          </div>
          <div className="bg-gradient-to-br from-zinc-900/90 to-black/90 border-4 border-amber-900/40 rounded-3xl p-6 min-h-[160px]">
            <div className="h-5 w-28 bg-zinc-800/50 rounded mb-4"></div>
            <div className="space-y-3">
              {[...Array(2)].map((_, i) => (
                <div key={i} className="h-14 bg-zinc-800/30 rounded-2xl"></div>
              ))}
            </div>
          </div>
          <div className="bg-gradient-to-br from-zinc-900/90 to-black/90 border-4 border-amber-900/40 rounded-3xl p-6 min-h-[180px]">
            <div className="h-5 w-32 bg-zinc-800/50 rounded mb-4"></div>
            <div className="flex gap-2 mb-4">
              <div className="flex-1 h-10 bg-zinc-800/30 rounded-2xl"></div>
              <div className="h-10 w-24 bg-zinc-800/40 rounded-2xl"></div>
            </div>
            <div className="space-y-2">
              {[...Array(2)].map((_, i) => (
                <div key={i} className="h-16 bg-zinc-800/20 rounded-2xl"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  if (loading) return skel()

  if (error && !user) {
    return (
      <div className="bg-grid min-h-screen w-full flex items-center justify-center">
        <div className="text-amber-400 font-mono">{error}</div>
      </div>
    )
  }

  return (
    <div className="bg-grid min-h-screen w-full p-8">
      <div className="max-w-4xl mx-auto">
        <Link
          href="/admin"
          className="mb-6 text-amber-300/70 hover:text-amber-200 font-mono text-sm transition-colors inline-block"
        >
          ← back to dashboard
        </Link>

        <div className="grid grid-cols-1 gap-8">
          <div className="bg-gradient-to-br from-zinc-900/90 to-black/90 border-4 border-amber-900/40 rounded-3xl p-6 backdrop-blur-sm shadow-2xl shadow-amber-950/30">
            <h2 className="text-amber-400 font-mono text-lg mb-4">your skills</h2>
            <p className="text-amber-300/70 font-mono text-sm mb-4">click to add/remove</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {SKILLS.map((s) => {
                const selected = skills.includes(s)
                return (
                  <button
                    key={s}
                    onClick={() => flip(s)}
                    disabled={updating}
                    className={`px-4 py-2 rounded-2xl font-mono text-sm border-2 transition-all active:scale-[0.98] hover:scale-[1.02] ${
                      selected
                        ? 'bg-amber-900/30 text-amber-400 border-amber-700/50 hover:bg-amber-900/50 hover:border-amber-600/50'
                        : 'bg-zinc-900/30 text-amber-300/60 border-amber-900/30 hover:border-amber-800/40'
                    } disabled:opacity-50`}
                  >
                    {selected && '✓ '}
                    {s}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="bg-gradient-to-br from-zinc-900/90 to-black/90 border-4 border-amber-900/40 rounded-3xl p-6 backdrop-blur-sm shadow-2xl shadow-amber-950/30">
            <h2 className="text-amber-400 font-mono text-lg mb-4">notifications</h2>

            <div className="space-y-3">
              <NotifToggle />

              <div className="bg-zinc-900/30 border-2 border-amber-900/30 rounded-2xl p-4 relative">
                <Wip />
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-amber-200 font-medium text-sm">slack dm notifications</div>
                    <div className="text-amber-300/60 text-xs mt-1">get notified via slack dms</div>
                  </div>
                  <button
                    disabled
                    className="relative inline-flex h-6 w-11 items-center rounded-full bg-amber-900/20 opacity-50 cursor-not-allowed"
                  >
                    <span className="inline-block h-4 w-4 transform rounded-full bg-amber-400/50 translate-x-1" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-zinc-900/90 to-black/90 border-4 border-amber-900/40 rounded-3xl p-6 backdrop-blur-sm shadow-2xl shadow-amber-950/30">
            <div className="space-y-3">
              <div className="bg-zinc-900/30 border-2 border-amber-900/30 rounded-2xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-amber-200 font-medium text-sm">snowy dashy</div>
                    <div className="text-amber-300/60 text-xs mt-1">make dashy snowy!! :3</div>
                  </div>
                  <button
                    onClick={() => {
                      const next = !snow
                      setSnow(next)
                      localStorage.setItem('snow', String(next))
                      window.location.reload()
                    }}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      snow ? 'bg-amber-600' : 'bg-amber-900/20'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        snow ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-zinc-900/90 to-black/90 border-4 border-amber-900/40 rounded-3xl p-6 backdrop-blur-sm shadow-2xl shadow-amber-950/30">
            <h2 className="text-amber-400 font-mono text-lg mb-4">unhakable keys</h2>

            <div className="mb-4">
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="shiny key"
                  className="flex-1 bg-zinc-900 border-2 border-amber-900/40 text-amber-200 px-3 py-2 rounded-2xl font-mono text-sm focus:outline-none focus:border-amber-600/50"
                  disabled={reg}
                />
                <button
                  onClick={add}
                  disabled={reg || !name.trim()}
                  className="bg-amber-900/40 text-amber-200 px-4 py-2 rounded-2xl font-mono text-sm hover:bg-amber-800/50 hover:scale-[1.02] active:scale-[0.98] transition-all border-2 border-amber-900/40 disabled:opacity-50"
                >
                  {reg ? 'adding...' : 'add key'}
                </button>
              </div>
              {error && <p className="text-amber-400 font-mono text-xs">{error}</p>}
            </div>

            <div className="space-y-2">
              {keys.length === 0 ? (
                <p className="text-amber-300/60 font-mono text-sm">no keys registered</p>
              ) : (
                keys.map((k) => (
                  <div
                    key={k.id}
                    className="bg-zinc-900/50 border-2 border-amber-900/30 p-3 rounded-2xl flex justify-between items-center"
                  >
                    <div>
                      <p className="text-amber-200 font-mono text-sm">{k.name}</p>
                      <p className="text-amber-300/60 font-mono text-xs">
                        added {new Date(k.createdAt).toLocaleDateString()}
                        {k.lastUsedAt &&
                          ` • last used ${new Date(k.lastUsedAt).toLocaleDateString()}`}
                      </p>
                    </div>
                    <button
                      onClick={() => del(k.id)}
                      className="text-amber-400 hover:text-amber-300 font-mono text-sm transition-colors"
                    >
                      delete
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-gradient-to-br from-zinc-900/90 to-black/90 border-4 border-amber-900/40 rounded-3xl p-6 backdrop-blur-sm shadow-2xl shadow-amber-950/30">
            <h2 className="text-amber-400 font-mono text-lg mb-4">active sessions</h2>

            <div className="space-y-3">
              {sessions.length === 0 ? (
                <p className="text-amber-300/60 font-mono text-sm">no active sessions</p>
              ) : (
                sessions.map((s) => {
                  const created = new Date(s.createdAt)
                  const expires = new Date(s.expiresAt)
                  const now = new Date()
                  const daysLeft = Math.ceil(
                    (expires.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
                  )

                  return (
                    <div
                      key={s.id}
                      className={`bg-zinc-900/50 border-2 ${s.isCurrent ? 'border-amber-600/50' : 'border-amber-900/30'} rounded-2xl p-4 relative`}
                    >
                      {s.isCurrent && (
                        <div className="absolute top-2 right-2">
                          <span className="bg-amber-900/30 text-amber-400 border border-amber-700/50 px-2 py-0.5 rounded text-xs font-mono">
                            current
                          </span>
                        </div>
                      )}

                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <div className="text-amber-200 font-mono text-sm mb-1">
                            {s.os} @ {s.ip} $ {s.browser}
                          </div>
                          <div className="text-amber-300/60 font-mono text-xs space-y-0.5">
                            <div>logged in {created.toLocaleString()}</div>
                            <div>expires in {daysLeft} days</div>
                          </div>
                        </div>

                        {!s.isCurrent && (
                          <button
                            onClick={() => kill(s.id)}
                            className="text-amber-400 hover:text-amber-300 font-mono text-xs transition-colors ml-4"
                          >
                            kill
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
