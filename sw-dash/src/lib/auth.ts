import { prisma } from './db'
import { randomBytes } from 'crypto'
import type { NextRequest } from 'next/server'
import { SESSION_TTL } from './utils'
import { getRedis } from './redis'

const lastSeenCache = new Map<number, number>()
const LASTSEEN_THROTTLE = 30000

function checkSeen(userId: number): boolean {
  const last = lastSeenCache.get(userId)
  const now = Date.now()
  if (!last || now - last > LASTSEEN_THROTTLE) {
    lastSeenCache.set(userId, now)
    return true
  }
  return false
}

export async function createSession(userId: number, ua?: string, ip?: string) {
  const token = randomBytes(32).toString('hex')
  const expires = new Date(Date.now() + SESSION_TTL)

  await prisma.session.create({
    data: {
      token,
      userId,
      device: ua?.slice(0, 200) || null,
      ip: ip || null,
      expiresAt: expires,
    },
  })

  await prisma.user.update({
    where: { id: userId },
    data: {
      sessionToken: token,
      sessionExpires: expires,
    },
  })

  return token
}

export async function getSession(token: string) {
  if (!token) return null

  const redis = getRedis()

  if (redis) {
    try {
      const cached = await redis.get(`session:${token}`)
      if (cached) {
        const user = typeof cached === 'string' ? JSON.parse(cached) : cached
        if (user && user.isActive) {
          if (checkSeen(user.id)) {
            prisma.user
              .update({
                where: { id: user.id },
                data: { lastSeen: new Date() },
              })
              .catch(() => {})
          }
          return user
        }
      }
    } catch {}
  }

  const sesh = await prisma.session.findUnique({
    where: { token },
    include: { user: true },
  })

  if (!sesh || sesh.expiresAt <= new Date() || !sesh.user.isActive) {
    return null
  }

  if (redis) {
    try {
      const ttl = Math.floor((sesh.expiresAt.getTime() - Date.now()) / 1000)
      if (ttl > 0) {
        await redis.set(`session:${token}`, JSON.stringify(sesh.user), { ex: Math.min(ttl, 300) })
      }
    } catch {}
  }

  if (checkSeen(sesh.user.id)) {
    prisma.user
      .update({
        where: { id: sesh.user.id },
        data: { lastSeen: new Date() },
      })
      .catch(() => {})
  }

  const timeLeft = sesh.expiresAt.getTime() - Date.now()
  if (timeLeft < SESSION_TTL / 2) {
    const newExpiry = new Date(Date.now() + SESSION_TTL)
    prisma.session
      .update({
        where: { token },
        data: { expiresAt: newExpiry },
      })
      .catch(() => {})

    if (redis) {
      try {
        const newTtl = Math.floor((newExpiry.getTime() - Date.now()) / 1000)
        if (newTtl > 0) {
          await redis.set(`session:${token}`, JSON.stringify(sesh.user), {
            ex: Math.min(newTtl, 300),
          })
        }
      } catch {}
    }
  }

  return sesh.user
}

export async function kill(token: string) {
  const redis = getRedis()
  if (redis) {
    try {
      await redis.del(`session:${token}`)
    } catch {}
  }

  const sesh = await prisma.session.findUnique({ where: { token }, select: { userId: true } })
  await prisma.session.deleteMany({ where: { token } })
  if (sesh) {
    await prisma.user.update({
      where: { id: sesh.userId },
      data: { sessionToken: null, sessionExpires: null },
    })
  }
}

export async function nuke(userId: number) {
  const sessions = await prisma.session.findMany({ where: { userId }, select: { token: true } })

  const redis = getRedis()
  if (redis && sessions.length > 0) {
    try {
      const keys = sessions.map((s) => `session:${s.token}`)
      await redis.del(...keys)
    } catch {}
  }

  await prisma.session.deleteMany({ where: { userId } })
  await prisma.user.update({
    where: { id: userId },
    data: { sessionToken: null, sessionExpires: null },
  })
}

export async function cleanExpired() {
  await prisma.session.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  })
  await prisma.user.updateMany({
    where: { sessionExpires: { lt: new Date() } },
    data: { sessionToken: null, sessionExpires: null },
  })
}

export async function needAuth(request: NextRequest) {
  const sessionToken = request.cookies.get('session_token')?.value
  const user = await getSession(sessionToken || '')

  if (!user) {
    return { user: null, error: { error: 'who tf are you?', status: 401 } }
  }

  return { user, error: null }
}
