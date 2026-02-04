"use client"

import Link from "next/link"
import { ArrowLeft, Heart } from "lucide-react"

import { Button } from "@/components/ui/button"
import WishlistItem from "@/components/wishlist-item"
import { useShopStore } from "@/lib/store"

export default function WishlistPage() {
  const { wishlist } = useShopStore()

  if (wishlist.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8 min-h-screen">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center mb-8">
            <Button variant="ghost" size="icon" asChild className="mr-2">
              <Link href="/">
                <ArrowLeft className="h-5 w-5" />
                <span className="sr-only">뒤로 가기</span>
              </Link>
            </Button>
            <h1 className="text-2xl font-bold">위시리스트</h1>
          </div>

          <div className="text-center py-16 border rounded-lg">
            <Heart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-medium mb-2">위시리스트가 비어있습니다</h2>
            <p className="text-muted-foreground mb-6">마음에 드는 상품을 위시리스트에 추가해보세요.</p>
            <Button asChild>
              <Link href="/">쇼핑 계속하기</Link>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 min-h-screen">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center mb-8">
          <Button variant="ghost" size="icon" asChild className="mr-2">
            <Link href="/">
              <ArrowLeft className="h-5 w-5" />
              <span className="sr-only">뒤로 가기</span>
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">위시리스트</h1>
        </div>

        <div>
          {wishlist.map((item) => (
            <WishlistItem key={item.id} item={item} />
          ))}
        </div>

        <div className="mt-8 text-center">
          <Button asChild>
            <Link href="/">쇼핑 계속하기</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}

