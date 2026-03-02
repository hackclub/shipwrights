'use client'

import { useState, useEffect } from 'react'
import { ago } from '@/lib/fmt'

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
