'use client'

/**
 * ProductCard — 상품 카드 (썸네일 + 뱃지 + 호버 시 담기/위시리스트)
 *
 * [모양]
 * - 카드: Link로 감싼 블록, aspect-[3/4] 이미지, object-cover, group-hover:scale-105
 * - 좌상단: 신상품(파란 Badge), 세일(빨간 Badge)
 * - 하단: 호버 시 올라오는 바 — 담기 버튼 + 하트(위시리스트 토글), cn()으로 opacity/translate 제어
 * - 하트가 위시리스트 포함 시 fill-current + text-red-500
 * - 텍스트: 상품명(line-clamp-1), 카테고리, 가격(세일 시 salePrice + 취소선 원가)
 *
 * [기능]
 * - 클릭: /product/[id] 이동
 * - 담기: addToCart(할인가 반영), sonner toast 성공 메시지
 * - 위시리스트: addToWishlist/removeFromWishlist, isInWishlist(id)로 하트 채움 상태 동기화
 * - 이벤트: e.preventDefault(), e.stopPropagation() 으로 링크 이동 방지
 *
 * [문법]
 * - isHovered 로 퀵 액션 바 표시 여부
 * - useEffect(() => setIsWishlisted(isInWishlist(id)), [id, isInWishlist]) 로 스토어와 동기화
 * - salePrice 있을 때만 할인가 표시
 *
 * [라이브러리 연계]
 * - next/image: Image (fill, sizes 반응형), priority
 * - next/link: Link
 * - lucide-react: Heart, ShoppingCart
 * - @/components/ui: Button, Badge
 * - @/lib/utils: cn (classnames 병합)
 * - @/lib/store: useShopStore (addToCart, addToWishlist, isInWishlist, removeFromWishlist)
 * - sonner: toast.success
 */

import type React from 'react'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Heart, ShoppingCart } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { useShopStore } from '@/lib/store'
import { toast } from 'sonner'
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
  const [isHovered, setIsHovered] = useState(false)
  const { addToCart, addToWishlist, isInWishlist, removeFromWishlist } =
    useShopStore()
  const [isWishlisted, setIsWishlisted] = useState(false)

  useEffect(() => {
    setIsWishlisted(isInWishlist(id))
  }, [id, isInWishlist])

  const handleAddToCart = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()
    e.stopPropagation()

    const added = addToCart({
      id,
      name,
      price: isSale && salePrice ? salePrice : price,
      imageSrc,
      quantity: 1,
      category,
    })
    if (added) toast.success(`${name}이(가) 장바구니에 추가되었습니다.`)
  }

  const handleToggleWishlist = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()
    e.stopPropagation()

    if (isWishlisted) {
      removeFromWishlist(id)
      setIsWishlisted(false)
      toast.success(`${name}이(가) 위시리스트에서 제거되었습니다.`)
    } else {
      const added = addToWishlist({
        id,
        name,
        price,
        imageSrc,
        category,
        salePrice: isSale ? salePrice : undefined,
      })
      if (added) {
        setIsWishlisted(true)
        toast.success(`${name}이(가) 위시리스트에 추가되었습니다.`)
      }
    }
  }

  return (
    <Link
      href={`/product/${id}`}
      className="group block"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="relative rounded-lg overflow-hidden">
        <div className="aspect-[7/8] w-full relative bg-muted border border-gray-200 rounded-lg">
          <Image
            src={imageSrc || '/placeholder.svg'}
            alt={name}
            fill
            sizes="(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw"
            className="scale-104 object-cover transition-transform duration-300 group-hover:scale-110"
            priority
          />

          {/* Badges */}
          <div className="absolute top-2 left-2 flex flex-col gap-1">
            {isNew && (
              <Badge className="bg-blue-500 hover:bg-blue-500/90">신상품</Badge>
            )}
            {isSale && (
              <Badge className="bg-red-500 hover:bg-red-500/90">세일</Badge>
            )}
          </div>

          {/* Quick actions */}
          <div
            className={cn(
              'absolute bottom-0 left-0 right-0 bg-black/70 backdrop-blur-sm p-2 flex gap-2 transition-all duration-300',
              isHovered
                ? 'opacity-100 translate-y-0'
                : 'opacity-0 translate-y-full',
            )}
          >
            <Button
              size="sm"
              variant="secondary"
              className="flex-1 cursor-pointer"
              onClick={handleAddToCart}
            >
              <ShoppingCart className="h-4 w-4 mr-1" />
              담기
            </Button>
            <Button
              size="sm"
              variant="outline"
              className={`bg-transparent border-white/50 hover:bg-white/20 hover:text-white cursor-pointer ${isWishlisted ? 'text-red-500' : 'text-white'
                }`}
              onClick={handleToggleWishlist}
            >
              <Heart
                className={`h-4 w-4 ${isWishlisted ? 'fill-current' : ''}`}
              />
            </Button>
          </div>
        </div>

        <div className="mt-2 py-4">
          <h3 className="font-medium text-md line-clamp-2 min-w-0 break-words">{name}</h3>
          <p className="text-xs text-muted-foreground mb-1">{category}</p>
          <div className="flex items-center gap-2">
            {isSale && salePrice ? (
              <>
                <span className="font-semibold">
                  {salePrice.toLocaleString()}원
                </span>
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
