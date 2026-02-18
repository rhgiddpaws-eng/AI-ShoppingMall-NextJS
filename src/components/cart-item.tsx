"use client"

/**
 * CartItem — 장바구니 한 줄 아이템 컴포넌트
 *
 * [모양]
 * - 가로: 썸네일(24x24) | 상품명/카테고리 | 수량 +/- 입력 | 소계 금액 | 삭제 버튼
 * - 반응형: sm 미만은 세로 배치, sm 이상은 한 줄
 * - Tailwind: flex, border-b, rounded-md, object-cover
 *
 * [기능]
 * - 수량 변경: Input 직접 입력 또는 +/- 버튼 (최소 1)
 * - 수량 1일 때 감소 버튼 비활성화
 * - 삭제 시 useShopStore.removeFromCart(id) 호출 (API 연동)
 * - 소계: price * quantity 로컬 계산 후 toLocaleString()
 *
 * [문법]
 * - React.ChangeEvent<HTMLInputElement> 로 입력 이벤트 타입
 * - Number.parseInt + isNaN 검사로 유효 수량만 반영
 * - sr-only: 스크린 리더용 텍스트(시각적으로 숨김)
 *
 * [라이브러리 연계]
 * - next/image: Image (fill, sizes="96px")
 * - next/link: Link → /product/[id]
 * - lucide-react: Minus, Plus, Trash2 아이콘
 * - @/components/ui: Button, Input (shadcn 스타일)
 * - @/lib/store: useShopStore (updateCartItemQuantity, removeFromCart)
 * - @/lib/cart: CartItem 타입
 */

import type React from "react"

import Image from "next/image"
import Link from "next/link"
import { Minus, Plus, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { isVideoMediaPath } from "@/lib/media"
import { useShopStore } from "@/lib/store"
import type { CartItem as CartItemType } from "@/lib/cart"

interface CartItemProps {
  item: CartItemType
}

export default function CartItem({ item }: CartItemProps) {
  const { updateCartItemQuantity, removeFromCart } = useShopStore()
  // 장바구니 썸네일이 동영상일 수도 있어서 렌더링 타입을 분기합니다.
  const isVideoMedia = isVideoMediaPath(item.imageSrc)

  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newQuantity = Number.parseInt(e.target.value)
    if (isNaN(newQuantity) || newQuantity < 1) return
    updateCartItemQuantity(item.id, newQuantity)
  }

  const incrementQuantity = () => {
    updateCartItemQuantity(item.id, item.quantity + 1)
  }

  const decrementQuantity = () => {
    if (item.quantity <= 1) return
    updateCartItemQuantity(item.id, item.quantity - 1)
  }

  const handleRemove = () => {
    removeFromCart(item.id)
  }

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center py-4 border-b">
      <div className="flex-shrink-0 w-full sm:w-24 h-24 relative mb-4 sm:mb-0 sm:mr-4">
        {isVideoMedia ? (
          <video
            src={item.imageSrc}
            className="h-full w-full rounded-md object-cover"
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            aria-label={`${item.name} 상품 동영상`}
          />
        ) : (
          <Image
            src={item.imageSrc || "/placeholder.svg"}
            alt={item.name}
            fill
            sizes="96px"
            className="object-cover rounded-md"
          />
        )}
      </div>

      <div className="flex-grow min-w-0">
        <Link href={`/product/${item.id}`} className="font-medium hover:underline line-clamp-2 break-words block">
          {item.name}
        </Link>
        {item.category && <p className="text-sm text-muted-foreground truncate">{item.category}</p>}
      </div>

      <div className="flex items-center mt-4 sm:mt-0 sm:ml-4">
        <div className="flex items-center border rounded-md">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-none rounded-l-md"
            onClick={decrementQuantity}
            disabled={item.quantity <= 1}
          >
            <Minus className="h-3 w-3" />
            <span className="sr-only">수량 감소</span>
          </Button>

          <Input
            type="number"
            min="1"
            value={item.quantity}
            onChange={handleQuantityChange}
            className="h-8 w-12 text-center border-0 rounded-none focus-visible:ring-0 focus-visible:ring-offset-0"
          />

          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-none rounded-r-md" onClick={incrementQuantity}>
            <Plus className="h-3 w-3" />
            <span className="sr-only">수량 증가</span>
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between w-full sm:w-auto mt-4 sm:mt-0 sm:ml-6">
        <div className="font-medium sm:ml-4 sm:text-right">{(item.price * item.quantity).toLocaleString()}원</div>

        <Button
          variant="ghost"
          size="icon"
          className="text-destructive hover:text-destructive/90 hover:bg-destructive/10 ml-4"
          onClick={handleRemove}
        >
          <Trash2 className="h-4 w-4" />
          <span className="sr-only">삭제</span>
        </Button>
      </div>
    </div>
  )
}

