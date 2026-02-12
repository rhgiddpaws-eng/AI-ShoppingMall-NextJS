'use client'

/**
 * WishlistItem — 위시리스트 한 줄 아이템 컴포넌트
 *
 * [모양]
 * - 가로: 썸네일(24x24, rounded-md) | 상품명/카테고리 링크 | 가격(세일 시 salePrice + 취소선 원가) | 담기 버튼 | 삭제 버튼
 * - 반응형: sm 미만 세로 배치, sm 이상 한 줄
 * - 삭제 버튼: variant ghost, text-destructive, Trash2 아이콘
 *
 * [기능]
 * - 상품명 클릭: /product/[id] 이동
 * - 담기: addToCart(salePrice 우선, quantity 1), toast 성공
 * - 삭제: removeFromWishlist(item.id), toast 성공
 * - useShopStore의 API 연동 위시리스트 사용(서버와 동기화)
 *
 * [문법]
 * - WishlistItem 타입: @/lib/wishlist 에서 import (id, name, price, imageSrc, category?, salePrice?)
 * - addToCart 시 item.salePrice || item.price 로 할인가 반영
 *
 * [라이브러리 연계]
 * - next/image: Image (fill, sizes="96px")
 * - next/link: Link
 * - lucide-react: ShoppingCart, Trash2 아이콘을 사용하여 
 * - 각 상품의 '장바구니 담기' 및 '삭제' 인터페이스를 제공합니다.
 * - @/components/ui/button: Button
 * - @/lib/store: useShopStore (removeFromWishlist, addToCart)
 * - sonner: toast.success
 * - @/lib/wishlist: WishlistItem 타입
 */

import Image from 'next/image'
import Link from 'next/link'
import { ShoppingCart, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { useShopStore } from '@/lib/store'
import { toast } from 'sonner'
import type { WishlistItem as WishlistItemType } from '@/lib/wishlist'

interface WishlistItemProps {
  item: WishlistItemType
}

export default function WishlistItem({ item }: WishlistItemProps) {
  const { removeFromWishlist, addToCart } = useShopStore()

  const handleRemove = () => {
    removeFromWishlist(item.id)

    toast.success(`${item.name}이(가) 위시리스트에서 삭제되었습니다.`)
  }

  const handleAddToCart = () => {
    const added = addToCart({
      id: item.id,
      name: item.name,
      price: item.salePrice || item.price,
      imageSrc: item.imageSrc,
      category: item.category,
      quantity: 1,
    })
    if (added) toast.success(`${item.name}이(가) 장바구니에 추가되었습니다.`)
  }

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center py-4 border-b">
      <div className="flex-shrink-0 w-full sm:w-24 h-24 relative mb-4 sm:mb-0 sm:mr-4">
        <Image
          src={item.imageSrc || '/placeholder.svg'}
          alt={item.name}
          fill
          sizes="96px"
          className="object-cover rounded-md"
        />
      </div>

      <div className="flex-grow">
        <Link
          href={`/product/${item.id}`}
          className="font-medium hover:underline"
        >
          {item.name}
        </Link>
        {item.category && (
          <p className="text-sm text-muted-foreground">{item.category}</p>
        )}
      </div>

      <div className="flex items-center justify-between w-full sm:w-auto mt-4 sm:mt-0">
        <div className="font-medium sm:ml-4 sm:text-right">
          {item.salePrice ? (
            <div className="flex flex-col sm:items-end">
              <span className="font-semibold">
                {item.salePrice.toLocaleString()}원
              </span>
              <span className="text-sm text-muted-foreground line-through">
                {item.price.toLocaleString()}원
              </span>
            </div>
          ) : (
            <span>{item.price.toLocaleString()}원</span>
          )}
        </div>

        <div className="flex ml-4 gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-1"
            onClick={handleAddToCart}
          >
            <ShoppingCart className="h-4 w-4" />
            <span className="hidden sm:inline">담기</span>
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="text-destructive hover:text-destructive/90 hover:bg-destructive/10"
            onClick={handleRemove}
          >
            <Trash2 className="h-4 w-4" />
            <span className="sr-only">삭제</span>
          </Button>
        </div>
      </div>
    </div>
  )
}
