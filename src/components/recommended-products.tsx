"use client"

/**
 * RecommendedProducts — 상품 상세 페이지 하단 "추천 상품" 섹션
 *
 * [모양]
 * - 제목: "추천 상품" (text-2xl font-bold mb-6)
 * - 그리드: 1열 / 2열(sm) / 4열(md), gap-6
 * - 로딩: "추천 상품을 불러오는 중..." 텍스트
 * - 에러: 빨간 텍스트로 에러 메시지
 * - 데이터 없음: null 반환(아무것도 안 그림)
 *
 * [기능]
 * - currentProductId 제외하고 GET /api/products/recommended?exclude=[id] 호출
 * - 응답 배열을 ProductCard 리스트로 렌더, id/name/price/imageSrc/category 전달
 * - exclude로 현재 상품이 추천 목록에 안 나오도록 함
 *
 * [문법]
 * - Product 인터페이스: id(string|number), name, price, imageSrc, category
 * - key=product.id, id는 product.id.toString()
 *
 * [라이브러리 연계]
 * - @tanstack/react-query: useQuery
 * - @/components/product-card: ProductCard
 * - fetch: /api/products/recommended (내부 API)
 */

import { useQuery } from "@tanstack/react-query"
import ProductCard from "@/components/product-card"
import { safeParseJson } from "@/lib/utils"
import { LoadingSpinner } from "@/components/ui/loading-spinner"

interface Product {
  id: string | number
  name: string
  price: number
  imageSrc: string
  videoSrc?: string
  category: string
}

interface RecommendedProductsProps {
  currentProductId: string
}

// 추천 목록은 1분 동안 fresh로 취급해 같은 상세 재진입에서 즉시 보여줍니다.
const RECOMMENDED_STALE_TIME_MS = 60_000
// 추천 캐시는 20분 유지해 상세 간 이동 반복 시 재요청을 줄입니다.
const RECOMMENDED_GC_TIME_MS = 20 * 60_000

async function fetchRecommendedProducts(currentProductId: string): Promise<Product[]> {
  const response = await fetch(`/api/products/recommended?exclude=${encodeURIComponent(currentProductId)}`)

  if (!response.ok) {
    const errorData = await safeParseJson<{ error?: string }>(response)
    throw new Error(errorData?.error || "추천 상품을 불러오는데 실패했습니다")
  }

  const data = await safeParseJson<Product[]>(response)
  return Array.isArray(data) ? data : []
}

export function RecommendedProducts({ currentProductId }: RecommendedProductsProps) {
  const {
    data: recommendedProducts = [],
    isPending,
    isError,
    error,
  } = useQuery({
    queryKey: ["products", "recommended", currentProductId],
    queryFn: () => fetchRecommendedProducts(currentProductId),
    // 상세를 다시 열 때 스피너 대신 캐시를 바로 보여주기 위한 설정입니다.
    staleTime: RECOMMENDED_STALE_TIME_MS,
    gcTime: RECOMMENDED_GC_TIME_MS,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 1,
    enabled: currentProductId.length > 0,
  })

  if (isPending) {
    return (
      <div className="py-8">
        {/* 추천 섹션 로딩은 공통 스피너로 통일합니다. */}
        <LoadingSpinner size={24} label="추천 상품을 불러오는 중" />
      </div>
    )
  }

  if (isError) {
    const message =
      error instanceof Error ? error.message : "추천 상품을 불러오는데 실패했습니다"
    return <div className="py-4 text-center text-red-500">{message}</div>
  }

  if (recommendedProducts.length === 0) {
    return null // 추천 상품이 없으면 아무것도 렌더링하지 않습니다.
  }

  return (
    <div className="mt-12">
      <h2 className="text-2xl font-bold mb-6">추천 상품</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
        {recommendedProducts.map((product) => (
          <ProductCard
            key={product.id}
            id={product.id.toString()}
            name={product.name}
            price={product.price}
            imageSrc={product.imageSrc}
            videoSrc={product.videoSrc}
            category={product.category}
          />
        ))}
      </div>
    </div>
  )
}
