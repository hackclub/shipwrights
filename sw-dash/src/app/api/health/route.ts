import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getRedis } from '@/lib/redis'

export async function GET() {
  const start = Date.now()
  const services: Record<string, { status: 'up' | 'down' | 'off'; ms?: number }> = {}
  let allGood = true

  const dbStart = Date.now()
  try {
    await prisma.$queryRaw`SELECT 1`
    services.db = { status: 'up', ms: Date.now() - dbStart }
  } catch {
    services.db = { status: 'down', ms: Date.now() - dbStart }
    allGood = false
  }

  const redis = getRedis()
  if (redis) {
    const redisStart = Date.now()
    try {
      await redis.ping()
      services.redis = { status: 'up', ms: Date.now() - redisStart }
    } catch {
      services.redis = { status: 'down', ms: Date.now() - redisStart }
      allGood = false
    }
  } else {
    services.redis = { status: 'off' }
  }

  return NextResponse.json(
    {
      status: allGood ? 'healthy' : 'fucked',
      services,
      responseMs: Date.now() - start,
      ts: new Date().toISOString(),
    },
    { status: allGood ? 200 : 503 }
  )
}
