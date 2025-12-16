import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

function getS3Client() {
  const region = process.env.AWS_REGION
  const bucket = process.env.AWS_S3_INVOICE_BUCKET

  if (!region || !bucket) {
    return null
  }

  return new S3Client({
    region,
    credentials:
      process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
        ? {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
          }
        : undefined,
  })
}

export function isInvoiceS3Enabled() {
  return Boolean(process.env.AWS_REGION && process.env.AWS_S3_INVOICE_BUCKET)
}

export async function uploadInvoicePdfToS3(params: { key: string; body: Buffer }): Promise<void> {
  const bucket = process.env.AWS_S3_INVOICE_BUCKET
  const client = getS3Client()
  if (!bucket || !client) {
    throw new Error('Invoice S3 is not configured')
  }

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: params.key,
      Body: params.body,
      ContentType: 'application/pdf',
    })
  )
}

export async function getInvoiceS3SignedUrl(params: { key: string; expiresInSeconds?: number }) {
  const bucket = process.env.AWS_S3_INVOICE_BUCKET
  const client = getS3Client()
  if (!bucket || !client) {
    return null
  }

  return getSignedUrl(
    client,
    new GetObjectCommand({
      Bucket: bucket,
      Key: params.key,
    }),
    { expiresIn: params.expiresInSeconds ?? 60 * 60 }
  )
}
