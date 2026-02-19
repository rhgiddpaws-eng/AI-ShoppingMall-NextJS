// =============================================================================
// 상품 목록 API - GET /api/products
// 쿼리: category, limit, sort, order, term
// - 목록 성능을 위해 카드에 필요한 필드만 선택해서 응답합니다.
// =============================================================================

import { NextRequest, NextResponse } from "next/server"

import prismaClient from "@/lib/prismaClient"

// DB와 가까운 리전을 우선 사용해서 첫 응답 시간을 줄입니다.
export const preferredRegion = "syd1"
// 상품 미디어 키가 바뀌면 즉시 반영되어야 하므로 정적 캐시를 비활성화합니다.
export const dynamic = "force-dynamic"
// Next.js의 라우트 재검증 캐시도 함께 끕니다.
export const revalidate = 0
// 목록 응답은 30초만 CDN 캐시하고 이후 백그라운드 재검증해서 체감 속도를 높입니다.
const PRODUCT_LIST_CACHE_CONTROL = "public, s-maxage=30, stale-while-revalidate=300"

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
  // 기본값을 영상 전용으로 두어 카테고리/메인 카드가 항상 동영상 상품을 우선 노출하게 합니다.
  const videoOnlyRaw = searchParams.get("videoOnly")
  const isVideoOnly =
    videoOnlyRaw == null ? true : videoOnlyRaw === "1" || videoOnlyRaw.toLowerCase() === "true"

  // slug가 new인 경우는 카테고리 필터 없이 최신 전체를 보여줍니다.
  const isNewCategory = category === "NEW"

  try {
    const products = await prismaClient.product.findMany({
      where: {
        status: "PUBLISHED" as const,
        ...(category != null && !isNewCategory && { category }),
        ...(isVideoOnly && {
          // 이미지 전용 상품을 제외하고, 동영상 미디어가 있는 상품만 목록에 포함합니다.
          images: { some: { mediaType: "video" as const } },
        }),
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
        // 목록은 짧은 캐시를 허용해 페이지 재이동 시 DB 왕복을 줄입니다.
        "Cache-Control": PRODUCT_LIST_CACHE_CONTROL,
      },
    })
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error))
    console.error("Failed to fetch products:", err.message, err.stack)
    return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 })
  }
}
