// =============================================================================
// 문의 첨부파일 업로드용 Presigned URL - POST /api/user/inquiries/upload-url
// 로그인 사용자 전용. S3 경로: ecommerce/inquiries/{userId}/{uuid}.{ext}
// =============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { randomUUID } from 'crypto'
import { getSession } from '@/lib/ironSessionControl'

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
})

const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
]
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime']

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.id || !session.isLoggedIn) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })
    }

    const body = await request.json()
    const fileType = body?.fileType as string | undefined
    if (!fileType) {
      return NextResponse.json(
        { error: 'fileType is required' },
        { status: 400 },
      )
    }

    const allowed = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES]
    if (!allowed.includes(fileType)) {
      return NextResponse.json(
        {
          error: `지원하지 않는 파일 형식입니다. 이미지(jpeg,png,gif,webp) 또는 동영상(mp4,webm,mov)만 가능합니다.`,
        },
        { status: 400 },
      )
    }

    const ext = fileType.split('/')[1]?.replace('quicktime', 'mov') || 'bin'
    const bucketPath = `ecommerce/inquiries/${session.id}/`
    const key = `${bucketPath}${randomUUID()}.${ext}`

    const command = new PutObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: key,
      ContentType: fileType,
    })

    const uploadUrl = await getSignedUrl(s3Client, command, {
      expiresIn: 3600,
    })

    return NextResponse.json({ uploadUrl, key })
  } catch (error) {
    console.error('Error generating inquiry upload URL:', error)
    return NextResponse.json(
      { error: 'Presigned URL 발급에 실패했습니다' },
      { status: 500 },
    )
  }
}
