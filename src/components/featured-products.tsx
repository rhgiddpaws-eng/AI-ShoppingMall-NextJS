'use client'

/**
 * FeaturedProducts — 메인/추천 상품 캐러셀
 *
 * [모양]
 * - 그리드: 2열(mobile) / 4열(md), 좌우 화살표로 슬라이드
 * - 좌우 버튼: absolute -left-4 / -right-4, top-1/2 -translate-y-1/2
 * - 하단: 페이지네이션 점(현재 페이지는 w-4 bg-primary, 나머지 w-2 bg-muted)
 * - 로딩 시 "상품을 불러오는 중..." 텍스트
 *
 * [기능]
 * - 마운트 시 GET /api/products?limit=8 로 상품 fetch
 * - 7일 이내 생성 상품은 isNew, discountRate>0 이면 isSale/salePrice 계산
 * - resize 이벤트로 768px 미만이면 모바일(2개씩), 이상이면 4개씩 표시
 * - prev/next 시 인덱스 순환(마지막→처음, 처음→마지막)
 * - 점 클릭 시 해당 인덱스로 이동
 *
 * [문법]
 * - slice(currentIndex * itemsPerPage, (currentIndex+1) * itemsPerPage) 
 * - 로 현재 페이지 상품만 노출
 * - oneWeekAgo: setDate(getDate()-7) 로 신상품 판별
 * - CDN 이미지: getCdnUrl(original) (.env NEXT_PUBLIC_AWS_BUCKET_CDN 사용)
 *
 * [라이브러리 연계]
 * - react: useState, useEffect
 * - lucide-react: ChevronLeft, ChevronRight
 * - @/components/ui/button, @/components/product-card
 * - @/lib/apiRoutes: apiRoutes.routes.products.path
 */

import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

import { Button } from '@/components/ui/button'
import ProductCard from '@/components/product-card'
import { ProductCardSkeleton } from '@/components/product-card-skeleton'
import { apiRoutes } from '@/lib/apiRoutes'
import { getCdnUrl } from '@/lib/cdn'
import { safeParseJson } from '@/lib/utils'

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
  const [featuredProducts, setFeaturedProducts] = useState<FormattedProduct[]>(
    [],
  )
  const [isLoading, setIsLoading] = useState(true)

  // API에서 상품 데이터 가져오기
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await fetch(
          `${apiRoutes.routes.products.path}?limit=8`,
        )
        if (!response.ok) {
          setFeaturedProducts([])
          return
        }

        const raw = await safeParseJson<unknown>(response)
        const products: ProductData[] = Array.isArray(raw) ? raw : []

        // 현재 날짜 기준 일주일 전 계산
        const oneWeekAgo = new Date()
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)

        // 상품 데이터 포맷팅
        const formattedProducts = products.map(product => {
          // 할인 가격 계산
          const discountAmount = product.price * (product.discountRate / 100)
          const salePrice = product.price - discountAmount

          return {
            id: product.id.toString(),
            name: product.name,
            price: product.price,
            imageSrc:
              product.images && product.images.length > 0
                // 홈 목록 카드에는 썸네일 이미지를 사용해 로딩 지연을 줄입니다.
                ? getCdnUrl(product.images[0].thumbnail || product.images[0].original)
                : '/placeholder.svg',
            category: product.category || '기타',
            isNew: new Date(product.createdAt) > oneWeekAgo,
            isSale: product.discountRate > 0,
            salePrice: product.discountRate > 0 ? salePrice : undefined,
          }
        })

        setFeaturedProducts(formattedProducts)
      } catch (error) {
        console.error('상품 데이터 로딩 오류:', error)
        // 오류 발생 시 빈 배열 사용
        setFeaturedProducts([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchProducts()
  }, [])

  // 반응형 처리를 위한 화면 크기 감지
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

  // 로딩 중에도 카드 틀을 먼저 보여줘 화면이 비어 보이지 않게 합니다.
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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
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

      {/* Navigation Arrows */}
      <Button
        variant="outline"
        size="icon"
        className="absolute -left-4 top-1/2 -translate-y-1/2 bg-background/80 backdrop-blur-sm border-muted-foreground/20"
        onClick={prevSlide}
      >
        <ChevronLeft className="h-4 w-4" />
        <span className="sr-only">이전</span>
      </Button>

      <Button
        variant="outline"
        size="icon"
        className="absolute -right-4 top-1/2 -translate-y-1/2 bg-background/80 backdrop-blur-sm border-muted-foreground/20"
        onClick={nextSlide}
      >
        <ChevronRight className="h-4 w-4" />
        <span className="sr-only">다음</span>
      </Button>

      {/* Pagination Dots */}
      <div className="flex justify-center gap-1 mt-4">
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
