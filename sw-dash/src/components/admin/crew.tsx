'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'

interface Member {
  id: string
  username: string
  avatar?: string
}

export function Crew() {
  const [crew, setCrew] = useState<Member[]>([])

  useEffect(() => {
    const poll = () => {
      fetch('/api/admin/online')
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.crew) setCrew(data.crew)
        })
        .catch(() => {})
    }
    poll()
    const iv = setInterval(poll, 120000)
    return () => clearInterval(iv)
  }, [])

  return (
    <div className="hidden md:block fixed top-4 right-4 z-40">
      <div className="bg-zinc-950/90 border-2 border-amber-900/40 rounded-2xl p-3 backdrop-blur-md shadow-xl shadow-amber-950/20 min-w-[140px]">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-2 h-2 bg-green-500 rounded-full shadow-lg shadow-green-500/50"></div>
          <span className="text-amber-500/80 font-mono text-xs">da crew online</span>
        </div>
        {crew.length === 0 ? (
          <p className="text-gray-500 font-mono text-xs italic">nobody:/</p>
        ) : (
          <div className="flex flex-col gap-1">
            {crew.slice(0, 8).map((m) => (
              <div key={m.id} className="flex items-center gap-2">
                {m.avatar ? (
                  <Image
                    src={m.avatar}
                    alt=""
                    width={20}
                    height={20}
                    className="w-5 h-5 rounded-full border border-gray-600"
                  />
                ) : (
                  <div className="w-5 h-5 rounded-full border border-amber-800/50 bg-zinc-900 flex items-center justify-center text-amber-500/80 text-[10px] font-mono">
                    {m.username.charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="text-amber-200/90 font-mono text-xs">{m.username}</span>
              </div>
            ))}
            {crew.length > 8 && (
              <span className="text-gray-500 font-mono text-xs">+{crew.length - 8} more</span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
