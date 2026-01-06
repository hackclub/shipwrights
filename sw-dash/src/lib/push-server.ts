import webpush from 'web-push'
import { prisma } from './db'
import { syslog } from './syslog'

let vapidReady = false
function ensureVapid() {
  if (vapidReady) return
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT!,
    process.env.VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  )
  vapidReady = true
}

export async function save(userId: number, subscription: unknown) {
  const sub = subscription as { endpoint: string; keys: { p256dh: string; auth: string } }
  const keys = sub.keys

  await prisma.pushSub.upsert({
    where: { endpoint: sub.endpoint },
    create: {
      userId,
      endpoint: sub.endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
    },
    update: {
      p256dh: keys.p256dh,
      auth: keys.auth,
    },
  })
}

export async function del(endpoint: string) {
  await prisma.pushSub
    .delete({
      where: { endpoint },
    })
    .catch(() => {})
}

export async function push(
  userId: number,
  data: {
    title: string
    body: string
    url?: string
    icon?: string
    tag?: string
  }
) {
  ensureVapid()
  const subs = await prisma.pushSub.findMany({
    where: { userId },
  })

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, username: true, slackId: true, role: true },
  })

  const results = await Promise.allSettled(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth,
            },
          },
          JSON.stringify(data)
        )
      } catch (err: unknown) {
        if (
          (err as { statusCode?: number }).statusCode === 410 ||
          (err as { statusCode?: number }).statusCode === 404
        ) {
          await del(sub.endpoint)
          await syslog('push_expired', 410, user, 'push sub expired and deleted', undefined, {
            targetId: userId,
            targetType: 'user',
            metadata: { endpoint: sub.endpoint.substring(0, 50) },
          })
        }
        throw err
      }
    })
  )

  const successCount = results.filter((r) => r.status === 'fulfilled').length
  const failCount = results.filter((r) => r.status === 'rejected').length

  await syslog(
    'push_sent',
    200,
    user,
    `sent "${data.title}" to ${successCount}/${subs.length} devices`,
    undefined,
    {
      targetId: userId,
      targetType: 'user',
      metadata: {
        title: data.title,
        body: data.body,
        url: data.url,
        tag: data.tag,
        successCount,
        failCount,
        totalSubs: subs.length,
      },
    }
  )

  return results
}

export async function blast(
  userIds: number[],
  data: {
    title: string
    body: string
    url?: string
    icon?: string
    tag?: string
  }
) {
  const results = await Promise.allSettled(userIds.map((userId) => push(userId, data)))

  await syslog(
    'push_blast',
    200,
    null,
    `mass push "${data.title}" to ${userIds.length} users`,
    undefined,
    {
      metadata: {
        title: data.title,
        body: data.body,
        url: data.url,
        recipientCount: userIds.length,
        userIds,
      },
    }
  )

  return results
}
