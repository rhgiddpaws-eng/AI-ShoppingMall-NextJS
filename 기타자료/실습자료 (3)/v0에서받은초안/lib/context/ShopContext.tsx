"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"
import { getCart, type CartItem } from "@/lib/cart"
import { getWishlist, type WishlistItem } from "@/lib/wishlist"

interface ShopContextType {
  cartItems: CartItem[]
  wishlistItems: WishlistItem[]
  updateCart: () => void
  updateWishlist: () => void
}

const ShopContext = createContext<ShopContextType | undefined>(undefined)

export const useShopContext = () => {
  const context = useContext(ShopContext)
  if (context === undefined) {
    throw new Error("useShopContext must be used within a ShopProvider")
  }
  return context
}

export const ShopProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>([])

  const updateCart = () => {
    setCartItems(getCart())
  }

  const updateWishlist = () => {
    setWishlistItems(getWishlist())
  }

  useEffect(() => {
    updateCart()
    updateWishlist()
  }, [])

  return (
    <ShopContext.Provider value={{ cartItems, wishlistItems, updateCart, updateWishlist }}>
      {children}
    </ShopContext.Provider>
  )
}

