"use client"

import Image from "next/image"
import Link from "next/link"
import { ShoppingCart, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { useShopStore } from "@/lib/store"
import { useToast } from "@/components/ui/use-toast"
import type { WishlistItem as WishlistItemType } from "@/lib/wishlist"

interface WishlistItemProps {
  item: WishlistItemType
}

export default function WishlistItem({ item }: WishlistItemProps) {
  const { removeFromWishlist, addToCart } = useShopStore()
  const { toast } = useToast()

  const handleRemove = () => {
    removeFromWishlist(item.id)

    toast({
      title: "위시리스트에서 삭제되었습니다",
      description: `${item.name}이(가) 위시리스트에서 삭제되었습니다.`,
    })
  }

  const handleAddToCart = () => {
    addToCart({
      id: item.id,
      name: item.name,
      price: item.salePrice || item.price,
      imageSrc: item.imageSrc,
      category: item.category,
      quantity: 1,
    })

    toast({
      title: "장바구니에 추가되었습니다",
      description: `${item.name}이(가) 장바구니에 추가되었습니다.`,
    })
  }

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center py-4 border-b">
      <div className="flex-shrink-0 w-full sm:w-24 h-24 relative mb-4 sm:mb-0 sm:mr-4">
        <Image src={item.imageSrc || "/placeholder.svg"} alt={item.name} fill className="object-cover rounded-md" />
      </div>

      <div className="flex-grow">
        <Link href={`/product/${item.id}`} className="font-medium hover:underline">
          {item.name}
        </Link>
        {item.category && <p className="text-sm text-muted-foreground">{item.category}</p>}
      </div>

      <div className="flex items-center justify-between w-full sm:w-auto mt-4 sm:mt-0">
        <div className="font-medium sm:ml-4 sm:text-right">
          {item.salePrice ? (
            <div className="flex flex-col sm:items-end">
              <span className="font-semibold">{item.salePrice.toLocaleString()}원</span>
              <span className="text-sm text-muted-foreground line-through">{item.price.toLocaleString()}원</span>
            </div>
          ) : (
            <span>{item.price.toLocaleString()}원</span>
          )}
        </div>

        <div className="flex ml-4 gap-2">
          <Button variant="outline" size="sm" className="flex items-center gap-1" onClick={handleAddToCart}>
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

