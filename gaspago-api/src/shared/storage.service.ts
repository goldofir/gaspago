import { S3Client, PutObjectCommand, DeleteObjectCommand, CreateBucketCommand, HeadBucketCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import sharp from 'sharp'
import { randomBytes } from 'crypto'
import { SystemConfigService } from './system-config.service'

// Image compression config — WebP for everything, quality balanced for web
const IMAGE_CONFIG = {
  webp: { quality: 82, effort: 4 },
  maxWidthPx: 1920,
  maxHeightPx: 1920,
  // thumbnails
  thumb: { width: 300, height: 300, quality: 75 },
}

function getClient() {
  const endpoint = SystemConfigService.getOrThrow('MINIO_ENDPOINT')
  const accessKeyId = SystemConfigService.getOrThrow('MINIO_ACCESS_KEY')
  const secretAccessKey = SystemConfigService.getOrThrow('MINIO_SECRET_KEY')

  return new S3Client({
    endpoint,
    region: 'us-east-1',   // MinIO ignores region but SDK requires it
    credentials: { accessKeyId, secretAccessKey },
    forcePathStyle: true,  // required for MinIO
  })
}

function publicUrl(bucket: string, key: string): string {
  const base = SystemConfigService.getOrThrow('MINIO_PUBLIC_URL')
  return `${base.replace(/\/$/, '')}/${key}`
}

// Ensure buckets exist on first use
const ensuredBuckets = new Set<string>()
async function ensureBucket(bucket: string) {
  if (ensuredBuckets.has(bucket)) return
  const client = getClient()
  try {
    await client.send(new HeadBucketCommand({ Bucket: bucket }))
  } catch {
    await client.send(new CreateBucketCommand({ Bucket: bucket }))
  }
  ensuredBuckets.add(bucket)
}

export interface UploadResult {
  key: string
  url: string
  thumbKey?: string
  thumbUrl?: string
  originalSizeBytes: number
  compressedSizeBytes: number
  format: string
}

// Upload image: compress with sharp → WebP → upload to MinIO → return URL
// Original buffer is discarded after upload (never persisted)
export async function uploadImage(
  buffer: Buffer,
  options: {
    folder: string         // e.g. 'products', 'distributors', 'avatars', 'kyc'
    filename?: string      // optional original name for extension reference
    isPrivate?: boolean    // if true → private bucket, signed URLs only
    withThumb?: boolean    // also generate a 300×300 thumbnail
  }
): Promise<UploadResult> {
  const bucket = options.isPrivate
    ? SystemConfigService.getOrThrow('MINIO_BUCKET_PRIVATE')
    : SystemConfigService.getOrThrow('MINIO_BUCKET_PUBLIC')

  await ensureBucket(bucket)

  const originalSizeBytes = buffer.length
  const id = randomBytes(12).toString('hex')
  const key = `${options.folder}/${id}.webp`

  // Compress: resize if too large, convert to WebP
  const compressed = await sharp(buffer)
    .resize(IMAGE_CONFIG.maxWidthPx, IMAGE_CONFIG.maxHeightPx, { fit: 'inside', withoutEnlargement: true })
    .webp(IMAGE_CONFIG.webp)
    .toBuffer()

  const client = getClient()

  await client.send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: compressed,
    ContentType: 'image/webp',
    CacheControl: options.isPrivate ? 'private' : 'public, max-age=31536000',
  }))

  const result: UploadResult = {
    key,
    url: options.isPrivate ? await getSignedUrl(client, new (require('@aws-sdk/client-s3').GetObjectCommand)({ Bucket: bucket, Key: key }), { expiresIn: 3600 }) : publicUrl(bucket, key),
    originalSizeBytes,
    compressedSizeBytes: compressed.length,
    format: 'webp',
  }

  // Optional thumbnail
  if (options.withThumb) {
    const thumbKey = `${options.folder}/${id}_thumb.webp`
    const thumb = await sharp(buffer)
      .resize(IMAGE_CONFIG.thumb.width, IMAGE_CONFIG.thumb.height, { fit: 'cover' })
      .webp({ quality: IMAGE_CONFIG.thumb.quality })
      .toBuffer()

    await client.send(new PutObjectCommand({
      Bucket: bucket,
      Key: thumbKey,
      Body: thumb,
      ContentType: 'image/webp',
      CacheControl: 'public, max-age=31536000',
    }))

    result.thumbKey = thumbKey
    result.thumbUrl = publicUrl(bucket, thumbKey)
  }

  // Original buffer goes out of scope here — no disk write, no persistence
  return result
}

// Delete an image by key
export async function deleteImage(key: string, isPrivate = false) {
  const bucket = isPrivate
    ? SystemConfigService.getOrThrow('MINIO_BUCKET_PRIVATE')
    : SystemConfigService.getOrThrow('MINIO_BUCKET_PUBLIC')

  await getClient().send(new DeleteObjectCommand({ Bucket: bucket, Key: key }))
}

// Replace an image: upload new → delete old key
export async function replaceImage(
  oldKey: string | null,
  buffer: Buffer,
  options: Parameters<typeof uploadImage>[1]
): Promise<UploadResult> {
  const result = await uploadImage(buffer, options)
  if (oldKey) {
    await deleteImage(oldKey, options.isPrivate).catch(() => { /* ignore if already gone */ })
  }
  return result
}

// Signed URL for private files (expires in 1h by default)
export async function getPrivateUrl(key: string, expiresIn = 3600): Promise<string> {
  const { GetObjectCommand } = await import('@aws-sdk/client-s3')
  const bucket = SystemConfigService.getOrThrow('MINIO_BUCKET_PRIVATE')
  return getSignedUrl(getClient(), new GetObjectCommand({ Bucket: bucket, Key: key }), { expiresIn })
}
