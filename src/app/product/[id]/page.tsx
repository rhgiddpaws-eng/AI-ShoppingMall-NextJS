"use client"

// =============================================================================
// 상품 상세 페이지 - /product/[id]
// 상품 정보 조회, 장바구니/위시리스트 액션, 추천 상품 섹션을 제공합니다.
// =============================================================================

import { useEffect, useState } from "react"
import Image from "next/image"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, Heart, ShoppingCart } from "lucide-react"
import { toast } from "sonner"

import { RecommendedProducts } from "@/components/recommended-products"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { apiRoutes } from "@/lib/apiRoutes"
import { getCdnUrl } from "@/lib/cdn"
import { isVideoMediaPath, isVideoMediaType } from "@/lib/media"
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
    mediaType: "image" | "video"
  }[]
}

/**
 * 장바구니/위시리스트 미리보기 이미지는 항상 이미지가 우선되도록 계산합니다.
 * - 원본이 동영상이면 thumbnail을 사용합니다.
 */
function getPreviewImageUrl(product: ProductType): string {
  const first = product.images[0]
  if (!first) return "/placeholder.svg"
  // DB mediaType이 image이면 썸네일을 우선 사용해 리스트 렌더링 비용을 줄입니다.
  if (first.thumbnail && !isVideoMediaType(first.mediaType)) return getCdnUrl(first.thumbnail)
  if (first.original && !isVideoMediaType(first.mediaType) && !isVideoMediaPath(first.original)) {
    return getCdnUrl(first.original)
  }
  if (first.thumbnail) return getCdnUrl(first.thumbnail)
  if (first.original) return getCdnUrl(first.original)
  return "/placeholder.svg"
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

        const response = await fetch(`${apiRoutes.routes.products.path}/${params.id}`, {
          // 상세 페이지는 교체된 미디어를 즉시 보여주기 위해 캐시를 사용하지 않습니다.
          cache: "no-store",
        })
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
      imageSrc: getPreviewImageUrl(product),
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
      imageSrc: getPreviewImageUrl(product),
      category: product.category || "기타",
    })

    if (added) {
      setIsWishlisted(true)
      toast.success(`${product.name}이(가) 위시리스트에 추가되었습니다.`)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        {/* 상세페이지 로딩 중에는 최종 레이아웃과 비슷한 스켈레톤을 먼저 보여줍니다. */}
        <div className="mb-4">
          <Skeleton className="h-10 w-10 rounded-md" />
        </div>

        <div className="grid gap-8 md:grid-cols-2">
          <Skeleton className="aspect-square w-full rounded-lg" />

          <div className="space-y-4">
            <Skeleton className="h-10 w-4/5" />
            <Skeleton className="h-8 w-2/5" />
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-5/6" />
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-4 w-1/4" />
            <div className="space-y-3 pt-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          </div>
        </div>

        <div className="mt-12 space-y-4">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-6 w-56" />
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-4/5" />
        </div>
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

  const firstMedia = product.images[0]
  const mediaUrl = firstMedia?.original ? getCdnUrl(firstMedia.original) : "/placeholder.svg"
  const mediaPosterUrl = firstMedia?.thumbnail ? getCdnUrl(firstMedia.thumbnail) : undefined

  // 동영상 원본이 들어오면 상세 메인 영역에서 자동 재생 비디오로 렌더링합니다.
  // DB mediaType을 우선 사용하고, 기존 데이터는 확장자 판별로 fallback 합니다.
  const isVideoMedia = isVideoMediaType(firstMedia?.mediaType) || isVideoMediaPath(mediaUrl)
  const isRemoteImage =
    !isVideoMedia && (mediaUrl.startsWith("http://") || mediaUrl.startsWith("https://"))
  // 세로형 룩북 영상은 폭을 줄이고 높이를 늘려 얼굴/전신이 잘리지 않게 보여줍니다.
  const mediaWrapperClass = isVideoMedia
    ? "relative mx-auto aspect-[9/16] w-full max-w-[420px] overflow-hidden rounded-lg bg-black"
    : "relative aspect-square overflow-hidden rounded-lg bg-muted"

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
        <div className={mediaWrapperClass}>
          {isVideoMedia ? (
            <video
              src={mediaUrl}
              poster={mediaPosterUrl}
              // 상세 영상에서도 레터박스가 과하게 보이지 않도록 화면을 꽉 채워 표시합니다.
              className="h-full w-full object-cover"
              autoPlay
              muted
              loop
              playsInline
              // 상세 동영상도 전체 파일을 한 번에 받지 않도록 메타데이터 우선으로 불러옵니다.
              preload="metadata"
              aria-label={`${product.name} 상품 동영상`}
            />
          ) : (
            <Image
              src={mediaUrl}
              alt={product.name}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              className="object-cover"
              priority
              // 상세 원본 이미지가 CDN 경로일 때 Next 이미지 추가 최적화를 건너뜁니다.
              unoptimized={isRemoteImage}
            />
          )}
        </div>

        <div>
          <h1 className="mb-2 line-clamp-2 min-w-0 break-words text-2xl font-bold sm:text-3xl">
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
