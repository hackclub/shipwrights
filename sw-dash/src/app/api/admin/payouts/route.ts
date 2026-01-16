import { NextResponse } from 'next/server'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { api } from '@/lib/api'
import { PERMS } from '@/lib/perms'
import { prisma } from '@/lib/db'
import { parseId } from '@/lib/utils'
import { push } from '@/lib/push-server'
import { msgs } from '@/lib/notifs'

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
})

export const GET = api(PERMS.payouts_view)(async () => {
  const reqs = await prisma.payoutReq.findMany({
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    include: {
      user: {
        select: { id: true, username: true, avatar: true, slackId: true, cookieBalance: true },
      },
      admin: { select: { id: true, username: true, avatar: true } },
    },
  })

  return NextResponse.json(reqs)
})

export const POST = api(PERMS.certs_view)(async ({ user, req }) => {
  const { amount } = await req.json()
  if (!amount || amount < 10)
    return NextResponse.json({ error: 'min 10 cookies bruh' }, { status: 400 })

  const userData = await prisma.user.findUnique({
    where: { id: user.id },
    select: { cookieBalance: true },
  })

  if (!userData || userData.cookieBalance < amount) {
    return NextResponse.json({ error: 'not enough cookies lmao' }, { status: 400 })
  }

  const pending = await prisma.payoutReq.findFirst({
    where: { userId: user.id, status: 'pending' },
  })

  if (pending) return NextResponse.json({ error: 'already got one pending homie' }, { status: 400 })

  const payout = await prisma.payoutReq.create({
    data: {
      userId: user.id,
      amount,
      balBefore: userData.cookieBalance,
    },
  })

  return NextResponse.json(payout)
})

export const PATCH = api(PERMS.payouts_edit)(async ({ user, req }) => {
  const { id, proofUrl, bonus, bonusReason } = await req.json()
  const payoutId = parseId(String(id), 'payout')

  if (payoutId === null) return NextResponse.json({ error: 'bad id' }, { status: 400 })

  const payout = await prisma.payoutReq.findUnique({
    where: { id: payoutId as number },
    include: { user: true },
  })

  if (!payout) return NextResponse.json({ error: 'not found' }, { status: 404 })
  if (payout.status !== 'pending')
    return NextResponse.json({ error: 'already done' }, { status: 400 })

  const bonusAmt = bonus || 0
  const final = payout.amount + bonusAmt

  const updated = await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: payout.userId },
      data: { cookieBalance: { decrement: payout.amount } },
    })

    return tx.payoutReq.update({
      where: { id: payoutId as number },
      data: {
        status: 'approved',
        adminId: user.id,
        approvedAt: new Date(),
        balAfter: payout.user.cookieBalance - payout.amount,
        proofUrl,
        bonus: bonusAmt,
        bonusReason: bonusReason || null,
        finalAmount: final,
      },
    })
  })

  try {
    const hasSubs = await prisma.pushSub.count({ where: { userId: payout.userId } })
    if (hasSubs > 0) {
      await push(payout.userId, msgs.payout.approved(final))
    }
  } catch {}

  return NextResponse.json(updated)
})

export const PUT = api(PERMS.payouts_edit)(async ({ req }) => {
  const { filename, contentType } = await req.json()
  if (!filename || !contentType)
    return NextResponse.json({ error: 'missing shit' }, { status: 400 })

  const clean = filename.replace(/[^a-zA-Z0-9.-]/g, '_')
  const key = `payouts-proof/${Date.now()}-${clean}`

  const cmd = new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME!,
    Key: key,
    ContentType: contentType,
  })

  const uploadUrl = await getSignedUrl(s3, cmd, { expiresIn: 3600 })
  const publicUrl = `${process.env.R2_PUBLIC_URL}/${key}`

  return NextResponse.json({ uploadUrl, publicUrl })
})

export const DELETE = api(PERMS.payouts_edit)(async ({ req }) => {
  const { id } = await req.json()
  const payoutId = parseId(String(id), 'payout')

  if (payoutId === null) return NextResponse.json({ error: 'bad id' }, { status: 400 })

  const payout = await prisma.payoutReq.findUnique({ where: { id: payoutId } })
  if (!payout) return NextResponse.json({ error: 'not found' }, { status: 404 })

  if (payout.status === 'approved') {
    await prisma.$transaction([
      prisma.user.update({
        where: { id: payout.userId },
        data: { cookieBalance: { increment: payout.amount } },
      }),
      prisma.payoutReq.delete({ where: { id: payoutId } }),
    ])
  } else {
    await prisma.payoutReq.delete({ where: { id: payoutId } })
  }

  return NextResponse.json({ ok: true })
})
