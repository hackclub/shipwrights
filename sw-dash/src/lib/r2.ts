import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
})

export async function upload(
  folder: string,
  filename: string,
  data: Buffer,
  type: string
): Promise<string> {
  const key = `${folder}/${Date.now()}-${filename}`

  await s3.send(
    new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: key,
      Body: data,
      ContentType: type,
    })
  )

  return `${process.env.R2_PUBLIC_URL}/${key}`
}

export async function grab(url: string): Promise<{ data: Buffer; type: string } | null> {
  try {
    const res = await fetch(url)
    if (!res.ok) return null

    const type = res.headers.get('content-type') || 'application/octet-stream'
    const data = Buffer.from(await res.arrayBuffer())

    return { data, type }
  } catch {
    return null
  }
}
