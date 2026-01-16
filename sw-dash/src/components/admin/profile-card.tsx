'use client'

import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import Pwa from '@/components/ui/pwa'

interface User {
  id: number
  username: string
  avatar: string | null
  role: string
}

const roleStyle = (r: string) => {
  switch (r) {
    case 'megawright':
      return 'bg-purple-900/30 text-purple-400 border-purple-700/50'
    case 'captain':
      return 'bg-red-900/30 text-red-400 border-red-700/50'
    case 'shipwright':
      return 'bg-blue-900/30 text-blue-400 border-blue-700/50'
    case 'observer':
      return 'bg-gray-900/30 text-gray-400 border-gray-700/50'
    case 'syswright':
      return 'bg-green-900/30 text-green-400 border-green-700/50'
    default:
      return 'bg-yellow-900/30 text-yellow-400 border-yellow-700/50'
  }
}

export function ProfileCard({ user }: { user: User }) {
  const router = useRouter()

  const logout = async () => {
    localStorage.removeItem('sw_auth')
    await fetch('/api/logout', { method: 'POST' }).catch(() => {})
    router.push('/')
  }

  return (
    <div className="bg-gradient-to-br from-zinc-900/90 to-black/90 border-4 border-amber-900/40 rounded-3xl p-4 md:p-8 max-w-md mx-auto backdrop-blur-md shadow-2xl shadow-amber-950/30 relative">
      <Image
        src="/logo_nobg_notext.png"
        alt="shipso"
        width={160}
        height={160}
        priority
        className="absolute -top-2 -right-2 w-24 h-24 md:w-32 md:h-32 rotate-12 pointer-events-none z-10"
      />
      <div className="flex items-center mb-4">
        {user.avatar && (
          <Image
            src={user.avatar}
            alt="profile"
            width={64}
            height={64}
            className="w-12 h-12 md:w-16 md:h-16 rounded-full border-3 border-amber-700/50 mr-3 md:mr-4 shadow-lg shadow-amber-900/30"
          />
        )}
        <div className="flex-1 min-w-0">
          <h2 className="text-white text-lg md:text-xl font-mono font-bold truncate mb-1">
            {user.username}
          </h2>
          <p className="text-amber-500/70 font-mono text-sm mb-2">shipwright legend fr</p>
          <div className="flex gap-2 items-center">
            <span
              className={`inline-block font-mono text-xs px-2 py-1 rounded border ${roleStyle(user.role)}`}
            >
              {user.role}
            </span>
          </div>
        </div>
      </div>
      <button
        onClick={logout}
        className="w-full mt-4 bg-red-950/30 border-2 border-red-700/50 text-red-400 hover:bg-red-900/50 font-mono text-sm px-4 py-2 rounded-2xl transition-all hover:border-red-600 hover:scale-[1.02] active:scale-[0.98]"
      >
        logout
      </button>
      <div className="mt-4">
        <Pwa />
      </div>
    </div>
  )
}
