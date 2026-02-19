// =============================================================================
// 추천 상품 API - GET /api/products/recommended?exclude={id}
// - 실시간 OpenAI 호출 없이 DB 벡터 기반 추천 + 카테고리 fallback으로 동작합니다.
// =============================================================================

import { NextResponse } from "next/server"

import prismaClient from "@/lib/prismaClient"
import { getCdnUrl } from "@/lib/cdn"
import { pickCardMediaKey } from "@/lib/media"

// DB와 가까운 리전을 우선 사용해서 추천 쿼리 응답 시간을 줄입니다.
export const preferredRegion = "syd1"
// 추천 카드의 대표 미디어가 즉시 반영되도록 정적 캐시를 끕니다.
export const dynamic = "force-dynamic"
// 라우트 재검증 캐시를 비활성화합니다.
export const revalidate = 0
// 추천 목록도 도메인 캐시 차이 없이 즉시 갱신되도록 강한 no-store 헤더를 사용합니다.
const PRODUCT_RECOMMENDED_RESPONSE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate",
  "CDN-Cache-Control": "no-store",
  "Vercel-CDN-Cache-Control": "no-store",
  Pragma: "no-cache",
  Expires: "0",
} as const

type SimilarRow = {
  id: number
}

type ProductWithImage = {
  id: number
  name: string
  price: number
  category: string | null
  images: Array<{
    id: number
    original: string
    thumbnail: string
    mediaType: "image" | "video"
  }>
}

function toRecommendedItem(product: ProductWithImage) {
  return {
    id: product.id,
    name: product.name,
    price: product.price,
    category: product.category ?? "기타",
    // 원본이 동영상이면 카드에서도 동영상을 보여주고, 아니면 썸네일을 우선 사용합니다.
    imageSrc: getCdnUrl(pickCardMediaKey(product.images[0])),
  }
}

async function findFallbackProducts(
  excludeId: number,
  categoryValue: string | null,
  limit = 4,
  excludedIds: number[] = [],
) {
  // 이미 뽑힌 추천 상품과 현재 상품은 fallback에서 중복되지 않게 제외합니다.
  const baseExcludedIds = [excludeId, ...excludedIds]
  const wherePrimary: Record<string, unknown> = {
    status: "PUBLISHED",
    id: { notIn: baseExcludedIds },
  }
  if (categoryValue) {
    // category enum과 문자열 타입 충돌을 피하기 위해 런타임 값만 주입합니다.
    wherePrimary.category = categoryValue
  }

  const primary = await prismaClient.product.findMany({
    where: wherePrimary as any,
    select: {
      id: true,
      name: true,
      price: true,
      category: true,
      images: {
        take: 1,
        // 동영상이 있으면 추천 카드에서도 동영상이 먼저 보이도록 정렬합니다.
        orderBy: [{ mediaType: "desc" }, { id: "asc" }],
        select: {
          id: true,
          original: true,
          thumbnail: true,
          mediaType: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  })

  if (primary.length >= limit) return primary

  const remain = limit - primary.length
  const existingIds = primary.map(product => product.id)
  const secondary = await prismaClient.product.findMany({
    where: {
      status: "PUBLISHED",
      id: { notIn: [...baseExcludedIds, ...existingIds] },
    },
    select: {
      id: true,
      name: true,
      price: true,
      category: true,
      images: {
        take: 1,
        // 동영상이 있으면 추천 카드에서도 동영상이 먼저 보이도록 정렬합니다.
        orderBy: [{ mediaType: "desc" }, { id: "asc" }],
        select: {
          id: true,
          original: true,
          thumbnail: true,
          mediaType: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: remain,
  })

  return [...primary, ...secondary]
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const excludeIdRaw = searchParams.get("exclude")

  if (!excludeIdRaw) {
    return NextResponse.json({ error: "상품 ID가 필요합니다." }, { status: 400 })
  }

  const excludeId = Number(excludeIdRaw)
  if (!Number.isInteger(excludeId) || excludeId <= 0) {
    return NextResponse.json({ error: "유효하지 않은 상품 ID입니다." }, { status: 400 })
  }

  const currentProduct = await prismaClient.product.findFirst({
    where: {
      id: excludeId,
      status: "PUBLISHED",
    },
    select: {
      id: true,
      category: true,
    },
  })

  if (!currentProduct) {
    return NextResponse.json({ error: "상품을 찾을 수 없습니다." }, { status: 404 })
  }

  const currentCategory = currentProduct.category

  try {
    // 현재 상품 벡터를 기준으로 유사 상품 ID를 먼저 가져옵니다.
    const similarRows = await prismaClient.$queryRaw<SimilarRow[]>`
      WITH target AS (
        SELECT "vector"
        FROM "Product"
        WHERE "id" = ${excludeId}
          AND "status" = 'PUBLISHED'
          AND "vector" IS NOT NULL
      )
      SELECT p."id"
      FROM "Product" p
      CROSS JOIN target t
      WHERE p."id" <> ${excludeId}
        AND p."status" = 'PUBLISHED'
        AND p."vector" IS NOT NULL
      ORDER BY p."vector" <=> t."vector" ASC
      LIMIT 4
    `

    if (similarRows.length > 0) {
      const orderedIds = similarRows.map(row => row.id)
      const withImages = await prismaClient.product.findMany({
        where: {
          id: { in: orderedIds },
          status: "PUBLISHED",
          // 여성 상세에서 남성 추천이 섞이지 않도록, 현재 상품 카테고리를 우선 유지합니다.
          ...(currentCategory != null && { category: currentCategory }),
        },
        select: {
          id: true,
          name: true,
          price: true,
          category: true,
          images: {
            take: 1,
            // 동영상이 있으면 추천 카드에서도 동영상이 먼저 보이도록 정렬합니다.
            orderBy: [{ mediaType: "desc" }, { id: "asc" }],
            select: {
              id: true,
              original: true,
              thumbnail: true,
              mediaType: true,
            },
          },
        },
      })

      // 벡터 유사도 순서를 유지하기 위해 ID 기준으로 다시 정렬합니다.
      const productMap = new Map(withImages.map(product => [product.id, product]))
      const orderedProducts = orderedIds.flatMap(id => {
        const product = productMap.get(id)
        return product ? [product] : []
      })

      // 벡터 결과가 부족하면 같은 카테고리 fallback으로 남은 칸을 채웁니다.
      if (orderedProducts.length > 0) {
        let mergedProducts = orderedProducts
        if (orderedProducts.length < 4) {
          const fillProducts = await findFallbackProducts(
            excludeId,
            currentCategory,
            4 - orderedProducts.length,
            orderedProducts.map(product => product.id),
          )
          mergedProducts = [...orderedProducts, ...fillProducts]
        }

        return NextResponse.json(mergedProducts.slice(0, 4).map(toRecommendedItem), {
          headers: {
            // 추천 API 캐시를 강하게 끄고 매번 최신 추천 목록을 반환합니다.
            ...PRODUCT_RECOMMENDED_RESPONSE_HEADERS,
          },
        })
      }
    }

    const fallbackProducts = await findFallbackProducts(excludeId, currentCategory, 4)
    return NextResponse.json(fallbackProducts.map(toRecommendedItem), {
      headers: {
        // fallback 응답도 동일하게 no-store로 강제합니다.
        ...PRODUCT_RECOMMENDED_RESPONSE_HEADERS,
      },
    })
  } catch (error) {
    console.error("추천 상품 조회 오류:", error)

    // 메인 로직에 오류가 있어도 화면은 끊기지 않도록 fallback을 우선 반환합니다.
    try {
      const safeFallback = await findFallbackProducts(excludeId, currentCategory, 4)
      return NextResponse.json(safeFallback.map(toRecommendedItem), {
        headers: {
          // 오류 복구 응답도 캐시를 남기지 않아 즉시 회복 결과를 반영합니다.
          ...PRODUCT_RECOMMENDED_RESPONSE_HEADERS,
        },
      })
    } catch (fallbackError) {
      console.error("추천 상품 fallback 조회 오류:", fallbackError)
      return NextResponse.json([], {
        headers: {
          // 빈 결과도 no-store로 고정해 오류 회복 시 즉시 다시 조회되게 합니다.
          ...PRODUCT_RECOMMENDED_RESPONSE_HEADERS,
        },
      })
    }
  }
}
