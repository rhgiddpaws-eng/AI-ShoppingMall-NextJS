'use client'

/**
 * FeaturedProducts: 메인 추천 상품 캐러셀
 * - "2번 상품" 세트를 항상 앞쪽에 고정 노출합니다.
 * - 나머지 칸은 최신 상품으로 채웁니다.
 */

import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight } from 'lucide-react'

import ProductCard from '@/components/product-card'
import { ProductCardSkeleton } from '@/components/product-card-skeleton'
import { Button } from '@/components/ui/button'
import { apiRoutes } from '@/lib/apiRoutes'
import { getCdnUrl } from '@/lib/cdn'
import { pickCardMediaKey } from '@/lib/media'
import { isProductInSet, mergePinnedFirst } from '@/lib/product-set'
import { safeParseJson } from '@/lib/utils'

// 메인에서 고정 노출할 세트 번호입니다.
const PINNED_SET_NO = 2
// 메인 추천 섹션 최대 노출 개수입니다.
const FEATURED_LIMIT = 8
// 고정 세트 후보를 찾기 위해 넉넉히 조회합니다.
const PIN_SOURCE_LIMIT = 100
// 같은 홈 재진입에서 즉시 재사용할 수 있도록 추천 캐시 유효 시간을 1분으로 둡니다.
const FEATURED_STALE_TIME_MS = 60_000
// 추천 캐시는 20분간 보관해 탭 이동/재진입의 재요청을 줄입니다.
const FEATURED_GC_TIME_MS = 20 * 60_000

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
    mediaType: 'image' | 'video'
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

async function fetchFeaturedProducts(): Promise<FormattedProduct[]> {
  try {
    // 최신 목록과 고정 세트 후보를 동시에 가져와서 합성합니다.
    const [latestResponse, pinSourceResponse] = await Promise.all([
      fetch(`${apiRoutes.routes.products.path}?limit=${FEATURED_LIMIT}`),
      fetch(`${apiRoutes.routes.products.path}?limit=${PIN_SOURCE_LIMIT}&sort=id&order=asc`),
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
    return toFormattedProducts(mergedRows)
  } catch (error) {
    console.error('추천 상품 로딩 중 오류:', error)
    return []
  }
}

export function FeaturedProducts() {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isMobile, setIsMobile] = useState(false)
  const { data: featuredProducts = [], isPending } = useQuery({
    queryKey: ['products', 'featured'],
    queryFn: fetchFeaturedProducts,
    // 홈에 다시 들어왔을 때 스켈레톤 대신 직전 데이터를 바로 보여주기 위한 설정입니다.
    staleTime: FEATURED_STALE_TIME_MS,
    gcTime: FEATURED_GC_TIME_MS,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 1,
  })

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
  const canSlide = totalPages > 1
  const isLoading = isPending && featuredProducts.length === 0

  useEffect(() => {
    // 데이터 개수가 바뀌어 페이지 수가 줄어들면 첫 페이지로 안전하게 되돌립니다.
    if (totalPages === 0) {
      setCurrentIndex(0)
      return
    }
    if (currentIndex > totalPages - 1) {
      setCurrentIndex(0)
    }
  }, [currentIndex, totalPages])

  const nextSlide = () => {
    if (!canSlide) return
    setCurrentIndex(prevIndex => (prevIndex === totalPages - 1 ? 0 : prevIndex + 1))
  }

  const prevSlide = () => {
    if (!canSlide) return
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

  if (featuredProducts.length === 0) {
    return <p className="text-sm text-muted-foreground">추천 상품이 아직 없습니다.</p>
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

      {canSlide ? (
        <>
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
        </>
      ) : null}
    </div>
  )
}
