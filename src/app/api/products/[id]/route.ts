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
          orderBy: { id: "asc" },
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
        // 삭제/교체된 미디어 키가 남지 않도록 항상 최신 값을 내려줍니다.
        "Cache-Control": "no-store",
      },
    })
  } catch (error) {
    console.error("상품 조회 중 오류 발생:", error)
    return NextResponse.json({ error: "상품 조회 중 오류가 발생했습니다." }, { status: 500 })
  }
}
