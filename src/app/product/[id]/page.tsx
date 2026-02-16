"use client"

// =============================================================================
// 상품 상세 페이지 - /product/[id]
// 상품 정보 조회, 장바구니/위시리스트 액션, 추천 상품 영역을 제공합니다.
// =============================================================================

import { useEffect, useState } from "react"
import Image from "next/image"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, Heart, ShoppingCart } from "lucide-react"
import { toast } from "sonner"

import { RecommendedProducts } from "@/components/recommended-products"
import { Button } from "@/components/ui/button"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { apiRoutes } from "@/lib/apiRoutes"
import { getCdnUrl } from "@/lib/cdn"
import { useShopStore } from "@/lib/store"

type ProductType = {
  id: number
  name: string
  description: string | null
  price: number
  stock: number
  discountRate: number
  category: string | null
  images: {
    id: number
    original: string
    thumbnail: string
  }[]
}

/**
 * 상품 상세 페이지입니다.
 * ID로 API를 조회하고 장바구니/위시리스트 버튼을 제공합니다.
 */
export default function ProductPage() {
  const params = useParams()
  const router = useRouter()
  const { addToCart, addToWishlist, removeFromWishlist, isInWishlist } =
    useShopStore()

  const [isWishlisted, setIsWishlisted] = useState(false)
  const [product, setProduct] = useState<ProductType | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setLoading(true)

        const response = await fetch(`${apiRoutes.routes.products.path}/${params.id}`)
        if (!response.ok) {
          throw new Error("상품 정보를 불러오지 못했습니다.")
        }

        const data = (await response.json()) as ProductType
        setProduct(data)
      } catch (fetchError) {
        console.error("product fetch error:", fetchError)
        setError(
          fetchError instanceof Error
            ? fetchError.message
            : "상품 정보를 불러오는 중 오류가 발생했습니다.",
        )
      } finally {
        setLoading(false)
      }
    }

    if (params.id) {
      void fetchProduct()
    }
  }, [params.id])

  useEffect(() => {
    if (!product) return
    setIsWishlisted(isInWishlist(product.id.toString()))
  }, [product, isInWishlist])

  const handleAddToCart = () => {
    if (!product) return

    const added = addToCart({
      id: product.id.toString(),
      name: product.name,
      price: product.price,
      imageSrc:
        product.images.length > 0
          ? getCdnUrl(product.images[0].original)
          : "/placeholder.svg",
      quantity: 1,
      category: product.category || "기타",
    })

    if (added) {
      toast.success(`${product.name}이(가) 장바구니에 추가되었습니다.`)
    }
  }

  const handleToggleWishlist = () => {
    if (!product) return

    if (isWishlisted) {
      removeFromWishlist(product.id.toString())
      setIsWishlisted(false)
      toast.success(`${product.name}이(가) 위시리스트에서 제거되었습니다.`)
      return
    }

    const added = addToWishlist({
      id: product.id.toString(),
      name: product.name,
      price: product.price,
      imageSrc:
        product.images.length > 0
          ? getCdnUrl(product.images[0].original)
          : "/placeholder.svg",
      category: product.category || "기타",
    })

    if (added) {
      setIsWishlisted(true)
      toast.success(`${product.name}이(가) 위시리스트에 추가되었습니다.`)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto flex min-h-[50vh] items-center justify-center px-4 py-8">
        {/* 첫 진입 로딩 상태를 명확히 보여 체감 지연을 줄입니다. */}
        <LoadingSpinner size={28} label="상품 정보를 불러오는 중" />
      </div>
    )
  }

  if (error || !product) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.back()}
          className="mb-4"
        >
          <ArrowLeft className="h-5 w-5" />
          <span className="sr-only">뒤로 가기</span>
        </Button>

        <div className="py-10 text-center">
          <h2 className="text-xl font-semibold">상품을 찾을 수 없습니다.</h2>
          <p className="mt-2 text-gray-500">
            {error || "잘못된 접근이거나 상품이 존재하지 않습니다."}
          </p>
        </div>
      </div>
    )
  }

  const imageUrl =
    product.images.length > 0
      ? getCdnUrl(product.images[0].original)
      : "/placeholder.svg"

  const isRemoteImage =
    imageUrl.startsWith("http://") || imageUrl.startsWith("https://")

  const finalPrice = product.price * (1 - product.discountRate)

  return (
    <div className="container mx-auto px-4 py-8">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => router.back()}
        className="mb-4"
      >
        <ArrowLeft className="h-5 w-5" />
        <span className="sr-only">뒤로 가기</span>
      </Button>

      <div className="grid gap-8 md:grid-cols-2">
        <div className="relative aspect-square">
          <Image
            src={imageUrl}
            alt={product.name}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="rounded-lg object-cover"
            priority
            // 상세 대표 이미지는 CDN 원본을 직접 사용하므로 추가 최적화를 건너뜁니다.
            unoptimized={isRemoteImage}
          />
        </div>

        <div>
          <h1 className="mb-2 min-w-0 break-words text-2xl font-bold line-clamp-2 sm:text-3xl">
            {product.name}
          </h1>

          {product.discountRate > 0 ? (
            <div className="mb-4">
              <p className="text-lg text-gray-500 line-through">
                {product.price.toLocaleString()}원
              </p>
              <p className="text-2xl font-semibold text-red-600">
                {finalPrice.toLocaleString()}원
                <span className="ml-2 rounded bg-red-100 px-2 py-1 text-sm text-red-600">
                  {(product.discountRate * 100).toFixed(0)}% 할인
                </span>
              </p>
            </div>
          ) : (
            <p className="mb-4 text-2xl font-semibold">{product.price.toLocaleString()}원</p>
          )}

          <p className="mb-6 break-words">{product.description || "상품 설명이 없습니다."}</p>

          <div className="mb-4 space-y-1 text-sm text-gray-600">
            <p>재고: {product.stock > 0 ? `${product.stock}개` : "품절"}</p>
            <p>카테고리: {product.category || "기타"}</p>
          </div>

          <div className="space-y-4">
            <Button onClick={handleAddToCart} disabled={product.stock <= 0} className="w-full">
              <ShoppingCart className="mr-2 h-4 w-4" />
              {product.stock > 0 ? "장바구니에 추가" : "품절"}
            </Button>

            <Button variant="outline" onClick={handleToggleWishlist} className="w-full">
              <Heart
                className={`mr-2 h-4 w-4 ${
                  isWishlisted ? "fill-current text-red-500" : ""
                }`}
              />
              {isWishlisted ? "위시리스트에서 제거" : "위시리스트에 추가"}
            </Button>
          </div>
        </div>
      </div>

      <Tabs defaultValue="description" className="mt-12">
        <TabsList>
          <TabsTrigger value="description">상세 설명</TabsTrigger>
          <TabsTrigger value="shipping">배송 정보</TabsTrigger>
        </TabsList>

        <TabsContent value="description" className="mt-4">
          <h2 className="mb-2 text-xl font-semibold">상품 상세 설명</h2>
          <p>{product.description || "상세 설명이 없습니다."}</p>
        </TabsContent>

        <TabsContent value="shipping" className="mt-4">
          <h2 className="mb-2 text-xl font-semibold">배송 정보</h2>
          <p>일반 배송: 3-5일 소요</p>
          <p>빠른 배송: 1-2일 소요 (추가 요금 발생)</p>
        </TabsContent>
      </Tabs>

      <RecommendedProducts currentProductId={product.id.toString()} />
    </div>
  )
}
