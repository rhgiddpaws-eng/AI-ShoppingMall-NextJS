"use client"

import { useState, useEffect } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"

import { Button } from "@/components/ui/button"
import ProductCard from "@/components/product-card"

export function FeaturedProducts() {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isMobile, setIsMobile] = useState(false)

  // 반응형 처리를 위한 화면 크기 감지
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 768)
    }

    checkScreenSize()
    window.addEventListener("resize", checkScreenSize)

    return () => {
      window.removeEventListener("resize", checkScreenSize)
    }
  }, [])

  // 샘플 데이터
  const featuredProducts = [
    {
      id: "featured-1",
      name: "프리미엄 코튼 티셔츠",
      price: 39000,
      imageSrc: "/placeholder.svg?height=400&width=300",
      category: "의류",
      isSale: true,
      salePrice: 29000,
    },
    {
      id: "featured-2",
      name: "슬림핏 데님 청바지",
      price: 79000,
      imageSrc: "/placeholder.svg?height=400&width=300",
      category: "의류",
    },
    {
      id: "featured-3",
      name: "캐주얼 후드 집업",
      price: 89000,
      imageSrc: "/placeholder.svg?height=400&width=300",
      category: "의류",
      isNew: true,
    },
    {
      id: "featured-4",
      name: "클래식 가죽 스니커즈",
      price: 129000,
      imageSrc: "/placeholder.svg?height=400&width=300",
      category: "신발",
    },
    {
      id: "featured-5",
      name: "미니멀 크로스백",
      price: 59000,
      imageSrc: "/placeholder.svg?height=400&width=300",
      category: "액세서리",
      isSale: true,
      salePrice: 49000,
    },
    {
      id: "featured-6",
      name: "오버사이즈 니트 스웨터",
      price: 69000,
      imageSrc: "/placeholder.svg?height=400&width=300",
      category: "의류",
      isNew: true,
    },
    {
      id: "featured-7",
      name: "빈티지 데님 자켓",
      price: 119000,
      imageSrc: "/placeholder.svg?height=400&width=300",
      category: "의류",
    },
    {
      id: "featured-8",
      name: "스트라이프 셔츠",
      price: 59000,
      imageSrc: "/placeholder.svg?height=400&width=300",
      category: "의류",
    },
  ]

  const itemsPerPage = isMobile ? 2 : 4
  const totalPages = Math.ceil(featuredProducts.length / itemsPerPage)

  const nextSlide = () => {
    setCurrentIndex((prevIndex) => (prevIndex === totalPages - 1 ? 0 : prevIndex + 1))
  }

  const prevSlide = () => {
    setCurrentIndex((prevIndex) => (prevIndex === 0 ? totalPages - 1 : prevIndex - 1))
  }

  const visibleProducts = featuredProducts.slice(currentIndex * itemsPerPage, (currentIndex + 1) * itemsPerPage)

  return (
    <div className="relative">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
        {visibleProducts.map((product) => (
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
              index === currentIndex ? "w-4 bg-primary" : "w-2 bg-muted-foreground/30"
            }`}
            onClick={() => setCurrentIndex(index)}
            aria-label={`페이지 ${index + 1}`}
          />
        ))}
      </div>
    </div>
  )
}

