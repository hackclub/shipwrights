'use client'

import { useState } from 'react'
import { Cert } from '@/types'

interface Props {
  onResults: (certs: Cert[] | null) => void
  onLoading: (loading: boolean) => void
  resultCount?: number | null
}

export function CertSearch({ onResults, onLoading, resultCount }: Props) {
  const [q, setQ] = useState('')

  const search = async (val: string) => {
    const v = val.trim()
    if (!v) {
      onResults(null)
      return
    }
    onLoading(true)
    try {
      const res = await fetch(`/api/admin/ship_certifications?search=${encodeURIComponent(v)}`)
      if (!res.ok) throw new Error()
      const data = await res.json()
      onResults(data.certifications || [])
    } catch {
      onResults([])
    } finally {
      onLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setQ(val)
    if (!val.trim()) onResults(null)
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') search(q)
    if (e.key === 'Escape') {
      setQ('')
      onResults(null)
    }
  }

  return (
    <div className="bg-gradient-to-br from-zinc-900/90 to-black/90 border-2 border-amber-900/40 rounded-2xl p-3 w-full md:w-72 h-fit self-end">
      <input
        type="text"
        value={q}
        onChange={handleChange}
        onKeyDown={handleKey}
        placeholder="Slack ID or FT ID"
        className="w-full bg-zinc-950/50 border-2 border-amber-900/30 text-amber-200 rounded-xl p-2 font-mono text-sm focus:outline-none focus:border-amber-700 transition-colors"
      />
      {resultCount !== null && resultCount !== undefined && (
        <div className="text-cyan-400 font-mono text-xs mt-2">
          {resultCount} result{resultCount !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  )
}
