'use client'

/**
 * NewProducts: 메인 최신 상품 섹션
 * - "2번 상품" 세트를 항상 앞쪽에 고정 노출합니다.
 */

import { useEffect, useState } from 'react'

import { ProductWithImages } from '@/app/api/products/route'
import ProductCard from '@/components/product-card'
import { ProductCardSkeleton } from '@/components/product-card-skeleton'
import { apiRoutes } from '@/lib/apiRoutes'
import { getCdnUrl } from '@/lib/cdn'
import { pickCardMediaKey } from '@/lib/media'
import { isProductInSet, mergePinnedFirst } from '@/lib/product-set'
import { safeParseJson } from '@/lib/utils'

// 스켈레톤이 너무 짧게 보이는 현상을 막기 위한 최소 노출 시간입니다.
const MIN_SKELETON_MS = 350
// 메인에서 우선 노출할 세트 번호입니다.
const PINNED_SET_NO = 2
// 최신 섹션 최대 카드 개수입니다.
const NEW_LIMIT = 8
// 고정 세트 후보를 안정적으로 찾기 위한 조회 개수입니다.
const PIN_SOURCE_LIMIT = 100

export function NewProducts() {
  const [products, setProducts] = useState<ProductWithImages[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    const fetchProducts = async () => {
      const startedAt = Date.now()
      try {
        // 최신 목록 + 고정 세트 후보를 함께 조회해 메인 노출 순서를 재구성합니다.
        const [latestResponse, pinSourceResponse] = await Promise.all([
          // 목록 API의 짧은 캐시를 활용해 반복 이동 시 체감 속도를 높입니다.
          fetch(`${apiRoutes.routes.products.path}?limit=${NEW_LIMIT}`),
          fetch(`${apiRoutes.routes.products.path}?limit=${PIN_SOURCE_LIMIT}&sort=id&order=asc`),
        ])

        const latestRaw = await safeParseJson<unknown>(latestResponse)
        const pinSourceRaw = await safeParseJson<unknown>(pinSourceResponse)

        const latestRows: ProductWithImages[] = Array.isArray(latestRaw) ? latestRaw : []
        const pinSourceRows: ProductWithImages[] = Array.isArray(pinSourceRaw)
          ? pinSourceRaw
          : []

        // 상품명에서 숫자 세트를 파싱해서 2번 세트만 정확히 추립니다.
        const pinnedRows = pinSourceRows.filter(product =>
          isProductInSet(product.name, PINNED_SET_NO),
        )

        const mergedRows = mergePinnedFirst(pinnedRows, latestRows, NEW_LIMIT)
        if (!cancelled) setProducts(mergedRows)
      } catch (error) {
        console.error('최신 상품 로딩 오류:', error)
        if (!cancelled) setProducts([])
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
        {Array.from({ length: NEW_LIMIT }).map((_, index) => (
          <ProductCardSkeleton key={`new-skeleton-${index}`} />
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:gap-6 lg:grid-cols-4">
      {products.map(product => (
        <ProductCard
          key={product.id}
          id={product.id.toString()}
          name={product.name}
          price={product.price}
          // 원본이 동영상이면 카드에서 동영상 프리뷰가 나오도록 원본 키를 우선 사용합니다.
          imageSrc={getCdnUrl(pickCardMediaKey(product.images?.[0]))}
          isNew={true}
        />
      ))}
    </div>
  )
}
