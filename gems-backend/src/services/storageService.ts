import fs from 'fs'
import path from 'path'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'

const UPLOADS_DIR = path.join(process.cwd(), 'uploads')

const getS3Client = () =>
  new S3Client({
    region: process.env['S3_REGION'] ?? 'us-east-1',
    endpoint: process.env['S3_ENDPOINT'],
    credentials: {
      accessKeyId: process.env['S3_ACCESS_KEY_ID']!,
      secretAccessKey: process.env['S3_SECRET_ACCESS_KEY']!,
    },
    forcePathStyle: !!process.env['S3_ENDPOINT'], // required for MinIO and S3-compatible stores
  })

export const uploadFile = async (
  buffer: Buffer,
  filename: string,
  mimetype: string
): Promise<string> => {
  const isS3 = process.env['STORAGE_TYPE'] === 's3'

  if (isS3) {
    const bucket = process.env['S3_BUCKET']!
    const key = `branding/${filename}`

    await getS3Client().send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: buffer,
        ContentType: mimetype,
      })
    )

    const endpoint = process.env['S3_ENDPOINT']
    if (endpoint) {
      return `${endpoint}/${bucket}/${key}`
    }
    return `https://${bucket}.s3.${process.env['S3_REGION'] ?? 'us-east-1'}.amazonaws.com/${key}`
  }

  // Local disk storage
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true })
  }

  const filePath = path.join(UPLOADS_DIR, filename)
  fs.writeFileSync(filePath, buffer)

  const baseUrl = process.env['BASE_URL'] ?? 'http://localhost:3000'
  return `${baseUrl}/uploads/${filename}`
}
