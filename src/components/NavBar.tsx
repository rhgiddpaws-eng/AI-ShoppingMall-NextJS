"use client"

/**
 * NavBar — 전역 상단 네비게이션
 * - md 미만: 햄버거 메뉴 → Sheet로 카테고리 링크 표시 (반응형)
 */

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { ShoppingCart, Search, User, Heart, Menu, LogIn } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { ThemeToggle } from "@/components/theme-toggle"
import { useShopStore } from "@/lib/store"
import { useAuthStore } from "@/lib/store"

const categoryLinks = [
  { href: "/category/men", label: "남성" },
  { href: "/category/women", label: "여성" },
  { href: "/category/accessories", label: "액세서리" },
  { href: "/category/shoes", label: "신발" },
  { href: "/category/sale", label: "세일", className: "text-red-500" },
]

export function NavBar() {
  const { cart, wishlist } = useShopStore()
  const { user } = useAuthStore()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <header className="border-b">
      <div className="container mx-auto px-4 py-2 flex justify-between items-center">
        <div className="flex items-center gap-2 md:hidden">
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="메뉴">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64">
              <SheetHeader>
                <SheetTitle className="sr-only">카테고리 메뉴</SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col gap-2 pt-4">
                {categoryLinks.map(({ href, label, className }) => (
                  <Link
                    key={href}
                    href={href}
                    className={`block py-2 font-medium hover:text-primary ${className ?? ""}`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {label}
                  </Link>
                ))}
              </nav>
            </SheetContent>
          </Sheet>
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
          <Button variant="ghost" size="icon" asChild className="text-foreground">
            <Link href="/search" title="검색">
              <Search className="h-5 w-5 md:hidden" />
              <span className="sr-only">검색</span>
            </Link>
          </Button>
          <Button variant="ghost" size="sm" asChild className="text-foreground gap-1.5">
            <Link
              href={user ? "/account" : "/login"}
              title={user ? "계정" : "로그인"}
              aria-label={user ? "계정" : "로그인"}
            >
              {user ? <User className="h-5 w-5 shrink-0" /> : <LogIn className="h-5 w-5 shrink-0" />}
              <span className="hidden sm:inline">{user ? "계정" : "로그인"}</span>
            </Link>
          </Button>
          <Button variant="ghost" size="icon" className="relative text-foreground" asChild>
            <Link href="/wishlist" title="위시리스트">
              <Heart className="h-5 w-5" />
              {wishlist.length > 0 && (
                <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs">
                  {wishlist.length}
                </Badge>
              )}
              <span className="sr-only">위시리스트</span>
            </Link>
          </Button>
          <Button variant="ghost" size="icon" className="relative text-foreground" asChild>
            <Link href="/cart" title="장바구니">
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

