'use client'

/**
 * FeaturedProducts: 메인 추천 상품 캐러셀
 * - 2열(모바일) / 4열(데스크톱) 그리드
 * - 좌우 버튼, 하단 페이지 점 제공
 */

import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

import { Button } from '@/components/ui/button'
import ProductCard from '@/components/product-card'
import { ProductCardSkeleton } from '@/components/product-card-skeleton'
import { apiRoutes } from '@/lib/apiRoutes'
import { getCdnUrl } from '@/lib/cdn'
import { pickCardMediaKey } from '@/lib/media'
import { safeParseJson } from '@/lib/utils'

// 스켈레톤이 너무 짧게 보였다가 깜빡 사라지는 현상을 막기 위한 최소 노출 시간입니다.
const MIN_SKELETON_MS = 350

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
        const response = await fetch(`${apiRoutes.routes.products.path}?limit=8`)
        if (!response.ok) {
          if (!cancelled) setFeaturedProducts([])
          return
        }

        const raw = await safeParseJson<unknown>(response)
        const products: ProductData[] = Array.isArray(raw) ? raw : []

        const oneWeekAgo = new Date()
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)

        const formattedProducts = products.map(product => {
          const discountAmount = product.price * (product.discountRate / 100)
          const salePrice = product.price - discountAmount

          return {
            id: product.id.toString(),
            name: product.name,
            price: product.price,
            // 원본이 동영상이면 카드에서도 동영상을 렌더링하기 위해 원본 키를 선택합니다.
            imageSrc: getCdnUrl(pickCardMediaKey(product.images?.[0])),
            category: product.category || '기타',
            isNew: new Date(product.createdAt) > oneWeekAgo,
            isSale: product.discountRate > 0,
            salePrice: product.discountRate > 0 ? salePrice : undefined,
          }
        })

        if (!cancelled) setFeaturedProducts(formattedProducts)
      } catch (error) {
        console.error('상품 데이터 로딩 오류:', error)
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
    setCurrentIndex(prevIndex =>
      prevIndex === totalPages - 1 ? 0 : prevIndex + 1,
    )
  }

  const prevSlide = () => {
    setCurrentIndex(prevIndex =>
      prevIndex === 0 ? totalPages - 1 : prevIndex - 1,
    )
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
              index === currentIndex
                ? 'w-4 bg-primary'
                : 'w-2 bg-muted-foreground/30'
            }`}
            onClick={() => setCurrentIndex(index)}
            aria-label={`페이지 ${index + 1}`}
          />
        ))}
      </div>
    </div>
  )
}
