"use client"

import type React from "react"

import { useState, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { Heart, ShoppingCart } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { useToast } from "@/components/ui/use-toast"
import { useShopStore } from "@/lib/store"

interface ProductCardProps {
  id: string
  name: string
  price: number
  imageSrc: string
  category: string
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
  const { toast } = useToast()
  const { addToCart, addToWishlist, isInWishlist, removeFromWishlist } = useShopStore()
  const [isWishlisted, setIsWishlisted] = useState(false)

  useEffect(() => {
    setIsWishlisted(isInWishlist(id))
  }, [id, isInWishlist])

  const handleAddToCart = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()
    e.stopPropagation()

    addToCart({
      id,
      name,
      price: isSale && salePrice ? salePrice : price,
      imageSrc,
      quantity: 1,
      category,
    })

    toast({
      title: "장바구니에 추가되었습니다",
      description: `${name}이(가) 장바구니에 추가되었습니다.`,
    })
  }

  const handleToggleWishlist = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()
    e.stopPropagation()

    if (isWishlisted) {
      removeFromWishlist(id)
      setIsWishlisted(false)
      toast({
        title: "위시리스트에서 제거되었습니다",
        description: `${name}이(가) 위시리스트에서 제거되었습니다.`,
      })
    } else {
      addToWishlist({
        id,
        name,
        price,
        imageSrc,
        category,
        salePrice: isSale ? salePrice : undefined,
      })
      setIsWishlisted(true)
      toast({
        title: "위시리스트에 추가되었습니다",
        description: `${name}이(가) 위시리스트에 추가되었습니다.`,
      })
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
        <div className="aspect-[3/4] relative bg-muted">
          <Image
            src={imageSrc || "/placeholder.svg"}
            alt={name}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />

          {/* Badges */}
          <div className="absolute top-2 left-2 flex flex-col gap-1">
            {isNew && <Badge className="bg-blue-500 hover:bg-blue-500/90">신상품</Badge>}
            {isSale && <Badge className="bg-red-500 hover:bg-red-500/90">세일</Badge>}
          </div>

          {/* Quick actions */}
          <div
            className={cn(
              "absolute bottom-0 left-0 right-0 bg-black/70 backdrop-blur-sm p-2 flex justify-between transition-all duration-300",
              isHovered ? "opacity-100 translate-y-0" : "opacity-0 translate-y-full",
            )}
          >
            <Button size="sm" variant="secondary" className="w-full mr-1" onClick={handleAddToCart}>
              <ShoppingCart className="h-4 w-4 mr-1" />
              담기
            </Button>
            <Button
              size="sm"
              variant="outline"
              className={`bg-transparent border-white/50 hover:bg-white/20 hover:text-white ${
                isWishlisted ? "text-red-500" : "text-white"
              }`}
              onClick={handleToggleWishlist}
            >
              <Heart className={`h-4 w-4 ${isWishlisted ? "fill-current" : ""}`} />
            </Button>
          </div>
        </div>

        <div className="mt-2">
          <h3 className="font-medium text-sm line-clamp-1">{name}</h3>
          <p className="text-xs text-muted-foreground mb-1">{category}</p>
          <div className="flex items-center gap-2">
            {isSale && salePrice ? (
              <>
                <span className="font-semibold">{salePrice.toLocaleString()}원</span>
                <span className="text-sm text-muted-foreground line-through">{price.toLocaleString()}원</span>
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

