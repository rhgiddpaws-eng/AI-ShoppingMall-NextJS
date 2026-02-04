"use client"

import Link from "next/link"
import Image from "next/image"
import { ShoppingCart, Search, User, Heart, Menu, LogIn } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ThemeToggle } from "@/components/theme-toggle"
import { useShopStore } from "@/lib/store"
import { useAuthStore } from "@/lib/store"

export function NavBar() {
  const { cart, wishlist } = useShopStore()
  const { user } = useAuthStore()

  return (
    <header className="border-b">
      <div className="container mx-auto px-4 py-2 flex justify-between items-center">
        <div className="flex items-center gap-2 md:hidden">
          <Button variant="ghost" size="icon" className="md:hidden">
            <Menu className="h-5 w-5" />
            <span className="sr-only">메뉴</span>
          </Button>
        </div>

        <Link href="/" className="flex items-center gap-2">
          <Image src="/logo.svg" alt="ASOS Style" width={40} height={40} className="dark:invert" />
          <span className="font-bold text-xl hidden sm:inline-block">ASOS Style</span>
        </Link>

        <nav className="hidden md:flex items-center gap-6">
          <Link href="/category/men" className="text-sm font-medium hover:text-primary">
            남성
          </Link>
          <Link href="/category/women" className="text-sm font-medium hover:text-primary">
            여성
          </Link>
          <Link href="/category/accessories" className="text-sm font-medium hover:text-primary">
            액세서리
          </Link>
          <Link href="/category/shoes" className="text-sm font-medium hover:text-primary">
            신발
          </Link>
          <Link href="/category/sale" className="text-sm font-medium text-red-500 hover:text-red-600">
            세일
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          <div className="relative hidden md:flex items-center w-full max-w-sm">
            <Search className="absolute left-2.5 h-4 w-4 text-muted-foreground" />
            <Input type="search" placeholder="상품 검색..." className="pl-8 w-full" />
          </div>
          <ThemeToggle />
          <Button variant="ghost" size="icon" asChild>
            <Link href="/search">
              <Search className="h-5 w-5 md:hidden" />
              <span className="sr-only">검색</span>
            </Link>
          </Button>
          <Button variant="ghost" size="icon" asChild>
            <Link href={user ? "/account" : "/login"}>
              {user ? <User className="h-5 w-5" /> : <LogIn className="h-5 w-5" />}
              <span className="sr-only">{user ? "계정" : "로그인"}</span>
            </Link>
          </Button>
          <Button variant="ghost" size="icon" className="relative" asChild>
            <Link href="/wishlist">
              <Heart className="h-5 w-5" />
              {wishlist.length > 0 && (
                <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs">
                  {wishlist.length}
                </Badge>
              )}
              <span className="sr-only">위시리스트</span>
            </Link>
          </Button>
          <Button variant="ghost" size="icon" className="relative" asChild>
            <Link href="/cart">
              <ShoppingCart className="h-5 w-5" />
              {cart.length > 0 && (
                <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs">
                  {cart.length}
                </Badge>
              )}
              <span className="sr-only">장바구니</span>
            </Link>
          </Button>
        </div>
      </div>
    </header>
  )
}

