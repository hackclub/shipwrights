import { NextResponse } from 'next/server'
import { getRedis } from '@/lib/redis'
import { cache } from '@/lib/cache'
import { api } from '@/lib/api'

export const GET = api()(async () => {
  try {
    const data = await cache('cache:online', 30, async () => {
      const redis = getRedis()
      if (!redis) return { crew: [] }

      const cutoff = Date.now() - 180000
      
      await redis.zremrangebyscore('crew:online', 0, cutoff)
      
      const ids = await redis.zrange('crew:online', 0, -1)
      if (ids.length === 0) return { crew: [] }

      const keys = ids.map(id => `crew:${id}`)
      const values = await redis.mget(...keys)
      
      const crew = values
        .filter((v): v is string => typeof v === 'string')
        .map(v => {
          try {
            return JSON.parse(v)
          } catch {
            return null
          }
        })
        .filter((u): u is { id: number; username: string; avatar: string | null; role: string } => u !== null)

      return { crew }
    })

    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'broke' }, { status: 500 })
  }
})
