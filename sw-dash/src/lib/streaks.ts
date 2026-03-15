import { prisma } from '@/lib/db'

function getESTDate(date: Date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  }).formatToParts(date)

  const get = (type: string) => parseInt(parts.find((p) => p.type === type)?.value || '0')
  return { y: get('year'), m: get('month') - 1, d: get('day') }
}

export function computeStreak(streak: number, lastReviewDate: Date | null): number {
  if (!lastReviewDate || streak === 0) return 0

  const { y, m, d } = getESTDate(new Date())
  const todayNorm = new Date(Date.UTC(y, m, d))
  const yesterdayNorm = new Date(todayNorm)
  yesterdayNorm.setDate(yesterdayNorm.getDate() - 1)

  const lastNorm = new Date(
    Date.UTC(
      lastReviewDate.getUTCFullYear(),
      lastReviewDate.getUTCMonth(),
      lastReviewDate.getUTCDate()
    )
  )

  if (lastNorm.getTime() >= yesterdayNorm.getTime()) {
    return streak
  }

  return 0
}

export async function updateStreakOnReview(userId: number) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { streak: true, lastReviewDate: true },
  })

  if (!user) return

  const { y, m, d } = getESTDate(new Date())
  const todayNorm = new Date(Date.UTC(y, m, d))
  const yesterdayNorm = new Date(todayNorm)
  yesterdayNorm.setDate(yesterdayNorm.getDate() - 1)

  let lastNorm: Date | null = null
  if (user.lastReviewDate) {
    const ld = user.lastReviewDate
    lastNorm = new Date(Date.UTC(ld.getUTCFullYear(), ld.getUTCMonth(), ld.getUTCDate()))
  }

  if (lastNorm && lastNorm.getTime() === todayNorm.getTime()) {
    return
  }

  let newStreak: number

  if (!lastNorm || lastNorm.getTime() < yesterdayNorm.getTime()) {
    newStreak = 1
  } else {
    newStreak = user.streak + 1
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      streak: newStreak,
      lastReviewDate: todayNorm,
    },
  })
}

export async function getStreakInfo(slackId: string) {
  const user = await prisma.user.findUnique({
    where: { slackId },
    select: { streak: true, lastReviewDate: true, slackId: true },
  })

  if (!user) return null

  const liveStreak = computeStreak(user.streak, user.lastReviewDate)

  if (liveStreak === 0 && user.streak > 0) {
    await prisma.user.update({
      where: { slackId },
      data: { streak: 0 },
    })
  }

  return {
    slack_id: user.slackId,
    is_streak_active: liveStreak > 0,
    streak_number: liveStreak,
  }
}
