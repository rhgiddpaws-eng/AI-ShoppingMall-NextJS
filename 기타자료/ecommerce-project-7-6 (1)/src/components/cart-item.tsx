"use client"

import type React from "react"

import Image from "next/image"
import Link from "next/link"
import { Minus, Plus, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useShopStore } from "@/lib/store"
import type { CartItem as CartItemType } from "@/lib/cart"

interface CartItemProps {
  item: CartItemType
}

export default function CartItem({ item }: CartItemProps) {
  const { updateCartItemQuantity, removeFromCart } = useShopStore()

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
        <Image src={item.imageSrc || "/placeholder.svg"} alt={item.name} fill className="object-cover rounded-md" />
      </div>

      <div className="flex-grow">
        <Link href={`/product/${item.id}`} className="font-medium hover:underline">
          {item.name}
        </Link>
        {item.category && <p className="text-sm text-muted-foreground">{item.category}</p>}
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

