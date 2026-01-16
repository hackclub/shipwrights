'use client'

import { useState } from 'react'
import { can, PERMS } from '@/lib/perms'
import { Cert, Note, User } from './useAssignment'

interface Props {
  id: string
  cert: Cert | null
  setCert: React.Dispatch<React.SetStateAction<Cert | null>>
  user: User | null
  notes: Note[]
  setNotes: React.Dispatch<React.SetStateAction<Note[]>>
  users: User[]
  setUsers: React.Dispatch<React.SetStateAction<User[]>>
  subbed: boolean
  setSubbed: React.Dispatch<React.SetStateAction<boolean>>
  setError: React.Dispatch<React.SetStateAction<string>>
}

export function useAssignmentActions({
  id,
  cert,
  setCert,
  user,
  notes,
  setNotes,
  users,
  setUsers,
  subbed,
  setSubbed,
  setError,
}: Props) {
  const [updating, setUpdating] = useState(false)
  const [show, setShow] = useState(false)
  const [pick, setPick] = useState('')
  const [moving, setMoving] = useState(false)
  const [msg, setMsg] = useState('')
  const [adding, setAdding] = useState(false)
  const [notify, setNotify] = useState(false)
  const [unsubbing, setUnsubbing] = useState(false)
  const [showPick, setShowPick] = useState(false)
  const [search, setSearch] = useState('')
  const [picks, setPicks] = useState<User[]>([])
  const [editing, setEditing] = useState(false)
  const [sel, setSel] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  const types = () => {
    if (!cert?.description) return []
    if (cert.description.startsWith('Type: ')) {
      return [cert.description.replace('Type: ', '').trim()]
    }
    if (cert.description.startsWith('Types: ')) {
      return cert.description
        .replace('Types: ', '')
        .trim()
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s.length > 0)
    }
    return []
  }

  const canEdit = () => {
    const isOwner = cert?.assigneeId === user?.id
    const hasEdit = can(user?.role || '', PERMS.assign_edit)
    const hasOver = can(user?.role || '', PERMS.assign_override)
    return (isOwner && hasEdit) || hasOver
  }

  const canUpdate = () => canEdit()

  const startEdit = () => {
    setEditing(true)
    setSel(types())
  }
  const cancel = () => {
    setEditing(false)
    setSel([])
  }
  const flip = (t: string) =>
    setSel((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]))

  const save = async () => {
    if (sel.length === 0) {
      setError('select at least one type dipshit')
      return
    }
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/assignments/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: sel.length === 1 ? `Type: ${sel[0]}` : `Types: ${sel.join(', ')}`,
          repoUrl: cert?.repoUrl || '',
        }),
      })
      const data = await res.json()
      if (res.ok) {
        setCert((prev) =>
          prev
            ? {
                ...prev,
                description: sel.length === 1 ? `Type: ${sel[0]}` : `Types: ${sel.join(', ')}`,
              }
            : null
        )
        setEditing(false)
        setSel([])
      } else {
        setError(data.error || 'types update fucked up')
      }
    } catch {
      setError('network is being a bitch')
    } finally {
      setSaving(false)
    }
  }

  const update = async (newStatus: string) => {
    setUpdating(true)
    try {
      const res = await fetch(`/api/admin/assignments/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      const data = await res.json()
      if (res.ok) {
        setCert((prev) => (prev ? { ...prev, status: newStatus } : null))
      } else {
        setError(data.error || 'status update broke')
      }
    } catch {
      setError('network broke')
    } finally {
      setUpdating(false)
    }
  }

  const loadU = async () => {
    try {
      const res = await fetch('/api/admin/users/mentions')
      const data = await res.json()
      if (res.ok) setUsers(data.users || [])
    } catch (e) {
      console.error('load users failed:', e)
    }
  }

  const reassign = async () => {
    if (!pick) return
    setMoving(true)
    try {
      const res = await fetch(`/api/admin/assignments/${id}/reassign`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newAssigneeId: pick }),
      })
      const data = await res.json()
      if (res.ok) {
        setCert(data.assignment)
        setShow(false)
        setPick('')
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('cert reassigned!', {
            body: data.message || 'done',
            icon: '/favicon.ico',
          })
        }
      } else {
        setError(data.error || 'reassign shit the bed')
      }
    } catch {
      setError('network died')
    } finally {
      setMoving(false)
    }
  }

  const add = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!msg.trim()) return
    setAdding(true)
    try {
      const res = await fetch(`/api/admin/assignments/${id}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg.trim(), notifyAssigned: notify }),
      })
      const data = await res.json()
      if (res.ok) {
        setNotes((prev) => [...prev, data.note])
        setMsg('')
      } else {
        setError(data.error || 'note add fucked up')
      }
    } catch {
      setError('network is being a bitch')
    } finally {
      setAdding(false)
    }
  }

  const del = async (noteId: string) => {
    try {
      const res = await fetch(`/api/admin/assignments/${id}/notes`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ noteId }),
      })
      if (res.ok) {
        setNotes((prev) => prev.filter((n) => n.id !== noteId))
      } else {
        const data = await res.json()
        setError(data.error || 'delete fucked up')
      }
    } catch {
      setError('network is being a bitch')
    }
  }

  const unsub = async () => {
    setUnsubbing(true)
    try {
      const res = await fetch(`/api/admin/assignments/${id}/unsubscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      if (res.ok) {
        setSubbed(false)
      } else {
        const data = await res.json()
        setError(data.error || 'unsubscribe fucked up')
      }
    } catch {
      setError('network is being a bitch')
    } finally {
      setUnsubbing(false)
    }
  }

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setMsg(value)
    const atIndex = value.lastIndexOf('@')
    if (atIndex !== -1) {
      const term = value.slice(atIndex + 1)
      if (term.length >= 0 && !term.includes(' ')) {
        setSearch(term)
        setShowPick(true)
        const filtered = users.filter(
          (u) => u.username.toLowerCase().includes(term.toLowerCase()) && u.isActive
        )
        setPicks(filtered.slice(0, 5))
      } else {
        setShowPick(false)
      }
    } else {
      setShowPick(false)
    }
  }

  const pickMention = (username: string) => {
    const atIndex = msg.lastIndexOf('@')
    const before = msg.slice(0, atIndex)
    const after = msg.slice(atIndex + search.length + 1)
    setMsg(`${before}@${username}${after}`)
    setShowPick(false)
    setSearch('')
  }

  const fmt = (message: string) => {
    const regex = /@(\w+)/g
    const parts: React.ReactNode[] = []
    let lastIndex = 0
    let match
    while ((match = regex.exec(message)) !== null) {
      if (match.index > lastIndex) parts.push(message.slice(lastIndex, match.index))
      parts.push(
        <span
          key={match.index}
          className="bg-amber-900/50 text-amber-200 px-1 rounded font-mono text-sm border border-amber-700/50"
        >
          {' '}
          @{match[1]}{' '}
        </span>
      )
      lastIndex = match.index + match[0].length
    }
    if (lastIndex < message.length) parts.push(message.slice(lastIndex))
    return parts.length > 0 ? parts : message
  }

  return {
    updating,
    show,
    setShow,
    pick,
    setPick,
    moving,
    msg,
    setMsg,
    adding,
    notify,
    setNotify,
    unsubbing,
    showPick,
    picks,
    editing,
    sel,
    saving,
    search,
    types,
    canEdit,
    canUpdate,
    startEdit,
    cancel,
    flip,
    save,
    update,
    loadU,
    reassign,
    add,
    del,
    unsub,
    onChange,
    pickMention,
    fmt,
  }
}
