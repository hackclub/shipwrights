'use client'

import { useState, useEffect } from 'react'
import { reg, ask, sub, unsub, check } from '@/lib/push'

type Status = 'checking' | 'denied' | 'unsupported' | 'ready'

export default function NotifToggle() {
  const [on, setOn] = useState(false)
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState<Status>('checking')
  const [err, setErr] = useState('')

  useEffect(() => {
    init()
  }, [])

  const init = async () => {
    try {
      const perm = await check()
      if (perm === 'unsupported') {
        setStatus('unsupported')
        setLoading(false)
        return
      }
      if (perm === 'denied') {
        setStatus('denied')
        setLoading(false)
        return
      }
      setStatus('ready')
      setOn(perm === 'granted')
    } catch (e) {
      setErr(`check broke: ${e}`)
      setStatus('unsupported')
    }
    setLoading(false)
  }

  const toggle = async () => {
    if (status === 'denied' || status === 'unsupported') return
    setLoading(true)
    setErr('')
    try {
      if (on) {
        await unsub()
        setOn(false)
      } else {
        await reg()
        const perm = await ask()
        if (perm === 'granted') {
          await sub()
          setOn(true)
        } else if (perm === 'denied') setStatus('denied')
      }
    } catch (e) {
      setErr(`toggle broke: ${e}`)
    }
    setLoading(false)
  }

  if (status === 'unsupported') {
    return (
      <div className="bg-zinc-900/30 border-2 border-amber-900/30 rounded-2xl p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-amber-200 font-medium text-sm">push notifications</div>
            <div className="text-amber-300/60 text-xs mt-1">browser doesnt support this shit</div>
          </div>
        </div>
      </div>
    )
  }

  if (status === 'denied') {
    return (
      <div className="bg-zinc-900/30 border-2 border-amber-900/30 rounded-2xl p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-amber-200 font-medium text-sm">push notifications</div>
            <div className="text-amber-400 text-xs mt-1">
              u blocked it - fix in browser settings
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-zinc-900/30 border-2 border-amber-900/30 rounded-2xl p-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-amber-200 font-medium text-sm">push notifications</div>
          <div className="text-amber-300/60 text-xs mt-1">
            {on ? 'ur getting notifs' : 'turn on to get notifs'}
          </div>
          {err && <div className="text-amber-400 text-xs mt-1">{err}</div>}
        </div>
        <button
          onClick={toggle}
          disabled={loading}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${on ? 'bg-amber-600' : 'bg-amber-900/40'} disabled:opacity-50`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-amber-100 transition-transform ${on ? 'translate-x-6' : 'translate-x-1'}`}
          />
        </button>
      </div>
    </div>
  )
}
