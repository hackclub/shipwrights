'use client'

import { useState } from 'react'
import Image from 'next/image'

interface Req {
  id: number
  userId: number
  amount: number
  bonus: number
  bonusReason: string | null
  finalAmount: number | null
  balBefore: number
  balAfter: number | null
  status: string
  proofUrl: string | null
  createdAt: Date
  approvedAt: Date | null
  user: {
    id: number
    username: string
    avatar: string | null
    slackId: string
    cookieBalance: number
    ftuid?: string | null
  }
  admin: { id: number; username: string; avatar: string | null } | null
}

export default function PayoutsTable({ reqs: init }: { reqs: Req[] }) {
  const [reqs, setReqs] = useState(init)
  const [modal, setModal] = useState<Req | null>(null)
  const [view, setView] = useState<Req | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [bonus, setBonus] = useState('')
  const [bonusReason, setBonusReason] = useState('')
  const [copied, setCopied] = useState(false)

  const payoutRef = (id: number) => `Ship Reviews payout (#swp-${id})`

  const copyRef = (id: number) => {
    navigator.clipboard.writeText(payoutRef(id))
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const fmt = (d: Date) =>
    new Date(d).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })

  const approve = async () => {
    if (!modal) return
    if (!file) {
      setError('upload proof first dumbass')
      return
    }
    setLoading(true)
    setError('')

    try {
      let proofUrl = null

      if (file) {
        const presign = await fetch('/api/admin/payouts', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filename: file.name, contentType: file.type }),
        })

        if (!presign.ok) throw new Error('presign failed')

        const { uploadUrl, publicUrl } = await presign.json()

        await fetch(uploadUrl, {
          method: 'PUT',
          body: file,
          headers: { 'Content-Type': file.type },
        })

        proofUrl = publicUrl
      }

      const bonusVal = parseFloat(bonus) || 0

      const res = await fetch('/api/admin/payouts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: modal.id,
          proofUrl,
          bonus: bonusVal,
          bonusReason: bonusReason || null,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'approve failed')
      }

      setModal(null)
      setFile(null)
      setBonus('')
      setBonusReason('')
      window.location.reload()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'something broke')
    } finally {
      setLoading(false)
    }
  }

  const refund = async (id: number) => {
    if (!confirm('refund this? cookies go back to user')) return
    const res = await fetch('/api/admin/payouts', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    if (!res.ok) {
      const data = await res.json()
      alert(data.error || 'refund failed')
      return
    }
    window.location.reload()
  }

  return (
    <>
      <div className="bg-gradient-to-br from-zinc-900/90 to-black/90 border-4 border-amber-900/40 rounded-3xl shadow-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-amber-900/30 bg-zinc-900/50">
              <th className="text-left p-4 text-amber-400 font-mono text-sm">#</th>
              <th className="text-left p-4 text-amber-400 font-mono text-sm">user</th>
              <th className="text-left p-4 text-amber-400 font-mono text-sm">status</th>
              <th className="text-right p-4 text-amber-400 font-mono text-sm">amount</th>
              <th className="text-right p-4 text-amber-400 font-mono text-sm">balance</th>
              <th className="text-left p-4 text-amber-400 font-mono text-sm">admin</th>
              <th className="text-right p-4 text-amber-400 font-mono text-sm">when</th>
              <th className="text-right p-4 text-amber-400 font-mono text-sm">action</th>
            </tr>
          </thead>
          <tbody>
            {reqs.map((r) => (
              <tr key={r.id} className="border-b border-amber-900/20 hover:bg-amber-950/20">
                <td className="p-4 text-amber-500/60 font-mono text-xs">#swp-{r.id}</td>
                <td className="p-4">
                  <div className="flex items-center gap-2">
                    {r.user.avatar && (
                      <Image
                        src={r.user.avatar}
                        alt=""
                        width={24}
                        height={24}
                        className="rounded-full"
                      />
                    )}
                    <span className="text-white font-mono text-sm">{r.user.username}</span>
                  </div>
                </td>
                <td className="p-4">
                  <span
                    className={`font-mono text-xs px-2 py-0.5 rounded-lg border ${
                      r.status === 'pending'
                        ? 'bg-yellow-900/30 text-yellow-400 border-yellow-700/50'
                        : 'bg-green-900/30 text-green-400 border-green-700/50'
                    }`}
                  >
                    {r.status === 'pending' ? 'pending' : 'paid'}
                  </span>
                </td>
                <td className="p-4 text-right text-green-400 font-mono font-bold">
                  {(r.status === 'approved' ? r.finalAmount || r.amount : r.amount).toFixed(1)} 🍪
                </td>
                <td className="p-4 text-right font-mono text-sm">
                  <span className="text-gray-400">{r.balBefore.toFixed(1)}</span>
                  <span className="text-gray-600 mx-1">→</span>
                  <span className={r.balAfter !== null ? 'text-green-400' : 'text-gray-500'}>
                    {r.balAfter !== null ? r.balAfter.toFixed(1) : '?'}
                  </span>
                </td>
                <td className="p-4">
                  {r.admin ? (
                    <div className="flex items-center gap-2">
                      {r.admin.avatar && (
                        <Image
                          src={r.admin.avatar}
                          alt=""
                          width={20}
                          height={20}
                          className="rounded-full"
                        />
                      )}
                      <span className="text-gray-400 font-mono text-xs">{r.admin.username}</span>
                    </div>
                  ) : (
                    <span className="text-gray-600 font-mono text-xs">-</span>
                  )}
                </td>
                <td className="p-4 text-right text-gray-500 font-mono text-xs">
                  {fmt(r.createdAt)}
                </td>
                <td className="p-4 text-right flex gap-2 justify-end">
                  {r.status === 'pending' ? (
                    <>
                      <button
                        onClick={() => refund(r.id)}
                        className="bg-red-600 hover:bg-red-500 text-white font-mono text-xs px-3 py-1 rounded-lg"
                      >
                        Refund
                      </button>
                      <button
                        onClick={() => setModal(r)}
                        className="bg-green-600 hover:bg-green-500 text-white font-mono text-xs px-3 py-1 rounded-lg"
                      >
                        Approve
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setView(r)}
                      className="text-cyan-400 hover:text-cyan-300 font-mono text-xs"
                    >
                      View
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {reqs.length === 0 && (
              <tr>
                <td colSpan={8} className="p-8 text-center text-gray-500 font-mono">
                  no requests yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {modal && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          onClick={() => setModal(null)}
        >
          <div
            className="bg-zinc-900 border-4 border-green-900/50 rounded-3xl p-6 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-green-400 font-mono text-xl mb-4">Approve Payout</h2>

            <div className="space-y-4">
              <div className="bg-zinc-800/50 rounded-xl p-4 space-y-2">
                <div className="flex justify-between items-center font-mono text-sm">
                  <span className="text-gray-400">ref:</span>
                  <div className="flex items-center gap-2">
                    <span className="text-cyan-400 text-xs">{payoutRef(modal.id)}</span>
                    <button
                      onClick={() => copyRef(modal.id)}
                      className="text-xs bg-zinc-700 hover:bg-zinc-600 px-2 py-1 rounded text-white"
                    >
                      {copied ? '✓' : 'copy'}
                    </button>
                  </div>
                </div>
                <div className="flex justify-between font-mono text-sm">
                  <span className="text-gray-400">user:</span>
                  <div className="flex items-center gap-2">
                    <span className="text-white">{modal.user.username}</span>
                    {modal.user.ftuid && (
                      <a
                        href={`${process.env.NEXT_PUBLIC_FLAVORTOWN_URL}/admin/users/${modal.user.ftuid}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-purple-400 hover:text-purple-300 border border-purple-700/50 px-1.5 py-0.5 rounded"
                      >
                        FT
                      </a>
                    )}
                  </div>
                </div>
                <div className="flex justify-between font-mono text-sm">
                  <span className="text-gray-400">requested:</span>
                  <span className="text-green-400 font-bold">{modal.amount.toFixed(1)} 🍪</span>
                </div>
                <div className="flex justify-between font-mono text-sm">
                  <span className="text-gray-400">balance:</span>
                  <span className="text-gray-300">
                    {modal.balBefore.toFixed(1)} → {(modal.balBefore - modal.amount).toFixed(1)}
                  </span>
                </div>
              </div>

              <div className="bg-amber-900/20 rounded-xl p-4 space-y-3 border border-amber-900/40">
                <div className="text-amber-400 font-mono text-xs">bonus (optional)</div>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={bonus}
                    onChange={(e) => setBonus(e.target.value)}
                    placeholder="0"
                    className="w-20 bg-zinc-800 border-2 border-zinc-700 rounded-lg p-2 text-white font-mono text-sm focus:border-amber-500 outline-none"
                  />
                  <input
                    type="text"
                    value={bonusReason}
                    onChange={(e) => setBonusReason(e.target.value)}
                    placeholder="reason for bonus..."
                    className="flex-1 bg-zinc-800 border-2 border-zinc-700 rounded-lg p-2 text-white font-mono text-sm focus:border-amber-500 outline-none"
                  />
                </div>
                {parseFloat(bonus) > 0 && (
                  <div className="flex justify-between font-mono text-sm pt-2 border-t border-amber-900/30">
                    <span className="text-amber-400">final payout:</span>
                    <span className="text-green-400 font-bold">
                      {(modal.amount + parseFloat(bonus)).toFixed(1)} 🍪
                    </span>
                  </div>
                )}
              </div>

              <div>
                <label className="text-gray-400 font-mono text-xs block mb-2">upload proof *</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:bg-zinc-700 file:text-white hover:file:bg-zinc-600"
                />
              </div>

              {error && <div className="text-red-400 font-mono text-sm">{error}</div>}

              <div className="flex gap-3">
                <button
                  onClick={() => setModal(null)}
                  className="flex-1 py-2 bg-zinc-700 hover:bg-zinc-600 rounded-xl font-mono text-sm text-white"
                >
                  Cancel
                </button>
                <button
                  onClick={approve}
                  disabled={loading}
                  className="flex-1 py-2 bg-green-600 hover:bg-green-500 rounded-xl font-mono text-sm text-white disabled:opacity-50"
                >
                  {loading ? 'sending...' : 'Approve'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {view && (
        <div
          className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4"
          onClick={() => setView(null)}
        >
          <div
            className="bg-zinc-900 border-4 border-cyan-900/50 rounded-3xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-cyan-400 font-mono text-xl mb-4">{payoutRef(view.id)}</h2>

            <div className="bg-zinc-800/50 rounded-xl p-4 space-y-2 mb-4">
              <div className="flex justify-between font-mono text-sm">
                <span className="text-gray-400">user:</span>
                <div className="flex items-center gap-2">
                  <span className="text-white">{view.user.username}</span>
                  {view.user.ftuid && (
                    <a
                      href={`${process.env.NEXT_PUBLIC_FLAVORTOWN_URL}/admin/users/${view.user.ftuid}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-purple-400 hover:text-purple-300 border border-purple-700/50 px-1.5 py-0.5 rounded"
                    >
                      FT
                    </a>
                  )}
                </div>
              </div>
              <div className="flex justify-between font-mono text-sm">
                <span className="text-gray-400">requested:</span>
                <span className="text-green-400">{view.amount.toFixed(2)} 🍪</span>
              </div>
              {view.bonus > 0 && (
                <>
                  <div className="flex justify-between font-mono text-sm">
                    <span className="text-amber-400">bonus:</span>
                    <span className="text-amber-400">+{view.bonus.toFixed(2)} 🍪</span>
                  </div>
                  {view.bonusReason && (
                    <div className="text-amber-400/70 font-mono text-xs pl-2">
                      ↳ {view.bonusReason}
                    </div>
                  )}
                </>
              )}
              <div className="flex justify-between font-mono text-sm">
                <span className="text-gray-400">final paid:</span>
                <span className="text-green-400 font-bold">
                  {(view.finalAmount || view.amount).toFixed(2)} 🍪
                </span>
              </div>
              <div className="flex justify-between font-mono text-sm">
                <span className="text-gray-400">balance:</span>
                <span className="text-gray-300">
                  {view.balBefore.toFixed(2)} → {view.balAfter?.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between font-mono text-sm">
                <span className="text-gray-400">approved by:</span>
                <span className="text-purple-400">{view.admin?.username || '-'}</span>
              </div>
              <div className="flex justify-between font-mono text-sm">
                <span className="text-gray-400">when:</span>
                <span className="text-gray-500">
                  {view.approvedAt ? fmt(view.approvedAt) : '-'}
                </span>
              </div>
            </div>

            {view.proofUrl && (
              <div className="mb-4">
                <div className="text-gray-400 font-mono text-xs mb-2">proof:</div>
                <img src={view.proofUrl} alt="proof" className="w-full rounded-xl" />
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => {
                  refund(view.id)
                  setView(null)
                }}
                className="flex-1 py-2 bg-red-600 hover:bg-red-500 rounded-xl font-mono text-sm text-white"
              >
                Refund
              </button>
              <button
                onClick={() => setView(null)}
                className="flex-1 py-2 bg-zinc-700 hover:bg-zinc-600 rounded-xl font-mono text-sm text-white"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
