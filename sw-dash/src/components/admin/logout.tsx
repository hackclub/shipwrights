'use client'

import { useRouter } from 'next/navigation'

export function Logout() {
  const router = useRouter()

  const go = async () => {
    localStorage.removeItem('sw_auth')
    await fetch('/api/logout', { method: 'POST' }).catch(() => {})
    router.push('/')
  }

  return (
    <button
      onClick={go}
      className="w-full mt-4 bg-red-950/30 border-2 border-red-700/50 text-red-400 hover:bg-red-900/50 font-mono text-sm px-4 py-2 rounded-2xl transition-all hover:border-red-600 hover:scale-[1.02] active:scale-[0.98]"
    >
      logout
    </button>
  )
}
