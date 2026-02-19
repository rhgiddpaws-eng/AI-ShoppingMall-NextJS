// =============================================================================
// 상품 상세 API - GET /api/products/[id]
// - 상품 ID로 단일 상품을 조회하고, 없으면 404를 반환합니다.
// =============================================================================

import { type NextRequest, NextResponse } from "next/server"
import prismaClient from "@/lib/prismaClient"

// DB와 가까운 리전을 우선 사용해서 상세 조회 첫 응답 시간을 줄입니다.
export const preferredRegion = "syd1"
// 상세 미디어는 변경 직후 즉시 반영되어야 하므로 정적 캐시를 끕니다.
export const dynamic = "force-dynamic"
// 라우트 레벨 재검증 캐시도 비활성화합니다.
export const revalidate = 0
// 상세 응답은 항상 최신 미디어를 보장해야 하므로 CDN/브라우저 캐시를 모두 끕니다.
const PRODUCT_DETAIL_RESPONSE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate",
  "CDN-Cache-Control": "no-store",
  "Vercel-CDN-Cache-Control": "no-store",
  Pragma: "no-cache",
  Expires: "0",
} as const

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: idString } = await params
    const id = parseInt(idString, 10)

    if (Number.isNaN(id)) {
      return NextResponse.json({ error: "유효하지 않은 상품 ID입니다." }, { status: 400 })
    }

    const product = await prismaClient.product.findFirst({
      where: { id, status: "PUBLISHED" },
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        stock: true,
        discountRate: true,
        category: true,
        images: {
          // 상세의 기본 미디어도 동영상이 있으면 항상 먼저 오도록 정렬합니다.
          orderBy: [{ mediaType: "desc" }, { id: "asc" }],
          select: {
            id: true,
            original: true,
            thumbnail: true,
            // 상세 화면에서도 DB mediaType으로 이미지/동영상을 바로 구분합니다.
            mediaType: true,
          },
        },
      },
    })

    if (!product) {
      return NextResponse.json({ error: "상품을 찾을 수 없습니다." }, { status: 404 })
    }

    return NextResponse.json(product, {
      headers: {
        // 상세 캐시를 강하게 무효화해서 도메인별 오래된 응답 재사용을 막습니다.
        ...PRODUCT_DETAIL_RESPONSE_HEADERS,
      },
    })
  } catch (error) {
    console.error("상품 조회 중 오류 발생:", error)
    return NextResponse.json({ error: "상품 조회 중 오류가 발생했습니다." }, { status: 500 })
  }
}
