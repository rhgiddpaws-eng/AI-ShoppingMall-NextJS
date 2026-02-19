'use client'

/**
 * FeaturedProducts: 메인 추천 상품 캐러셀
 * - "2번 상품" 세트를 항상 앞쪽에 고정 노출합니다.
 * - 나머지 칸은 최신 상품으로 채웁니다.
 */

import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

import ProductCard from '@/components/product-card'
import { ProductCardSkeleton } from '@/components/product-card-skeleton'
import { Button } from '@/components/ui/button'
import { apiRoutes } from '@/lib/apiRoutes'
import { getCdnUrl } from '@/lib/cdn'
import { pickCardMediaKey } from '@/lib/media'
import { isProductInSet, mergePinnedFirst } from '@/lib/product-set'
import { safeParseJson } from '@/lib/utils'

// 스켈레톤이 한 프레임만 보이고 사라지는 깜빡임을 막기 위한 최소 시간입니다.
const MIN_SKELETON_MS = 350
// 메인에서 고정 노출할 세트 번호입니다.
const PINNED_SET_NO = 2
// 메인 추천 섹션 최대 노출 개수입니다.
const FEATURED_LIMIT = 8
// 고정 세트 후보를 찾기 위해 넉넉히 조회합니다.
const PIN_SOURCE_LIMIT = 100

interface ProductData {
  id: number
  name: string
  description: string | null
  price: number
  stock: number
  discountRate: number
  category: string | null
  createdAt: string
  updatedAt: string
  images: {
    id: number
    original: string
    thumbnail: string
    // DB에서 내려준 mediaType으로 카드에서 이미지/동영상을 안정적으로 분기합니다.
    mediaType: "image" | "video"
  }[]
}

interface FormattedProduct {
  id: string
  name: string
  price: number
  imageSrc: string
  category: string
  isNew?: boolean
  isSale?: boolean
  salePrice?: number
}

/** API 상품 행을 카드 표시용 데이터로 변환합니다. */
function toFormattedProducts(products: ProductData[]): FormattedProduct[] {
  const oneWeekAgo = new Date()
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)

  return products.map(product => {
    const discountAmount = product.price * (product.discountRate / 100)
    const salePrice = product.price - discountAmount

    return {
      id: product.id.toString(),
      name: product.name,
      price: product.price,
      // 원본이 동영상이면 동영상 키를 우선 사용해 카드에서 자동 분기 렌더링합니다.
      imageSrc: getCdnUrl(pickCardMediaKey(product.images?.[0])),
      category: product.category || '기타',
      isNew: new Date(product.createdAt) > oneWeekAgo,
      isSale: product.discountRate > 0,
      salePrice: product.discountRate > 0 ? salePrice : undefined,
    }
  })
}

export function FeaturedProducts() {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isMobile, setIsMobile] = useState(false)
  const [featuredProducts, setFeaturedProducts] = useState<FormattedProduct[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    const fetchProducts = async () => {
      const startedAt = Date.now()
      try {
        // 최신 목록과 고정 세트 후보를 동시에 가져와서 합성합니다.
        const [latestResponse, pinSourceResponse] = await Promise.all([
          fetch(`${apiRoutes.routes.products.path}?limit=${FEATURED_LIMIT}`, {
            // 메인 추천도 항상 최신 카드 구성을 받도록 캐시를 비활성화합니다.
            cache: "no-store",
          }),
          fetch(`${apiRoutes.routes.products.path}?limit=${PIN_SOURCE_LIMIT}&sort=id&order=asc`, {
            // 고정 세트 소스도 동일하게 no-store로 조회해 도메인 캐시 불일치를 막습니다.
            cache: "no-store",
          }),
        ])

        const latestRaw = await safeParseJson<unknown>(latestResponse)
        const pinSourceRaw = await safeParseJson<unknown>(pinSourceResponse)

        const latestRows: ProductData[] = Array.isArray(latestRaw) ? latestRaw : []
        const pinSourceRows: ProductData[] = Array.isArray(pinSourceRaw) ? pinSourceRaw : []

        // 세트 번호를 정확히 파싱해서 12번/22번 오매칭을 방지합니다.
        const pinnedRows = pinSourceRows.filter(product =>
          isProductInSet(product.name, PINNED_SET_NO),
        )

        const mergedRows = mergePinnedFirst(pinnedRows, latestRows, FEATURED_LIMIT)
        const formatted = toFormattedProducts(mergedRows)

        if (!cancelled) setFeaturedProducts(formatted)
      } catch (error) {
        console.error('추천 상품 로딩 중 오류:', error)
        if (!cancelled) setFeaturedProducts([])
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

  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 768)
    }

    checkScreenSize()
    window.addEventListener('resize', checkScreenSize)
    return () => {
      window.removeEventListener('resize', checkScreenSize)
    }
  }, [])

  const itemsPerPage = isMobile ? 2 : 4
  const totalPages = Math.ceil(featuredProducts.length / itemsPerPage)

  const nextSlide = () => {
    setCurrentIndex(prevIndex => (prevIndex === totalPages - 1 ? 0 : prevIndex + 1))
  }

  const prevSlide = () => {
    setCurrentIndex(prevIndex => (prevIndex === 0 ? totalPages - 1 : prevIndex - 1))
  }

  const visibleProducts = featuredProducts.slice(
    currentIndex * itemsPerPage,
    (currentIndex + 1) * itemsPerPage,
  )

  if (isLoading) {
    return (
      <div className="relative">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
          {Array.from({ length: itemsPerPage }).map((_, index) => (
            <ProductCardSkeleton key={`featured-skeleton-${index}`} />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="relative">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
        {visibleProducts.map(product => (
          <ProductCard
            key={product.id}
            id={product.id}
            name={product.name}
            price={product.price}
            imageSrc={product.imageSrc}
            category={product.category}
            isNew={product.isNew}
            isSale={product.isSale}
            salePrice={product.salePrice}
          />
        ))}
      </div>

      <Button
        variant="outline"
        size="icon"
        className="absolute -left-4 top-1/2 -translate-y-1/2 border-muted-foreground/20 bg-background/80 backdrop-blur-sm"
        onClick={prevSlide}
      >
        <ChevronLeft className="h-4 w-4" />
        <span className="sr-only">이전</span>
      </Button>

      <Button
        variant="outline"
        size="icon"
        className="absolute -right-4 top-1/2 -translate-y-1/2 border-muted-foreground/20 bg-background/80 backdrop-blur-sm"
        onClick={nextSlide}
      >
        <ChevronRight className="h-4 w-4" />
        <span className="sr-only">다음</span>
      </Button>

      <div className="mt-4 flex justify-center gap-1">
        {Array.from({ length: totalPages }).map((_, index) => (
          <button
            key={index}
            className={`h-2 rounded-full transition-all ${
              index === currentIndex ? 'w-4 bg-primary' : 'w-2 bg-muted-foreground/30'
            }`}
            onClick={() => setCurrentIndex(index)}
            aria-label={`페이지 ${index + 1}`}
          />
        ))}
      </div>
    </div>
  )
}
