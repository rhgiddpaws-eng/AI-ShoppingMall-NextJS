"use client"

import type React from "react"

import { useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Heart, ShoppingCart } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { isVideoMediaPath } from "@/lib/media"
import { warmProductRoute } from "@/lib/route-warmup"
import { useShopStore } from "@/lib/store"
import { cn } from "@/lib/utils"

interface ProductCardProps {
  id: string
  name: string
  price: number
  imageSrc: string
  category?: string
  isNew?: boolean
  isSale?: boolean
  salePrice?: number
}

/**
 * 상품 카드 컴포넌트입니다.
 * - 상세 이동, 장바구니 담기, 위시리스트 토글을 제공합니다.
 * - 카드 미디어는 이미지/동영상을 확장자로 자동 분기합니다.
 */
export default function ProductCard({
  id,
  name,
  price,
  imageSrc,
  category,
  isNew = false,
  isSale = false,
  salePrice,
}: ProductCardProps) {
  const router = useRouter()
  const [isHovered, setIsHovered] = useState(false)
  const { addToCart, addToWishlist, isInWishlist, removeFromWishlist } =
    useShopStore()
  const [isWishlisted, setIsWishlisted] = useState(false)

  const mediaFallbackSrc = imageSrc || "/placeholder.svg"
  const isRemoteImage =
    mediaFallbackSrc.startsWith("http://") || mediaFallbackSrc.startsWith("https://")
  // 동영상이면 <video>, 아니면 <Image>를 렌더링합니다.
  const isVideoMedia = isVideoMediaPath(mediaFallbackSrc)

  // 카드에 마우스를 올렸을 때 상세 진입 전에 API를 예열합니다.
  const prefetchProductDetail = () => {
    warmProductRoute(router, id)
  }

  useEffect(() => {
    setIsWishlisted(isInWishlist(id))
  }, [id, isInWishlist])

  const handleAddToCart = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault()
    event.stopPropagation()

    const added = addToCart({
      id,
      name,
      price: isSale && salePrice ? salePrice : price,
      imageSrc: mediaFallbackSrc,
      quantity: 1,
      category,
    })

    if (added) {
      toast.success(`${name}이(가) 장바구니에 추가되었습니다.`)
    }
  }

  const handleToggleWishlist = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault()
    event.stopPropagation()

    if (isWishlisted) {
      removeFromWishlist(id)
      setIsWishlisted(false)
      toast.success(`${name}이(가) 위시리스트에서 제거되었습니다.`)
      return
    }

    const added = addToWishlist({
      id,
      name,
      price,
      imageSrc: mediaFallbackSrc,
      category,
      salePrice: isSale ? salePrice : undefined,
    })

    if (added) {
      setIsWishlisted(true)
      toast.success(`${name}이(가) 위시리스트에 추가되었습니다.`)
    }
  }

  return (
    <Link
      href={`/product/${id}`}
      // 목록 카드가 많을 때 과도한 prefetch 요청을 막기 위해 비활성화합니다.
      prefetch={false}
      className="group block"
      onMouseEnter={() => {
        setIsHovered(true)
        prefetchProductDetail()
      }}
      onMouseLeave={() => setIsHovered(false)}
      onTouchStart={prefetchProductDetail}
      onFocus={prefetchProductDetail}
    >
      <div className="relative overflow-hidden rounded-lg">
        <div className="relative aspect-[7/8] w-full rounded-lg border border-gray-200 bg-muted">
          {isVideoMedia ? (
            <video
              src={mediaFallbackSrc}
              className="h-full w-full scale-105 object-cover transition-transform duration-300 group-hover:scale-110"
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
              aria-label={`${name} 상품 동영상`}
            />
          ) : (
            <Image
              src={mediaFallbackSrc}
              alt={name}
              fill
              sizes="(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw"
              className="scale-104 object-cover transition-transform duration-300 group-hover:scale-110"
              // CDN 경로의 이미지는 이미 최적화된 파일이라 추가 최적화를 생략합니다.
              unoptimized={isRemoteImage}
            />
          )}

          <div className="absolute left-2 top-2 flex flex-col gap-1">
            {isNew && (
              <Badge className="bg-blue-500 hover:bg-blue-500/90">신상</Badge>
            )}
            {isSale && (
              <Badge className="bg-red-500 hover:bg-red-500/90">할인</Badge>
            )}
          </div>

          <div
            className={cn(
              "absolute bottom-0 left-0 right-0 flex gap-2 bg-black/70 p-2 backdrop-blur-sm transition-all duration-300",
              isHovered ? "translate-y-0 opacity-100" : "translate-y-full opacity-0",
            )}
          >
            <Button
              size="sm"
              variant="secondary"
              className="flex-1 cursor-pointer"
              onClick={handleAddToCart}
            >
              <ShoppingCart className="mr-1 h-4 w-4" />
              담기
            </Button>
            <Button
              size="sm"
              variant="outline"
              className={`cursor-pointer border-white/50 bg-transparent hover:bg-white/20 hover:text-white ${
                isWishlisted ? "text-red-500" : "text-white"
              }`}
              onClick={handleToggleWishlist}
            >
              <Heart className={`h-4 w-4 ${isWishlisted ? "fill-current" : ""}`} />
            </Button>
          </div>
        </div>

        <div className="mt-2 py-4">
          <h3 className="line-clamp-2 min-w-0 break-words text-md font-medium">{name}</h3>
          <p className="mb-1 text-xs text-muted-foreground">{category}</p>
          <div className="flex items-center gap-2">
            {isSale && salePrice ? (
              <>
                <span className="font-semibold">{salePrice.toLocaleString()}원</span>
                <span className="text-sm text-muted-foreground line-through">
                  {price.toLocaleString()}원
                </span>
              </>
            ) : (
              <span className="font-semibold">{price.toLocaleString()}원</span>
            )}
          </div>
        </div>
      </div>
    </Link>
  )
}
