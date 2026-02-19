// =============================================================================
// 상품 목록 API - GET /api/products
// 쿼리: category, limit, sort, order, term
// - 목록 성능을 위해 카드에 필요한 필드만 선택해서 응답합니다.
// =============================================================================

import { NextRequest, NextResponse } from "next/server"

import prismaClient from "@/lib/prismaClient"

// DB와 가까운 리전을 우선 사용해서 첫 응답 시간을 줄입니다.
export const preferredRegion = "syd1"
// 목록 재진입 속도를 높이기 위해 브라우저/엣지에 짧게 캐시하고, 뒤에서 최신화합니다.
const PRODUCT_LIST_RESPONSE_HEADERS = {
  "Cache-Control": "public, max-age=30, s-maxage=120, stale-while-revalidate=600",
  "CDN-Cache-Control": "public, s-maxage=120, stale-while-revalidate=600",
  "Vercel-CDN-Cache-Control": "public, s-maxage=120, stale-while-revalidate=600",
} as const

export type ProductImage = {
  id: number
  original: string
  thumbnail: string
  // 카드 렌더링에서 확장자 파싱 없이 미디어 타입을 바로 사용합니다.
  mediaType: "image" | "video"
}

export type ProductWithImages = {
  id: number
  name: string
  price: number
  discountRate: number
  category: string | null
  createdAt: Date
  images: ProductImage[]
}

export type ProductsResponseType = ProductWithImages[]

// orderBy에서 허용할 Product 필드만 제한해서 잘못된 입력을 막습니다.
const ALLOWED_SORT_KEYS = ["id", "name", "price", "createdAt", "updatedAt"] as const
// 허용 카테고리를 enum 값으로 제한해 잘못된 쿼리를 방지합니다.
const ALLOWED_CATEGORY_VALUES = ["MEN", "WOMEN", "ACCESSORIES", "SHOES", "SALE", "NEW"] as const

type ProductCategoryValue = (typeof ALLOWED_CATEGORY_VALUES)[number]

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)

  const categoryRaw = searchParams.get("category")?.toUpperCase() ?? null
  const category =
    categoryRaw != null && ALLOWED_CATEGORY_VALUES.includes(categoryRaw as ProductCategoryValue)
      ? (categoryRaw as ProductCategoryValue)
      : null

  const limitRaw = searchParams.get("limit") || "20"
  const sortRaw = searchParams.get("sort") || "createdAt"
  const orderRaw = searchParams.get("order") || "desc"
  const term = (searchParams.get("term") || "").trim()

  const sort = ALLOWED_SORT_KEYS.includes(sortRaw as (typeof ALLOWED_SORT_KEYS)[number])
    ? sortRaw
    : "createdAt"
  const order = orderRaw === "asc" || orderRaw === "desc" ? orderRaw : "desc"
  const parsedLimit = parseInt(limitRaw, 10)
  const take = Number.isNaN(parsedLimit) || parsedLimit < 1 ? 20 : Math.min(parsedLimit, 100)

  // slug가 new인 경우는 카테고리 필터 없이 최신 전체를 보여줍니다.
  const isNewCategory = category === "NEW"

  try {
    const products = await prismaClient.product.findMany({
      where: {
        status: "PUBLISHED" as const,
        ...(category != null && !isNewCategory && { category }),
        ...(term && {
          name: {
            contains: term,
            mode: "insensitive" as const,
          },
        }),
      },
      take,
      // 목록 카드에 필요한 최소 필드만 내려서 응답 직렬화 비용을 줄입니다.
      select: {
        id: true,
        name: true,
        price: true,
        discountRate: true,
        category: true,
        createdAt: true,
        images: {
          take: 1,
          // 동영상이 있으면 카드에서 항상 동영상이 먼저 보이도록 우선 정렬합니다.
          orderBy: [{ mediaType: "desc" }, { id: "asc" }],
          select: {
            id: true,
            original: true,
            thumbnail: true,
            mediaType: true,
          },
        },
      },
      orderBy: {
        [sort]: order,
      },
    })

    return NextResponse.json(products, {
      headers: {
        // 공개 상품 목록은 짧은 캐시로 재사용하고, 만료 뒤에는 백그라운드로 재검증합니다.
        ...PRODUCT_LIST_RESPONSE_HEADERS,
      },
    })
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error))
    console.error("Failed to fetch products:", err.message, err.stack)
    return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 })
  }
}
