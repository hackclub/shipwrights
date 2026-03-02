export const ago = (date: string | Date | null, short = false) => {
  if (!date || date === '-') return '-'
  const d = typeof date === 'string' ? new Date(date) : date
  const diff = Math.floor((Date.now() - d.getTime()) / 1000)
  if (diff < 60) return short ? 'now' : 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m${short ? '' : ' ago'}`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h${short ? '' : ' ago'}`
  if (short) return `${Math.floor(diff / 86400)}d`
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`
  return `${Math.floor(diff / 604800)}w ago`
}

export const fmtDuration = (secs: number) => {
  const hrs = Math.floor(secs / 3600)
  const mins = Math.floor((secs % 3600) / 60)
  return `${hrs}h ${mins}m`
}

export const fmtDate = (date: string | Date) => {
  if (!date || date === '-') return '-'
  return new Date(date).toLocaleDateString()
}
