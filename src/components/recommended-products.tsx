"use client"

import { useState, useEffect } from "react"
import ProductCard from "@/components/product-card"

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
          const errorData = await response.json()
          throw new Error(errorData.error || "추천 상품을 불러오는데 실패했습니다")
        }
        
        const data = await response.json()
        setRecommendedProducts(data)
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
    return <div className="text-center py-8">추천 상품을 불러오는 중...</div>
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

