// =============================================================================
// 상품 상세 API - GET /api/products/[id]
// - 상품 ID로 단일 상품을 조회하고, 없으면 404를 반환합니다.
// =============================================================================

import { type NextRequest, NextResponse } from "next/server"
import prismaClient from "@/lib/prismaClient"

// DB와 가까운 리전을 우선 사용해서 상세 조회 첫 응답 시간을 줄입니다.
export const preferredRegion = "syd1"

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
          },
        },
      },
    })

    if (!product) {
      return NextResponse.json({ error: "상품을 찾을 수 없습니다." }, { status: 404 })
    }

    return NextResponse.json(product, {
      headers: {
        // 상세 데이터도 CDN 캐시를 사용해 첫 진입 체감을 개선합니다.
        "Cache-Control": "public, max-age=0, s-maxage=120, stale-while-revalidate=600",
        "CDN-Cache-Control": "public, s-maxage=120, stale-while-revalidate=600",
        "Vercel-CDN-Cache-Control": "public, s-maxage=180",
      },
    })
  } catch (error) {
    console.error("상품 조회 중 오류 발생:", error)
    return NextResponse.json({ error: "상품 조회 중 오류가 발생했습니다." }, { status: 500 })
  }
}
