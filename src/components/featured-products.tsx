'use client'

import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

import { Button } from '@/components/ui/button'
import ProductCard from '@/components/product-card'
import { apiRoutes } from '@/lib/apiRoutes'

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
        if (!response.ok)
          throw new Error('상품 데이터를 가져오는데 실패했습니다')

        const products: ProductData[] = await response.json()

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
                ? `https://cdn.yes.monster/${product.images[0].original}`
                : '/placeholder.svg?height=400&width=300',
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

  // 로딩 상태 표시
  if (isLoading) {
    return <div className="text-center py-10">상품을 불러오는 중...</div>
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
