// =============================================================================
// 관리자 상품 이미지/동영상 메타 저장 API - POST /api/admin/products/[id]/images
// body: { original, thumbnail, mediaType } S3 key를 받아 Image 레코드를 생성합니다.
// =============================================================================

import { NextResponse } from 'next/server'
import prismaClient from '@/lib/prismaClient'
import { requireAdminSession } from '@/lib/requireAdminSession'
import { isVideoMediaPath } from '@/lib/media'

type ImageMediaType = 'image' | 'video'

// mediaType이 비어 있으면 key 확장자로 이미지/동영상을 자동 판별합니다.
function resolveMediaType(
  mediaTypeFromBody: unknown,
  original: string,
  thumbnail: string,
): ImageMediaType {
  if (typeof mediaTypeFromBody === 'string') {
    const normalized = mediaTypeFromBody.trim().toLowerCase()
    if (normalized === 'image' || normalized === 'video') {
      return normalized
    }
  }
  return isVideoMediaPath(original) || isVideoMediaPath(thumbnail) ? 'video' : 'image'
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminSession(request)
  if ('error' in auth) return auth.error

  try {
    const productId = Number.parseInt((await params).id, 10)
    const { original, thumbnail, mediaType: mediaTypeFromBody } = await request.json()

    // 잘못된 입력을 먼저 차단해서 DB 품질을 유지합니다.
    if (Number.isNaN(productId)) {
      return NextResponse.json({ error: '유효하지 않은 상품 ID입니다.' }, { status: 400 })
    }
    if (typeof original !== 'string' || typeof thumbnail !== 'string' || !original || !thumbnail) {
      return NextResponse.json({ error: 'original/thumbnail 값이 필요합니다.' }, { status: 400 })
    }

    const mediaType = resolveMediaType(mediaTypeFromBody, original, thumbnail)

    // 같은 상품에 같은 key 조합이 있으면 새 레코드를 만들지 않습니다.
    const existing = await prismaClient.image.findFirst({
      where: {
        productId,
        original,
        thumbnail,
      },
      orderBy: { id: 'asc' },
    })

    if (existing) {
      // 기존 레코드의 mediaType이 다르면 현재 값으로 바로 보정합니다.
      if (existing.mediaType !== mediaType) {
        const updated = await prismaClient.image.update({
          where: { id: existing.id },
          data: { mediaType },
        })

        return NextResponse.json(
          {
            ...updated,
            created: false,
            message: '기존 미디어의 mediaType을 최신 값으로 보정했습니다.',
          },
          { status: 200 },
        )
      }

      return NextResponse.json(
        {
          ...existing,
          created: false,
          message: '이미 등록된 미디어라서 DB 레코드를 추가하지 않았습니다.',
        },
        { status: 200 },
      )
    }

    const image = await prismaClient.image.create({
      data: {
        original,
        thumbnail,
        mediaType,
        productId,
      },
    })

    return NextResponse.json({ ...image, created: true }, { status: 201 })
  } catch (error) {
    console.error('이미지 메타 저장 실패:', error)
    return NextResponse.json({ error: '이미지 저장에 실패했습니다.' }, { status: 500 })
  }
}
