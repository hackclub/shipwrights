'use client'

import { useState, useRef, useCallback } from 'react'
import { useClickOutside } from '@/hooks/useClickOutside'

interface Props {
  status: string
  sortBy: string
  ftId: string
  shipCertId: string
  includeReviewers: string[]
  excludeReviewers: string[]
  allReviewers: string[]
  stats: { pending: number; done: number; returned: number; total: number }
  onChange: (vals: {
    status: string
    sortBy: string
    ftId: string
    shipCertId: string
    includeReviewers: string[]
    excludeReviewers: string[]
  }) => void
}

export function FilterModal({
  status,
  sortBy,
  ftId,
  shipCertId,
  includeReviewers,
  excludeReviewers,
  allReviewers,
  stats,
  onChange,
}: Props) {
  const [open, setOpen] = useState(false)
  const [localStatus, setLocalStatus] = useState(status)
  const [localSort, setLocalSort] = useState(sortBy)
  const [localFtId, setLocalFtId] = useState(ftId)
  const [localCertId, setLocalCertId] = useState(shipCertId)
  const [localInclude, setLocalInclude] = useState<string[]>(includeReviewers)
  const [localExclude, setLocalExclude] = useState<string[]>(excludeReviewers)
  const ref = useRef<HTMLDivElement>(null)
  useClickOutside(
    ref,
    useCallback(() => setOpen(false), [])
  )

  const apply = () => {
    onChange({
      status: localStatus,
      sortBy: localSort,
      ftId: localFtId,
      shipCertId: localCertId,
      includeReviewers: localInclude,
      excludeReviewers: localExclude,
    })
    setOpen(false)
  }

  const reset = () => {
    setLocalStatus('pending')
    setLocalSort('newest')
    setLocalFtId('')
    setLocalCertId('')
    setLocalInclude([])
    setLocalExclude([])
  }

  const toggleReviewer = (name: string, list: string[], setList: (v: string[]) => void) => {
    setList(list.includes(name) ? list.filter((x) => x !== name) : [...list, name])
  }

  const activeCount = [
    status !== 'pending',
    sortBy !== 'newest',
    !!ftId,
    !!shipCertId,
    includeReviewers.length > 0,
    excludeReviewers.length > 0,
  ].filter(Boolean).length

  const Chip = ({
    val,
    cur,
    set,
    label,
    color,
  }: {
    val: string
    cur: string
    set: (v: string) => void
    label: string
    color?: string
  }) => (
    <button
      onClick={() => set(val)}
      className={`font-mono text-xs px-3 py-1.5 rounded-xl border transition-all ${cur === val ? color || 'bg-amber-900/40 text-amber-300 border-amber-600' : 'bg-zinc-900/40 text-gray-400 border-zinc-700 hover:border-zinc-500'}`}
    >
      {label}
    </button>
  )

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="relative font-mono text-xs px-4 py-2 rounded-2xl border-2 bg-zinc-900/50 text-amber-300 border-amber-800/50 hover:border-amber-600 transition-all flex items-center gap-2"
      >
        <span>⚙ Search & Filter</span>
        {activeCount > 0 && (
          <span className="bg-amber-500 text-black text-xs font-bold px-1.5 py-0.5 rounded-full leading-none">
            {activeCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-2 z-50 w-[420px] max-w-[95vw] bg-zinc-950 border-2 border-amber-900/60 rounded-2xl shadow-2xl p-5 space-y-5">
          <div className="flex justify-between items-center">
            <span className="text-amber-400 font-mono text-sm font-bold">Search & Filter</span>
            <button
              onClick={() => setOpen(false)}
              className="text-gray-500 hover:text-gray-300 font-mono text-lg leading-none"
            >
              ×
            </button>
          </div>

          <div className="space-y-2">
            <label className="text-gray-400 font-mono text-xs">FT Project ID</label>
            <input
              value={localFtId}
              onChange={(e) => setLocalFtId(e.target.value)}
              placeholder="search by ft project id..."
              className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 font-mono text-xs text-white placeholder-gray-600 focus:outline-none focus:border-amber-600"
            />
          </div>

          <div className="space-y-2">
            <label className="text-gray-400 font-mono text-xs">Ship Cert ID</label>
            <input
              value={localCertId}
              onChange={(e) => setLocalCertId(e.target.value)}
              placeholder="exact cert id..."
              type="number"
              className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 font-mono text-xs text-white placeholder-gray-600 focus:outline-none focus:border-amber-600"
            />
          </div>

          <div className="space-y-2">
            <label className="text-gray-400 font-mono text-xs">Status</label>
            <div className="flex flex-wrap gap-2">
              <Chip
                val="pending"
                cur={localStatus}
                set={setLocalStatus}
                label={`Pending (${stats.pending})`}
                color="bg-yellow-900/40 text-yellow-300 border-yellow-700"
              />
              <Chip
                val="done"
                cur={localStatus}
                set={setLocalStatus}
                label={`Done (${stats.done})`}
                color="bg-green-900/40 text-green-300 border-green-700"
              />
              <Chip
                val="returned"
                cur={localStatus}
                set={setLocalStatus}
                label={`Returned (${stats.returned})`}
                color="bg-red-900/40 text-red-300 border-red-700"
              />
              <Chip
                val="all"
                cur={localStatus}
                set={setLocalStatus}
                label={`All (${stats.total})`}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-gray-400 font-mono text-xs">Sort By</label>
            <div className="flex flex-wrap gap-2">
              <Chip val="newest" cur={localSort} set={setLocalSort} label="Newest" />
              <Chip val="oldest" cur={localSort} set={setLocalSort} label="Oldest" />
              <Chip val="devlogs" cur={localSort} set={setLocalSort} label="Devlog Count" />
              <Chip val="time" cur={localSort} set={setLocalSort} label="Time Count" />
            </div>
          </div>

          {allReviewers.length > 0 && (
            <>
              <div className="space-y-2">
                <label className="text-gray-400 font-mono text-xs">Include Reviewers</label>
                <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
                  {allReviewers.map((r) => (
                    <button
                      key={r}
                      onClick={() => toggleReviewer(r, localInclude, setLocalInclude)}
                      className={`font-mono text-xs px-2.5 py-1 rounded-xl border transition-all ${localInclude.includes(r) ? 'bg-cyan-900/40 text-cyan-300 border-cyan-600' : 'bg-zinc-900/40 text-gray-400 border-zinc-700 hover:border-zinc-500'}`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-gray-400 font-mono text-xs">Exclude Reviewers</label>
                <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
                  {allReviewers.map((r) => (
                    <button
                      key={r}
                      onClick={() => toggleReviewer(r, localExclude, setLocalExclude)}
                      className={`font-mono text-xs px-2.5 py-1 rounded-xl border transition-all ${localExclude.includes(r) ? 'bg-red-900/40 text-red-300 border-red-700' : 'bg-zinc-900/40 text-gray-400 border-zinc-700 hover:border-zinc-500'}`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          <div className="flex gap-2 pt-1">
            <button
              onClick={reset}
              className="flex-1 font-mono text-xs px-3 py-2 rounded-xl border border-zinc-700 text-gray-400 hover:text-gray-200 hover:border-zinc-500 transition-all"
            >
              reset
            </button>
            <button
              onClick={apply}
              className="flex-1 font-mono text-xs px-3 py-2 rounded-xl bg-amber-900/40 text-amber-300 border border-amber-700 hover:bg-amber-900/60 transition-all"
            >
              apply
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
