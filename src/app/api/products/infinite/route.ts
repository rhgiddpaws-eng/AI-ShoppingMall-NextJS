// =============================================================================
// 상품 무한 스크롤 API - GET /api/products/infinite
// 쿼리: category, page, pageSize, sort, order, term
// - count 쿼리 없이 pageSize+1 조회로 hasMore를 계산합니다.
// =============================================================================

import { NextRequest, NextResponse } from "next/server"

import prismaClient from "@/lib/prismaClient"

// DB와 가까운 리전을 우선 사용해서 네트워크 왕복 시간을 줄입니다.
export const preferredRegion = "syd1"

const ALLOWED_SORT_KEYS = ["id", "name", "price", "createdAt", "updatedAt"] as const
const ALLOWED_CATEGORY_VALUES = ["MEN", "WOMEN", "ACCESSORIES", "SHOES", "SALE", "NEW"] as const

type ProductCategoryValue = (typeof ALLOWED_CATEGORY_VALUES)[number]

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)

  const categoryRaw = searchParams.get("category")?.toUpperCase() ?? null
  const category =
    categoryRaw != null && ALLOWED_CATEGORY_VALUES.includes(categoryRaw as ProductCategoryValue)
      ? (categoryRaw as ProductCategoryValue)
      : null

  const page = Math.max(parseInt(searchParams.get("page") || "1", 10), 1)
  const pageSize = Math.min(Math.max(parseInt(searchParams.get("pageSize") || "12", 10), 1), 48)
  const sortRaw = searchParams.get("sort") || "createdAt"
  const orderRaw = searchParams.get("order") || "desc"
  const term = (searchParams.get("term") || "").trim()

  const sort = ALLOWED_SORT_KEYS.includes(sortRaw as (typeof ALLOWED_SORT_KEYS)[number])
    ? sortRaw
    : "createdAt"
  const order = orderRaw === "asc" || orderRaw === "desc" ? orderRaw : "desc"

  // slug가 new인 경우는 카테고리 필터 없이 최신 전체를 보여줍니다.
  const isNewCategory = category === "NEW"

  const where = {
    status: "PUBLISHED" as const,
    ...(category != null && !isNewCategory && { category }),
    ...(term.length > 0 && {
      name: {
        contains: term,
        mode: "insensitive" as const,
      },
    }),
  }

  try {
    const rows = await prismaClient.product.findMany({
      where,
      skip: (page - 1) * pageSize,
      // 다음 페이지 존재 여부를 계산하려고 1개를 더 조회합니다.
      take: pageSize + 1,
      select: {
        id: true,
        name: true,
        price: true,
        category: true,
        images: {
          take: 1,
          orderBy: { id: "asc" },
          select: {
            id: true,
            original: true,
            thumbnail: true,
          },
        },
      },
      orderBy: {
        [sort]: order,
      },
    })

    const hasMore = rows.length > pageSize
    const products = hasMore ? rows.slice(0, pageSize) : rows

    return NextResponse.json(
      {
        products,
        hasMore,
        page,
        pageSize,
      },
      {
        headers: {
          "Cache-Control": "public, max-age=0, s-maxage=60, stale-while-revalidate=300",
          "CDN-Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
          "Vercel-CDN-Cache-Control": "public, s-maxage=90",
        },
      },
    )
  } catch (error) {
    console.error("Failed to fetch products:", error)
    return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 })
  }
}
