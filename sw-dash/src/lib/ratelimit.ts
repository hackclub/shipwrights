import { CLEANUP_INTERVAL } from './utils'

type RateLimitStore = Map<string, { count: number; resetAt: number }>

const stores: Map<string, RateLimitStore> = new Map()

export function rateLimit(namespace: string, max: number, windowMs: number) {
  if (!stores.has(namespace)) {
    stores.set(namespace, new Map())
  }

  const store = stores.get(namespace)!

  return (identifier: string): { success: boolean; remaining: number } => {
    const now = Date.now()
    const record = store.get(identifier)

    if (!record || now > record.resetAt) {
      store.set(identifier, {
        count: 1,
        resetAt: now + windowMs,
      })
      return { success: true, remaining: max - 1 }
    }

    if (record.count >= max) {
      return { success: false, remaining: 0 }
    }

    record.count++
    return { success: true, remaining: max - record.count }
  }
}

setInterval(() => {
  const now = Date.now()
  stores.forEach((store) => {
    store.forEach((record, key) => {
      if (now > record.resetAt) {
        store.delete(key)
      }
    })
  })
}, CLEANUP_INTERVAL)
