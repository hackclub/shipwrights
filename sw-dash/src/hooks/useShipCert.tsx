'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { showError } from '@/lib/client-errors'
import { can, PERMS } from '@/lib/perms'
import { useUser } from '@/lib/user-context'
import { ShipCert, UserData } from '@/types'

export function useShipCert(shipId: string) {
  const router = useRouter()
  const [cert, setCert] = useState<ShipCert | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(true)
  const [reason, setReason] = useState('')
  const [note, setNote] = useState('')
  const [uploading, setUploading] = useState(false)
  const [url, setUrl] = useState<string | null>(null)
  const { user, loading: authLoading } = useUser()
  const [show, setShow] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const [showPick, setShowPick] = useState(false)
  const [search, setSearch] = useState('')
  const [users, setUsers] = useState<UserData[]>([])
  const [picks, setPicks] = useState<UserData[]>([])
  const [fraudUrls, setFraudUrls] = useState<{ billy: string; joe: string } | null>(null)
  const [claimedBy, setClaimedBy] = useState<string | null>(null)
  const [claimAllowsEdit, setClaimAllowsEdit] = useState(false)
  const [isMyClaim, setIsMyClaim] = useState(false)
  const [claimed, setClaimed] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [bounty, setBounty] = useState('')
  const [bountySaved, setBountySaved] = useState(false)

  const canEdit = user?.role ? can(user.role, PERMS.certs_edit) : false
  const canOverride = user?.role ? can(user.role, PERMS.certs_override) : false
  const isViewOnly = !canEdit

  const loadU = async () => {
    try {
      const res = await fetch('/api/admin/users/mentions')
      const data = await res.json()
      if (res.ok) setUsers(data.users || [])
    } catch {}
  }

  const checkClaim = async () => {
    try {
      const res = await fetch(`/api/admin/ship_certifications/${shipId}/claim`)
      const data = await res.json()
      if (res.ok || res.status === 423) {
        setClaimedBy(data.claimedBy)
        setClaimAllowsEdit(data.canEdit)
        setIsMyClaim(data.claimedBy === user?.username)
      }
    } catch {}
  }

  const startReview = async () => {
    if (submitting) return

    setSubmitting(true)
    try {
      const res = await fetch(`/api/admin/ship_certifications/${shipId}/claim`, { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        setClaimedBy(data.claimedBy)
        setClaimAllowsEdit(data.canEdit)
        setIsMyClaim(true)
        setClaimed(true)
        setTimeout(() => setClaimed(false), 3000)
        setSubmitting(false)
      } else {
        setErr(data.error || 'someone already claimed this')
        setTimeout(() => setErr(null), 3000)
        setSubmitting(false)
      }
    } catch {
      setErr('claim shit broke')
      setTimeout(() => setErr(null), 3000)
      setSubmitting(false)
    }
  }

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/ship_certifications/${shipId}`)
      if (!res.ok) throw new Error('fetch fucked up')
      const data = await res.json()
      setCert(data)
    } catch {
    } finally {
      setLoading(false)
    }
  }, [shipId])

  useEffect(() => {
    load()
  }, [shipId, load])

  useEffect(() => {
    if (cert?.feedback && !reason) setReason(cert.feedback)
  }, [cert?.feedback, reason])

  useEffect(() => {
    if (cert?.customBounty !== undefined && !bounty) {
      setBounty(cert.customBounty?.toString() || '')
    }
  }, [cert?.customBounty, bounty])

  useEffect(() => {
    if (user && cert) checkClaim()
  }, [user, cert?.id])

  useEffect(() => {
    if (
      cert?.submitter?.slackId &&
      user &&
      (can(user.role, PERMS.billy_btn) || can(user.role, PERMS.joe_btn))
    ) {
      const fetchFraud = async () => {
        try {
          const res = await fetch(`/api/admin/fraud-urls?slackId=${cert.submitter.slackId}`)
          if (res.ok) setFraudUrls(await res.json())
        } catch {}
      }
      fetchFraud()
    }
  }, [cert?.submitter?.slackId, user?.role])

  const update = async (newVerdict: string) => {
    if (submitting) return

    try {
      if (!claimAllowsEdit && !canOverride) {
        setErr("it's already claimed!")
        setTimeout(() => setErr(null), 3000)
        return
      }
      const videoUrl = url || cert?.proofVideo
      if (!reason.trim()) {
        setErr('write feedback first dumbass')
        setTimeout(() => setErr(null), 3000)
        return
      }
      if (!videoUrl) {
        setErr('upload proof video dipshit')
        setTimeout(() => setErr(null), 3000)
        return
      }
      if (file && !url) {
        setErr('video still uploading chill')
        setTimeout(() => setErr(null), 3000)
        return
      }

      setSubmitting(true)
      const res = await fetch(`/api/admin/ship_certifications/${shipId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          verdict: newVerdict,
          reviewFeedback: reason,
          proofVideoUrl: videoUrl,
        }),
      })
      if (res.status === 403) {
        const e = await res.json()
        setErr(e.error || 'u cant do that')
        setTimeout(() => setErr(null), 3000)
        setSubmitting(false)
        return
      }
      if (!res.ok) throw new Error('update fucked up')
      router.push('/admin/ship_certifications?success=true')
    } catch {
      setSubmitting(false)
    }
  }

  const save = async () => {
    if (!note.trim()) return
    try {
      const res = await fetch(`/api/admin/ship_certifications/${shipId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note }),
      })
      if (!res.ok) throw new Error('shit broke')
      setNote('')
      await load()
    } catch {}
  }

  const del = async (noteId: string) => {
    if (!user?.role || !can(user.role, PERMS.certs_admin)) return
    try {
      const res = await fetch(`/api/admin/ship_certifications/${shipId}/notes/${noteId}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('delete shit the bed')
      await load()
    } catch {}
  }

  const onChange = async (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value
    setNote(value)
    const atIndex = value.lastIndexOf('@')
    if (atIndex !== -1) {
      if (users.length === 0) await loadU()
      const term = value.slice(atIndex + 1)
      if (term.length >= 0 && !term.includes(' ')) {
        setSearch(term)
        const filtered = users.filter(
          (u) =>
            u &&
            u.username &&
            u.username.toLowerCase().includes(term.toLowerCase()) &&
            (u.role ? can(u.role, PERMS.certs_edit) : false)
        )
        setPicks(filtered.slice(0, 5))
        setShowPick(filtered.length > 0)
      } else setShowPick(false)
    } else setShowPick(false)
  }

  const pick = (username: string) => {
    const atIndex = note.lastIndexOf('@')
    const before = note.slice(0, atIndex)
    const after = note.slice(atIndex + search.length + 1)
    setNote(`${before}@${username}${after}`)
    setShowPick(false)
    setSearch('')
  }

  const fmt = (message: string): React.ReactNode => {
    const regex = /@(\w+)/g
    const parts: React.ReactNode[] = []
    let lastIndex = 0
    let match
    while ((match = regex.exec(message)) !== null) {
      if (match.index > lastIndex) parts.push(message.slice(lastIndex, match.index))
      parts.push(
        <span
          key={match.index}
          className="bg-blue-800 text-blue-200 px-1 rounded font-mono text-sm"
        >
          @{match[1]}
        </span>
      )
      lastIndex = match.index + match[0].length
    }
    if (lastIndex < message.length) parts.push(message.slice(lastIndex))
    return parts.length > 0 ? parts : message
  }

  const upload = async (f: File) => {
    if (!f) return
    setUploading(true)
    setFile(f)
    try {
      const presignRes = await fetch('/api/admin/upload-video/presign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: f.name, contentType: f.type }),
      })
      if (!presignRes.ok) {
        const e = await presignRes.json().catch(() => ({}))
        throw new Error(e.error || 'failed to get upload url')
      }
      const { uploadUrl, publicUrl } = await presignRes.json()
      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': f.type },
        body: f,
      })
      if (!uploadRes.ok) throw new Error('direct upload failed')
      setUrl(publicUrl)
    } catch (e) {
      showError('upload broke, try again', e as Error)
      setFile(null)
    } finally {
      setUploading(false)
    }
  }

  const updateType = async (t: string) => {
    setCert((prev) => (prev ? { ...prev, type: t } : prev))
    await fetch(`/api/admin/ship_certifications/${shipId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectType: t }),
    })
  }

  const updateBounty = (b: string) => {
    const val = b === '' ? null : parseFloat(b)
    if (b !== '' && (isNaN(val!) || val! < 0)) return
    setBounty(b)
  }

  const saveBounty = async () => {
    const val = bounty === '' ? null : parseFloat(bounty)
    if (bounty !== '' && (isNaN(val!) || val! < 0)) return
    setCert((prev) => (prev ? { ...prev, customBounty: val } : prev))
    await fetch(`/api/admin/ship_certifications/${shipId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customBounty: val }),
    })
    setBountySaved(true)
    setTimeout(() => setBountySaved(false), 2000)
  }

  return {
    cert,
    setCert,
    file,
    loading,
    reason,
    setReason,
    note,
    setNote,
    uploading,
    url,
    user,
    authLoading,
    show,
    setShow,
    err,
    dragging,
    setDragging,
    showPick,
    picks,
    fraudUrls,
    claimedBy,
    claimAllowsEdit,
    isMyClaim,
    claimed,
    canEdit,
    canOverride,
    isViewOnly,
    submitting,
    startReview,
    update,
    save,
    del,
    onChange,
    pick,
    fmt,
    upload,
    updateType,
    bounty,
    updateBounty,
    saveBounty,
    bountySaved,
  }
}
