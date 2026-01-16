'use client'

import { useState, useEffect } from 'react'

function ago(date: string) {
  const diff = Date.now() - new Date(date).getTime()
  const mins = Math.floor(diff / 60000)
  const hrs = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  if (hrs < 24) return `${hrs}h ago`
  if (days < 30) return `${days}d ago`
  return `${Math.floor(days / 30)}mo ago`
}

export default function Commits() {
  const [info, setInfo] = useState('loading...')

  useEffect(() => {
    fetch('/api/internal/commits')
      .then((res) => res.json())
      .then((data) => {
        if (data.hash) {
          const t = data.date ? ago(data.date) : ''
          setInfo(t ? `${data.hash} · ${t}` : data.hash)
        } else {
          setInfo("can't reach github rn")
        }
      })
      .catch(() => setInfo("can't reach github rn"))
  }, [])

  return <p className="text-gray-600 font-mono text-xs min-w-[140px] min-h-[16px]">{info}</p>
}
