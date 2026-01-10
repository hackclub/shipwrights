import { NextResponse } from 'next/server'
import { getRedis } from '@/lib/redis'
import { api } from '@/lib/api'

type Crew = { id: number; username: string; avatar: string | null; role: string }

export const GET = api()(async () => {
  try {
    const redis = getRedis()
    if (!redis) return NextResponse.json({ crew: [] })

    const cutoff = Date.now() - 180000
    await redis.zremrangebyscore('crew:online', 0, cutoff)

    const ids = await redis.zrange('crew:online', 0, -1)
    if (ids.length === 0) return NextResponse.json({ crew: [] })

    const keys = ids.map(id => `crew:${id}`)
    const values = await redis.mget(...keys)

    const crew = values.filter((v): v is Crew => v !== null && typeof v === 'object')

    return NextResponse.json({ crew })
  } catch {
    return NextResponse.json({ error: 'broke' }, { status: 500 })
  }
})
