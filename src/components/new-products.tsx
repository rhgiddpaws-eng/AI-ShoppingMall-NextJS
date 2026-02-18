'use client'

/**
 * NewProducts: 최신 상품 목록(최대 8개)
 */

import { useEffect, useState } from 'react'

import ProductCard from '@/components/product-card'
import { ProductCardSkeleton } from '@/components/product-card-skeleton'
import { ProductWithImages } from '@/app/api/products/route'
import { getCdnUrl } from '@/lib/cdn'
import { pickCardMediaKey } from '@/lib/media'
import { safeParseJson } from '@/lib/utils'

// 응답이 너무 빠를 때 스켈레톤이 깜빡이는 것을 방지합니다.
const MIN_SKELETON_MS = 350

export function NewProducts() {
  const [products, setProducts] = useState<ProductWithImages[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const fetchProducts = async () => {
      const startedAt = Date.now()
      try {
        const response = await fetch('/api/products?limit=8')
        const data = await safeParseJson<ProductWithImages[]>(response)
        if (Array.isArray(data) && !cancelled) {
          setProducts(data)
        } else if (!response.ok) {
          console.error('상품을 불러오는데 실패했습니다:', response.status)
        }
      } catch (error) {
        console.error('상품을 불러오는데 실패했습니다:', error)
      } finally {
        const elapsed = Date.now() - startedAt
        if (elapsed < MIN_SKELETON_MS) {
          await new Promise(resolve => setTimeout(resolve, MIN_SKELETON_MS - elapsed))
        }
        if (!cancelled) setIsLoading(false)
      }
    }

    void fetchProducts()
    return () => {
      cancelled = true
    }
  }, [])

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:gap-6 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <ProductCardSkeleton key={`new-skeleton-${index}`} />
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:gap-6 lg:grid-cols-4">
      {(products ?? []).map(product => (
        <ProductCard
          key={product.id}
          id={product.id.toString()}
          name={product.name}
          price={product.price}
          // 원본이 동영상이면 카드에서 동영상을 보여주고, 아니면 썸네일을 사용합니다.
          imageSrc={getCdnUrl(pickCardMediaKey(product.images?.[0]))}
          isNew={true}
        />
      ))}
    </div>
  )
}
