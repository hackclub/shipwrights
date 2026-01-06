import { NextResponse } from 'next/server'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { api } from '@/lib/api'
import { PERMS } from '@/lib/perms'

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
})

export const POST = api(PERMS.support_view)(async ({ req }) => {
  const { filename, contentType } = await req.json()
  if (!filename || !contentType) {
    return NextResponse.json({ error: 'missing data' }, { status: 400 })
  }

  const cleanName = filename.replace(/[^a-zA-Z0-9.-]/g, '_')
  const key = `tickets/${Date.now()}-${cleanName}`

  const cmd = new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME!,
    Key: key,
    ContentType: contentType,
  })

  const uploadUrl = await getSignedUrl(s3, cmd, { expiresIn: 3600 })
  const publicUrl = `${process.env.R2_PUBLIC_URL}/${key}`

  return NextResponse.json({ uploadUrl, publicUrl })
})
