'use client'

import Image from 'next/image'
import Commits from '@/components/ui/commits'
import { useState, useEffect } from 'react'
import { startAuthentication } from '@simplewebauthn/browser'
import type { PublicKeyCredentialRequestOptionsJSON } from '@simplewebauthn/browser'

export default function Home() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [banned, setBanned] = useState(false)
  const [mode, setMode] = useState<'slack' | 'key'>('slack')
  const [username, setUsername] = useState('')
  const [keyLoad, setKeyLoad] = useState(false)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    const init = async () => {
      let cached = null
      try {
        cached = localStorage.getItem('sw_auth')
      } catch {}

      try {
        const res = await fetch('/api/admin')
        if (res.ok) {
          try {
            localStorage.setItem('sw_auth', '1')
          } catch {}
          window.location.href = `${process.env.NEXT_PUBLIC_URL}/admin`
          return
        }
        try {
          localStorage.removeItem('sw_auth')
        } catch {}
      } catch {
        if (cached) {
          try {
            localStorage.removeItem('sw_auth')
          } catch {}
        }
      }
      setChecking(false)
    }

    const urlParams = new URLSearchParams(window.location.search)
    const errorParam = urlParams.get('error')

    if (errorParam) {
      try {
        localStorage.removeItem('sw_auth')
      } catch {}
      setChecking(false)
      switch (errorParam) {
        case 'no_access_get_fucked':
          setError('you cancelled the login, pussy')
          break
        case 'naughty_fucker':
          setBanned(true)
          break
        case 'server_bumbum':
          setError('server exploded')
          break
        default:
          setError('server exploded')
      }
    }

    init()
  }, [])

  const slackLogin = async () => {
    setLoading(true)
    setError('')

    window.location.href = `${process.env.NEXT_PUBLIC_URL}/api/login`
  }

  const keyLogin = async () => {
    if (!username.trim()) {
      setError('gimme your username')
      return
    }

    setKeyLoad(true)
    setError('')

    try {
      const optRes = await fetch('/api/webauthn/auth-options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim() }),
      })

      if (!optRes.ok) {
        const err = await optRes.json()
        setError(err.error || 'key setup broke')
        setKeyLoad(false)
        return
      }

      const options: PublicKeyCredentialRequestOptionsJSON = await optRes.json()
      const credential = await startAuthentication({ optionsJSON: options })

      const verifyRes = await fetch('/api/webauthn/auth-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential, username: username.trim() }),
      })

      if (!verifyRes.ok) {
        const err = await verifyRes.json()
        setError(err.error || 'key check failed')
        setKeyLoad(false)
        return
      }

      window.location.href = `${process.env.NEXT_PUBLIC_URL}/admin`
    } catch (err) {
      if (err instanceof Error) {
        if (err.message.includes('timed out') || err.message.includes('timeout')) {
          setError('yo ur yubikey took too long, try again')
        } else if (err.message.includes('not allowed')) {
          setError('denied ur yubikey, hit cancel? try again')
        } else {
          setError(err.message)
        }
      } else {
        setError('login exploded, try again')
      }

      setKeyLoad(false)
    }
  }

  if (checking) {
    return (
      <div className="bg-grid min-h-screen w-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Image src="/logo_nobg_dark.png" alt="loading" width={120} height={120} priority />
          <p className="text-amber-500/70 font-mono text-sm">checking ur session...</p>
        </div>
      </div>
    )
  }

  if (banned) {
    return (
      <div className="bg-grid min-h-screen w-full flex items-center justify-center">
        <Image
          src="/unauthorized.gif"
          alt="unauthorized"
          width={600}
          height={600}
          className="object-contain"
        />
      </div>
    )
  }

  return (
    <div className="bg-grid min-h-screen w-full">
      <div className="flex flex-col items-center justify-center min-h-screen px-3 md:px-4">
        <div className="border-4 border-amber-900/40 bg-gradient-to-br from-zinc-900/90 to-black/90 backdrop-blur-md rounded-3xl p-6 md:p-10 w-full max-w-md shadow-2xl shadow-amber-950/50 relative overflow-visible">
          <div className="absolute -top-9 -right-6 md:-top-16 md:-right-16 rotate-12 animate-bounce-slow z-20">
            <Image
              src="/logo_nobg_dark.png"
              alt="Shipso Certifico"
              width={160}
              height={160}
              priority
              unoptimized
              className="object-contain w-23 h-23 md:w-36 md:h-36 drop-shadow-2xl"
            />
          </div>

          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-600/5 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-amber-600/5 rounded-full blur-3xl"></div>

          <div className="text-center mb-8 relative z-10">
            <h1 className="text-white text-2xl md:text-3xl font-mono mb-2 tracking-tight">
              Shipso Certifico
            </h1>
          </div>

          <div className="flex gap-2 mb-6 bg-zinc-950/50 p-1.5 rounded-2xl border border-amber-900/20">
            <button
              onClick={() => setMode('slack')}
              className={`flex-1 py-3 font-mono text-sm rounded-xl transition-all ${
                mode === 'slack'
                  ? 'bg-amber-600/20 text-amber-400 border border-amber-600/40 shadow-lg shadow-amber-600/20'
                  : 'text-gray-500 hover:text-gray-300 hover:bg-zinc-900/50'
              }`}
            >
              slack
            </button>
            <button
              onClick={() => setMode('key')}
              className={`flex-1 py-3 font-mono text-sm rounded-xl transition-all ${
                mode === 'key'
                  ? 'bg-amber-600/20 text-amber-400 border border-amber-600/40 shadow-lg shadow-amber-600/20'
                  : 'text-gray-500 hover:text-gray-300 hover:bg-zinc-900/50'
              }`}
            >
              yubikey
            </button>
          </div>

          <div className="space-y-4 mb-6">
            {error && (
              <div className="bg-red-950/30 border-2 border-red-700/50 rounded-2xl p-4 backdrop-blur-sm">
                <p className="text-red-400 font-mono text-sm text-center">{error}</p>
              </div>
            )}

            {mode === 'slack' ? (
              <button
                onClick={slackLogin}
                disabled={loading}
                className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white py-4 font-mono text-sm hover:from-green-500 hover:to-emerald-500 transition-all rounded-2xl disabled:opacity-50 shadow-lg shadow-green-900/30 hover:shadow-green-900/50 hover:scale-[1.02] active:scale-[0.98]"
              >
                {loading ? 'redirecting...' : 'login with slack'}
              </button>
            ) : (
              <div className="space-y-3">
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && keyLogin()}
                  placeholder="slack username"
                  className="w-full bg-zinc-950/50 border-2 border-amber-900/30 text-white px-5 py-4 font-mono text-sm focus:outline-none focus:border-amber-600/50 rounded-2xl placeholder:text-gray-600"
                  disabled={keyLoad}
                />
                <button
                  onClick={keyLogin}
                  disabled={keyLoad || !username.trim()}
                  className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white py-4 font-mono text-sm hover:from-green-500 hover:to-emerald-500 transition-all rounded-2xl disabled:opacity-50 shadow-lg shadow-green-900/30 hover:shadow-green-900/50 hover:scale-[1.02] active:scale-[0.98]"
                >
                  {keyLoad ? 'checking idv...' : 'login with key'}
                </button>
              </div>
            )}
          </div>

          <div className="border-t border-amber-900/20 pt-5 mt-5">
            <p className="text-gray-500 font-mono text-[10px] md:text-xs text-center leading-relaxed">
              Private system for{' '}
              <a
                href={process.env.NEXT_PUBLIC_URL || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="text-amber-600/80 hover:text-amber-500 underline"
              >
                Shipwrights
              </a>{' '}
              only.
            </p>
          </div>
        </div>

        <div className="mt-6 bg-zinc-950/40 backdrop-blur-sm rounded-2xl px-5 py-3 border border-amber-900/20">
          <div className="flex items-center justify-center gap-2 text-[10px] md:text-xs font-mono text-gray-500">
            <span className="border-2 border-dashed border-green-600/40 text-green-500/80 px-2.5 py-1 rounded-lg bg-amber-600/5">
              Production
            </span>
            <span>·</span>
            <Commits />
          </div>
        </div>
      </div>
    </div>
  )
}
