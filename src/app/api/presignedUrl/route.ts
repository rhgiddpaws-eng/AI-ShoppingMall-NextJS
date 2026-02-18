// =============================================================================
// S3 Presigned URL API - GET /api/presignedUrl
// 쿼리: fileType, bucketPath, fileName
// - fileName이 오면 같은 이름+포맷 조합에서 같은 key를 만들어 S3 덮어쓰기를 유도합니다.
// =============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { HeadObjectCommand, S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { createHash, randomUUID } from 'crypto'

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
})

// 관리자 상품 업로드에서 허용할 이미지/동영상 MIME 타입 목록입니다.
const ALLOWED_FILE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'video/mp4',
  'video/webm',
  'video/quicktime',
])

// bucketPath를 안전한 S3 prefix 형태로 정리합니다.
function normalizeBucketPath(rawBucketPath: string | null): string {
  if (!rawBucketPath) return 'ecommerce/common/'
  const trimmed = rawBucketPath.trim().replace(/^\/+|\/+$/g, '').replace(/\\/g, '/')
  return trimmed ? `ecommerce/${trimmed}/` : 'ecommerce/common/'
}

// MIME 타입 기준으로 확장자를 고정해서 key를 예측 가능하게 만듭니다.
function getExtFromFileType(fileType: string): string {
  const ext = fileType.split('/')[1] ?? 'bin'
  return ext === 'quicktime' ? 'mov' : ext
}

// 같은 이름+포맷이면 같은 파일명이 나오도록 deterministic 이름을 만듭니다.
function buildDeterministicFileName(fileName: string, fileType: string): string {
  const withoutExt = fileName.replace(/\.[^/.]+$/, '')
  const normalized = withoutExt.trim().toLowerCase()
  const safeBase =
    normalized.replace(/[^a-z0-9_-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 50) ||
    'file'
  const hash = createHash('sha1')
    .update(`${normalized}|${fileType}`)
    .digest('hex')
    .slice(0, 12)
  const ext = getExtFromFileType(fileType)
  return `${safeBase}-${hash}.${ext}`
}

// 같은 key가 이미 S3에 있으면 true를 반환합니다.
async function checkObjectExists(key: string): Promise<boolean> {
  try {
    await s3Client.send(
      new HeadObjectCommand({
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: key,
      }),
    )
    return true
  } catch (error) {
    const err = error as { name?: string; $metadata?: { httpStatusCode?: number } }
    if (err.name === 'NotFound' || err.$metadata?.httpStatusCode === 404) {
      return false
    }
    throw error
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const fileType = searchParams.get('fileType')
    const fileName = searchParams.get('fileName')
    const bucketPath = normalizeBucketPath(searchParams.get('bucketPath'))

    if (!fileType) {
      return NextResponse.json({ error: 'fileType is required' }, { status: 400 })
    }

    if (!ALLOWED_FILE_TYPES.has(fileType)) {
      return NextResponse.json({ error: '지원하지 않는 파일 타입입니다.' }, { status: 400 })
    }

    // fileName이 있으면 동일 조건에서 key를 고정해 S3 객체 수가 늘지 않게 합니다.
    const key =
      fileName && fileName.trim().length > 0
        ? `${bucketPath}${buildDeterministicFileName(fileName, fileType)}`
        : `${bucketPath}${randomUUID()}.${getExtFromFileType(fileType)}`

    // 업로드 전에 존재 여부를 알려서 DB 저장 여부를 분기할 수 있게 합니다.
    const alreadyExists = await checkObjectExists(key)

    const command = new PutObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: key,
      ContentType: fileType,
    })

    const uploadUrl = await getSignedUrl(s3Client, command, {
      expiresIn: 3600,
    })

    return NextResponse.json({
      uploadUrl,
      key,
      alreadyExists,
    })
  } catch (error) {
    console.error('Error generating presigned URL:', error)
    return NextResponse.json({ error: 'Failed to generate presigned URL' }, { status: 500 })
  }
}
