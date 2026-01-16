import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { headers } from 'next/headers'
import { syslog } from '@/lib/syslog'

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
  const userAgent = request.headers.get('user-agent') || 'unknown'

  try {
    const headersList = await headers()
    const apiKey = headersList.get('x-api-key')

    if (!apiKey || apiKey !== process.env.API_KEY) {
      await syslog(
        'internal_yoink_denied',
        403,
        null,
        'wrong api key attempt',
        { ip, userAgent },
        { severity: 'warn', metadata: { attemptedKey: apiKey?.substring(0, 8) } }
      )
      return NextResponse.json({ error: 'nah' }, { status: 403 })
    }

    const { slackId } = await request.json()

    if (!slackId) {
      return NextResponse.json({ error: 'need slackId bro' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { slackId },
    })

    if (!user) {
      await syslog(
        'internal_yoink_notfound',
        404,
        null,
        `tried to yoink ${slackId} but user doesnt exist`,
        { ip, userAgent },
        { metadata: { slackId } }
      )
      return NextResponse.json({
        success: false,
        notFound: true,
      })
    }

    await prisma.$transaction([
      prisma.yubikey.deleteMany({
        where: { userId: user.id },
      }),
      prisma.user.update({
        where: { id: user.id },
        data: {
          sessionToken: null,
          sessionExpires: null,
          isActive: false,
        },
      }),
    ])

    await syslog(
      'internal_yoink_success',
      200,
      null,
      `user ${user.username} (${slackId}) yoinked via internal api`,
      { ip, userAgent },
      {
        targetId: user.id,
        targetType: 'user',
        metadata: {
          slackId,
          username: user.username,
          userId: user.id,
          apiKeyUsed: apiKey.substring(0, 8),
        },
      }
    )

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        slackId: user.slackId,
        username: user.username,
      },
    })
  } catch (error) {
    console.error('internal yoink failed:', error)
    return NextResponse.json({ error: 'shit broke' }, { status: 500 })
  }
}
