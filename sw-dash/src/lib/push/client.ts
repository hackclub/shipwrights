const KEY = process.env.NEXT_PUBLIC_VAPID_KEY!

function b64(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const b = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(b)
  const arr = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; ++i) arr[i] = raw.charCodeAt(i)
  return arr
}

export async function reg() {
  if (!('serviceWorker' in navigator)) throw new Error('browser doesnt support sw')
  if (!('PushManager' in window)) throw new Error('browser doesnt support push')
  const r = await navigator.serviceWorker.register('/sw.js')
  await r.update()
  return r
}

export async function ask(): Promise<NotificationPermission> {
  if (!('Notification' in window)) throw new Error('notifications not supported')
  return await Notification.requestPermission()
}

export async function get() {
  const r = await navigator.serviceWorker.getRegistration()
  if (!r) return null
  return await r.pushManager.getSubscription()
}

export async function sub() {
  const r = await reg()
  if (Notification.permission !== 'granted') throw new Error('permission denied lol')

  const existing = await r.pushManager.getSubscription()
  if (existing) {
    await fetch('/api/push/sub', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(existing),
    })
    return existing
  }

  const s = await r.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: b64(KEY) as unknown as BufferSource,
  })
  await fetch('/api/push/sub', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(s),
  })
  return s
}

export async function unsub() {
  const s = await get()
  if (!s) return
  await fetch('/api/push/unsub', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ endpoint: s.endpoint }),
  })
  await s.unsubscribe()
}

export async function check(): Promise<'granted' | 'denied' | 'default' | 'unsupported'> {
  if (!('Notification' in window)) return 'unsupported'
  if (!('serviceWorker' in navigator)) return 'unsupported'
  if (!('PushManager' in window)) return 'unsupported'
  return Notification.permission
}
