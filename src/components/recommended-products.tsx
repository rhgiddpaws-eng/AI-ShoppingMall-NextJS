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
 * - react: useState, useEffect
 * - @/components/product-card: ProductCard
 * - fetch: /api/products/recommended (내부 API)
 */

import { useState, useEffect } from "react"
import ProductCard from "@/components/product-card"
import { safeParseJson } from "@/lib/utils"
import { LoadingSpinner } from "@/components/ui/loading-spinner"

interface Product {
  id: string | number
  name: string
  price: number
  imageSrc: string
  category: string
}

interface RecommendedProductsProps {
  currentProductId: string
}

export function RecommendedProducts({ currentProductId }: RecommendedProductsProps) {
  const [recommendedProducts, setRecommendedProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchRecommendedProducts = async () => {
      setIsLoading(true)
      setError(null)
      
      try {
        const response = await fetch(`/api/products/recommended?exclude=${currentProductId}`)
        
        if (!response.ok) {
          const errorData = await safeParseJson<{ error?: string }>(response)
          throw new Error(errorData?.error || "추천 상품을 불러오는데 실패했습니다")
        }
        
        const data = await safeParseJson<Product[]>(response)
        if (data) setRecommendedProducts(data)
      } catch (error) {
        console.error("추천 상품 로딩 오류:", error)
        setError(error instanceof Error ? error.message : "추천 상품을 불러오는데 실패했습니다")
      } finally {
        setIsLoading(false)
      }
    }

    fetchRecommendedProducts()
  }, [currentProductId])

  if (isLoading) {
    return (
      <div className="py-8">
        {/* 추천 섹션 로딩은 공통 스피너로 통일합니다. */}
        <LoadingSpinner size={24} label="추천 상품을 불러오는 중" />
      </div>
    )
  }

  if (error) {
    return <div className="text-center text-red-500 py-4">{error}</div>
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
            category={product.category}
          />
        ))}
      </div>
    </div>
  )
}

