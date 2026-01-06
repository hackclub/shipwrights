'use client'

import { useState, useEffect } from 'react'

interface Props {
  balance: number
  logs: {
    projectName: string | null
    projectType: string | null
    cookiesEarned: number | null
    payoutMulti: number | null
  }[]
}

interface Req {
  id: number
  amount: number
  bonus: number
  bonusReason: string | null
  finalAmount: number | null
  status: string
  createdAt: string
}

export default function PayoutModal({ balance, logs }: Props) {
  const [open, setOpen] = useState(false)
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [reqs, setReqs] = useState<Req[]>([])

  const canRequest = balance >= 10

  useEffect(() => {
    if (open) {
      fetch('/api/admin/payouts')
        .then((r) => r.json())
        .then((data) => {
          if (Array.isArray(data)) {
            setReqs(data.filter((r: Req) => true))
          }
        })
    }
  }, [open])

  const submit = async () => {
    const val = parseFloat(amount)
    if (!val || val < 10) {
      setError('min 10 cookies')
      return
    }
    if (val > balance + 0.01) {
      setError('not enough cookies')
      return
    }

    setLoading(true)
    setError('')

    const res = await fetch('/api/admin/payouts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: val }),
    })

    const data = await res.json()
    setLoading(false)

    if (!res.ok) {
      setError(data.error || 'something broke')
      return
    }

    setOpen(false)
    window.location.reload()
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        disabled={!canRequest}
        className={`w-full mt-4 py-2 px-4 rounded-xl font-mono text-sm transition-all ${
          canRequest
            ? 'bg-green-600 hover:bg-green-500 text-white cursor-pointer'
            : 'bg-zinc-700 text-zinc-500 cursor-not-allowed'
        }`}
      >
        {canRequest ? 'Request Payout' : 'need 10+ cookies'}
      </button>
    )
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        disabled={!canRequest}
        className={`w-full mt-4 py-2 px-4 rounded-xl font-mono text-sm transition-all ${
          canRequest
            ? 'bg-green-600 hover:bg-green-500 text-white cursor-pointer'
            : 'bg-zinc-700 text-zinc-500 cursor-not-allowed'
        }`}
      >
        {canRequest ? 'Request Payout' : 'need 10+ cookies'}
      </button>

      <div
        className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
        onClick={() => setOpen(false)}
      >
        <div
          className="bg-zinc-900 border-4 border-green-900/50 rounded-3xl p-6 max-w-lg w-full max-h-[80vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <h2 className="text-green-400 font-mono text-xl mb-4">Request Payout 🍪</h2>

          <div className="space-y-4">
            <div className="bg-zinc-800/50 rounded-xl p-4">
              <div className="text-gray-400 font-mono text-xs mb-2">Your Balance</div>
              <div className="text-3xl font-mono font-bold text-green-400">
                {balance.toFixed(2)} 🍪
              </div>
            </div>

            <div className="bg-zinc-800/50 rounded-xl p-4">
              <div className="text-gray-400 font-mono text-xs mb-2">Recent Earnings Summary</div>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {logs.slice(0, 5).map((l, i) => (
                  <div key={i} className="flex justify-between text-xs font-mono">
                    <span className="text-gray-300 truncate">{l.projectName || 'project'}</span>
                    <span className="text-green-400">
                      +{l.cookiesEarned?.toFixed(2)} ({l.payoutMulti}x)
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="text-gray-400 font-mono text-xs">Amount to request (min 10)</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="10"
                min="10"
                max={balance}
                className="w-full mt-1 bg-zinc-800 border-2 border-zinc-700 rounded-xl p-3 text-white font-mono focus:border-green-500 outline-none"
              />
            </div>

            {error && <div className="text-red-400 font-mono text-sm">{error}</div>}

            <div className="flex gap-3">
              <button
                onClick={() => setOpen(false)}
                className="flex-1 py-2 bg-zinc-700 hover:bg-zinc-600 rounded-xl font-mono text-sm text-white"
              >
                Cancel
              </button>
              <button
                onClick={submit}
                disabled={loading}
                className="flex-1 py-2 bg-green-600 hover:bg-green-500 rounded-xl font-mono text-sm text-white disabled:opacity-50"
              >
                {loading ? 'sending...' : 'Submit Request'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
