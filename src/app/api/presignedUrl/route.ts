// =============================================================================
// S3 Presigned URL API - GET /api/presignedUrl
// 쿼리: fileType, bucketPath → 업로드용 Presigned URL 발급 (상품 이미지 등)
// =============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { randomUUID } from 'crypto'

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
})

export async function GET(request: NextRequest) {
  try {
    // URL에서 fileType 파라미터 가져오기
    const { searchParams } = new URL(request.url)
    const fileType = searchParams.get('fileType')
    // bucketPath는 S3 버킷 내에 파일이 저장될 폴더 경로 역할을 합니다.
    // 클라이언트가 bucketPath 쿼리파라미터를 넘기면 'ecommerce/넘겨받은경로/' 형태로 경로를 만들고,
    // 없으면 기본적으로 'ecommerce/common/'이라는 폴더에 저장되도록 합니다.
    // 예를 들어, bucketPath=products라면 'ecommerce/products/'로 파일이 업로드될 예정입니다.
    const bucketPath = searchParams.get('bucketPath')
      ? `ecommerce/${searchParams.get('bucketPath')}/`
      : 'ecommerce/common/'

    if (!fileType) {
      return NextResponse.json(
        { error: 'fileType is required' },
        { status: 400 },
      )
    }

    const ex = fileType.split('/')[1]
    const key = `${bucketPath}${randomUUID()}.${ex}`

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
    })
  } catch (error) {
    console.error('Error generating presigned URL:', error)
    return NextResponse.json(
      { error: 'Failed to generate presigned URL' },
      { status: 500 },
    )
  }
}
