'use client'

/**
 * NewProducts — 신상품 그리드 (최대 8개)
 *
 * [모양]
 * - 그리드: 2열(sm) / 3열(sm) / 4열(lg), gap-4 md:gap-6
 * - 캐러셀/페이지네이션 없음, 한 번에 전부 표시
 * - 각 항목은 ProductCard (isNew=true 고정)
 *
 * [기능]
 * - 마운트 시 GET /api/products?limit=8 fetch
 * - API 응답을 ProductWithImages[] 로 받아 ProductCard에 id, name, price, imageSrc, isNew 전달
 * - 이미지 URL: getCdnUrl(product.images[0]?.thumbnail || product.images[0]?.original) (.env NEXT_PUBLIC_AWS_BUCKET_CDN 사용)
 *
 * [문법]
 * - ProductWithImages: API route에서 re-export 하는 타입 사용
 * - key=product.id, id는 product.id.toString() 으로 문자열화
 *
 * [라이브러리 연계]
 * - react: useEffect, useState
 * - @/components/product-card: ProductCard
 * - @/app/api/products/route: ProductWithImages 타입
 * - fetch: /api/products (내부 API)
 */

import { useEffect, useState } from 'react'
import ProductCard from '@/components/product-card'
import { ProductWithImages } from '@/app/api/products/route'
import { getCdnUrl } from '@/lib/cdn'
import { safeParseJson } from '@/lib/utils'

export function NewProducts() {
  const [products, setProducts] = useState<ProductWithImages[]>([])

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await fetch('/api/products?limit=8')
        const data = await safeParseJson<ProductWithImages[]>(response)
        if (Array.isArray(data)) setProducts(data)
        else if (!response.ok) console.error('상품을 불러오는데 실패했습니다:', response.status)
      } catch (error) {
        console.error('상품을 불러오는데 실패했습니다:', error)
      }
    }

    fetchProducts()
  }, [])

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
      {(products ?? []).map(product => (
        <ProductCard
          key={product.id}
          id={product.id.toString()}
          name={product.name}
          price={product.price}
          // 신상품 목록 카드도 썸네일을 우선 사용해 네트워크 사용량을 줄입니다.
          imageSrc={getCdnUrl(product.images[0]?.thumbnail || product.images[0]?.original)}
          isNew={true}
        />
      ))}
    </div>
  )
}
