"use client"

import type React from "react"

import { useEffect, useRef, useState } from "react"
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
  videoSrc?: string
  category?: string
  isNew?: boolean
  isSale?: boolean
  salePrice?: number
}

const VIDEO_READY_CACHE_KEY = "kus_card_video_ready_v1"
const videoReadyMemoryCache = new Set<string>()

/**
 * 세션 캐시에 저장된 동영상 준비 완료 목록을 메모리로 불러옵니다.
 * - 한 번만 읽어 동일 세션에서 반복 JSON 파싱을 줄입니다.
 */
let hasHydratedVideoCache = false
function hydrateVideoReadyCache() {
  if (hasHydratedVideoCache) return
  hasHydratedVideoCache = true

  if (typeof window === "undefined") return
  try {
    const raw = window.sessionStorage.getItem(VIDEO_READY_CACHE_KEY)
    if (!raw) return
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return

    for (const value of parsed) {
      if (typeof value === "string" && value.length > 0) {
        videoReadyMemoryCache.add(value)
      }
    }
  } catch {
    // 캐시 파싱 실패는 무시하고, 현재 렌더 동작을 유지합니다.
  }
}

/** 동영상 준비 완료 URL을 메모리+세션 캐시에 함께 기록합니다. */
function rememberVideoReady(videoUrl: string) {
  if (!videoUrl) return
  videoReadyMemoryCache.add(videoUrl)

  if (typeof window === "undefined") return
  try {
    const serialized = JSON.stringify(Array.from(videoReadyMemoryCache))
    window.sessionStorage.setItem(VIDEO_READY_CACHE_KEY, serialized)
  } catch {
    // 저장 용량 초과 등 브라우저 예외가 나도 화면 동작은 계속 유지합니다.
  }
}

/** 동영상 URL이 이미 준비 완료 캐시에 있는지 확인합니다. */
function isRememberedVideoReady(videoUrl: string): boolean {
  hydrateVideoReadyCache()
  return videoReadyMemoryCache.has(videoUrl)
}

/**
 * 상품 카드 컴포넌트입니다.
 * - 첫 진입에서는 썸네일 이미지를 먼저 보여주고, 동영상 준비가 끝나면 동영상으로 전환합니다.
 * - 한 번 준비된 동영상 URL은 같은 세션 재진입 시 바로 동영상을 보여줍니다.
 */
export default function ProductCard({
  id,
  name,
  price,
  imageSrc,
  videoSrc,
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

  const imageFallbackSrc = imageSrc || "/placeholder.svg"
  const candidateVideoSrc = (videoSrc || "").trim()
  const legacyVideoSrc = isVideoMediaPath(imageFallbackSrc) ? imageFallbackSrc : ""
  const resolvedVideoSrc = candidateVideoSrc || legacyVideoSrc
  const hasVideoMedia = Boolean(resolvedVideoSrc) && isVideoMediaPath(resolvedVideoSrc)

  // 이미지 레이어에는 실제 이미지 URL만 넘겨 Next/Image 오류를 방지합니다.
  const imageLayerSrc = isVideoMediaPath(imageFallbackSrc)
    ? "/placeholder.svg"
    : imageFallbackSrc
  const isRemoteImage =
    imageLayerSrc.startsWith("http://") || imageLayerSrc.startsWith("https://")

  // 동영상에는 썸네일을 poster로 설정해 재진입 시에도 빈 화면을 줄입니다.
  const videoPosterSrc = isVideoMediaPath(imageFallbackSrc)
    ? undefined
    : imageFallbackSrc

  const [isVideoVisible, setIsVideoVisible] = useState(false)
  const [isVideoFailed, setIsVideoFailed] = useState(false)
  const videoRef = useRef<HTMLVideoElement | null>(null)

  useEffect(() => {
    if (!hasVideoMedia || !resolvedVideoSrc) {
      setIsVideoVisible(false)
      setIsVideoFailed(false)
      return
    }

    // 같은 세션에서 이미 준비된 동영상은 재진입 시 즉시 노출합니다.
    setIsVideoVisible(isRememberedVideoReady(resolvedVideoSrc))
    setIsVideoFailed(false)
  }, [hasVideoMedia, resolvedVideoSrc])

  // 동영상 준비 완료 시점에 이미지 레이어를 숨기고 동영상 레이어를 고정 노출합니다.
  const revealVideoLayer = () => {
    if (!hasVideoMedia || !resolvedVideoSrc || isVideoFailed) return

    rememberVideoReady(resolvedVideoSrc)
    setIsVideoVisible(true)

    const videoElement = videoRef.current
    if (!videoElement) return

    const playPromise = videoElement.play()
    if (playPromise) {
      void playPromise.catch(() => {
        // 자동 재생 정책으로 막히면 화면은 유지하고 사용자 상호작용 시 재생됩니다.
      })
    }
  }

  // 카드 미디어가 실패할 때는 이미지 레이어를 유지해 빈 카드가 보이지 않게 막습니다.
  const handleVideoError = () => {
    setIsVideoFailed(true)
    setIsVideoVisible(false)
  }

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
      // 장바구니 미리보기는 항상 이미지 경로를 저장해 목록 렌더 안정성을 유지합니다.
      imageSrc: imageLayerSrc,
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
      // 위시리스트 미리보기도 이미지 경로를 저장해 목록 렌더 안정성을 유지합니다.
      imageSrc: imageLayerSrc,
      category,
      salePrice: isSale ? salePrice : undefined,
    })

    if (added) {
      setIsWishlisted(true)
      toast.success(`${name}이(가) 위시리스트에 추가되었습니다.`)
    }
  }

  const shouldRenderVideo = hasVideoMedia && !isVideoFailed
  const videoObjectPositionClass = "object-[50%_32%]"
  const mediaAspectClass = "aspect-[7/8]"

  return (
    <Link
      href={`/product/${id}`}
      // 상품 상세 이동 지연을 줄이기 위해 기본 prefetch를 사용합니다.
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
        <div
          className={`relative ${mediaAspectClass} w-full rounded-lg border border-gray-200 bg-muted`}
        >
          {shouldRenderVideo ? (
            <video
              ref={videoRef}
              src={resolvedVideoSrc}
              poster={videoPosterSrc}
              // 동영상은 cover로 채워 카드 비율을 안정적으로 유지합니다.
              className={cn(
                `absolute inset-0 h-full w-full bg-black object-cover ${videoObjectPositionClass}`,
                "transition-opacity duration-300",
                isVideoVisible ? "opacity-100" : "opacity-0",
              )}
              autoPlay
              muted
              loop
              playsInline
              // 최초 1회는 충분히 받아 다음 페이지 진입 시 캐시 재사용 확률을 높입니다.
              preload="auto"
              onLoadedData={revealVideoLayer}
              onCanPlay={revealVideoLayer}
              onError={handleVideoError}
              aria-label={`${name} 상품 동영상`}
            />
          ) : null}

          {!shouldRenderVideo || !isVideoVisible ? (
            <Image
              src={imageLayerSrc}
              alt={name}
              fill
              sizes="(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw"
              className="scale-104 object-cover transition-transform duration-300 group-hover:scale-110"
              // CDN 원본은 이미 최적화 파일이므로 추가 변환을 건너뜁니다.
              unoptimized={isRemoteImage}
            />
          ) : null}

          <div className="absolute left-2 top-2 flex flex-col gap-1">
            {isNew && <Badge className="bg-blue-500 hover:bg-blue-500/90">신상</Badge>}
            {isSale && <Badge className="bg-red-500 hover:bg-red-500/90">할인</Badge>}
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
