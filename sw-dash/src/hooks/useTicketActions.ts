'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Ticket, Msg, CurrentUser } from './useTicket'

interface UseTicketActionsProps {
  ticketId: string
  ticket: Ticket | null
  setTicket: React.Dispatch<React.SetStateAction<Ticket | null>>
  user: CurrentUser | null
  load: () => Promise<void>
}

export function useTicketActions({
  ticketId,
  ticket,
  setTicket,
  user,
  load,
}: UseTicketActionsProps) {
  const router = useRouter()
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)
  const [assigning, setAssigning] = useState(false)
  const [files, setFiles] = useState<File[]>([])
  const [note, setNote] = useState('')
  const [addingNote, setAddingNote] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)

  const sendReply = async () => {
    if ((!reply.trim() && files.length === 0) || sending) return

    const msgText = reply.trim()
    const msgFiles = files.slice()
    const tmpId = Date.now()

    const optimisticMsg: Msg = {
      id: tmpId,
      senderId: user?.slackId || 'temp',
      senderName: user?.username || 'You',
      senderAvatar: user?.avatar,
      message: msgText,
      files: msgFiles.map((f) => ({
        name: f.name,
        url: URL.createObjectURL(f),
        mimetype: f.type,
        size: f.size,
      })),
      isStaff: true,
      createdAt: new Date().toISOString(),
      pending: true,
    }

    setTicket((prev) =>
      prev
        ? {
            ...prev,
            messages: [...prev.messages, optimisticMsg],
          }
        : null
    )

    setReply('')
    setFiles([])
    setSending(true)

    try {
      const fileUrls: Array<{ name: string; url: string; mimetype: string; size: number }> = []
      const authCheck = await fetch('/api/admin/upload', { method: 'POST' })
      if (!authCheck.ok) {
        setTicket((prev) =>
          prev
            ? {
                ...prev,
                messages: prev.messages.filter((m) => m.id !== tmpId),
              }
            : null
        )
        setSending(false)
        return
      }

      const uploads = await Promise.allSettled(
        msgFiles.map(async (file) => {
          const presign = await fetch('/api/admin/tickets/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filename: file.name, contentType: file.type }),
          })

          if (!presign.ok) throw new Error('presign failed')
          const { uploadUrl, publicUrl } = await presign.json()

          const put = await fetch(uploadUrl, {
            method: 'PUT',
            headers: { 'Content-Type': file.type },
            body: file,
          })

          if (!put.ok) throw new Error('upload failed')
          return { name: file.name, url: publicUrl, mimetype: file.type, size: file.size }
        })
      )

      uploads.forEach((u) => {
        if (u.status === 'fulfilled') fileUrls.push(u.value)
      })

      const r = await fetch(`/api/admin/tickets/${ticketId}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: msgText,
          files: fileUrls.length > 0 ? fileUrls : undefined,
        }),
      })

      setTicket((prev) =>
        prev
          ? {
              ...prev,
              messages: prev.messages.filter((m) => m.id !== tmpId),
            }
          : null
      )

      if (r.ok) {
        await load()
      }
    } catch {
      setTicket((prev) =>
        prev
          ? {
              ...prev,
              messages: prev.messages.filter((m) => m.id !== tmpId),
            }
          : null
      )
    }

    setSending(false)
  }

  const addAssignee = async (staffId: number) => {
    setAssigning(true)
    try {
      const current = ticket?.assignees?.map((a) => a.id) || []
      if (current.includes(staffId)) {
        setAssigning(false)
        return
      }

      const r = await fetch(`/api/admin/tickets/${ticketId}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignees: [...current, staffId] }),
      })
      if (r.ok) {
        await load()
        setSearchQuery('')
        setShowDropdown(false)
      }
    } catch (e) {
      console.error('assign failed:', e)
    }
    setAssigning(false)
  }

  const removeAssignee = async (staffId: number) => {
    setAssigning(true)
    try {
      const current = ticket?.assignees?.map((a) => a.id) || []
      const r = await fetch(`/api/admin/tickets/${ticketId}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignees: current.filter((id) => id !== staffId) }),
      })
      if (r.ok) {
        await load()
      }
    } catch (e) {
      console.error('unassign failed:', e)
    }
    setAssigning(false)
  }

  const closeTicket = async () => {
    const r = await fetch(`/api/admin/tickets/${ticketId}/close`, { method: 'POST' })
    if (r.ok) {
      router.push('/admin/tickets')
    }
  }

  const addNote = async () => {
    if (!note.trim() || addingNote) return

    setAddingNote(true)
    try {
      const r = await fetch(`/api/admin/tickets/${ticketId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: note.trim() }),
      })

      if (r.ok) {
        setNote('')
        await load()
      }
    } catch (e) {
      console.error('add note failed:', e)
    }
    setAddingNote(false)
  }

  const filteredStaff =
    ticket?.staff?.filter(
      (s) =>
        s.username.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !ticket.assignees?.some((a) => a.id === s.id)
    ) || []

  return {
    reply,
    setReply,
    sending,
    files,
    setFiles,
    note,
    setNote,
    addingNote,
    assigning,
    searchQuery,
    setSearchQuery,
    showDropdown,
    setShowDropdown,
    filteredStaff,
    sendReply,
    addAssignee,
    removeAssignee,
    closeTicket,
    addNote,
  }
}
