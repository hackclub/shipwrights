import { getRedis } from './redis'

export async function cache<T>(key: string, ttl: number, fn: () => Promise<T>): Promise<T> {
  const redis = getRedis()

  if (redis) {
    try {
      const cached = await redis.get(key)
      if (cached !== null && cached !== undefined) {
        if (typeof cached === 'string') {
          return JSON.parse(cached) as T
        }
        return cached as T
      }
    } catch {}
  }

  const result = await fn()

  if (redis) {
    try {
      await redis.set(key, JSON.stringify(result), { ex: ttl })
    } catch {}
  }

  return result
}

export async function bust(pattern: string) {
  const redis = getRedis()
  if (!redis) return

  try {
    const keys = await redis.keys(pattern)
    if (keys.length > 0) {
      await redis.del(...keys)
    }
  } catch {}
}

export function genKey(route: string, params: Record<string, string | null>): string {
  const sorted = Object.keys(params).sort()
  const parts = sorted.map((k) => `${k}:${params[k] || 'null'}`)
  return `cache:${route}:${parts.join(':')}`
}
