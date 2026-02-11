"use client"

/**
 * NavBar — 전역 상단 네비게이션
 *
 * [모양]
 * - 한 줄: [모바일 메뉴] 로고 | 카테고리 링크(남/여/액세서리/신발/세일) | 검색 | 테마 | 로그인/계정 | 위시리스트 | 장바구니
 * - md 미만: 카테고리 숨김, 검색은 아이콘만(/search 링크)
 * - md 이상: 검색 Input 표시, 카테고리 링크 표시
 * - 위시/장바구니에 개수 Badge (absolute -top-1 -right-1), 0이면 Badge 미표시
 * - 로고: /logo.svg, 다크모드 시 dark:invert
 *
 * [기능]
 * - 로고 클릭 → /
 * - 카테고리 → /category/men|women|accessories|shoes, 세일 → /category/sale
 * - 검색(데스크톱): Input만 있고 실검색 기능은 연동되어 있지 않음(placeholder)
 * - 검색(모바일): /search로 이동만 하며 실검색 로직 미구현
 * - 로그인 여부에 따라 /login 또는 /account, 아이콘 User/LogIn 전환
 * - 위시리스트/장바구니 개수는 useShopStore.cart, wishlist 길이
 *
 * [문법]
 * - Button asChild + Link: 링크처럼 동작하는 버튼(Next 라우팅)
 * - aria-label, title, sr-only으로 접근성
 *
 * [라이브러리 연계]
 * - next/link, next/image
 * - lucide-react: ShoppingCart, Search, User, Heart, Menu, LogIn
 * - @/components/ui: Button, Input, Badge
 * - @/components/theme-toggle: ThemeToggle
 * - @/lib/store: useShopStore(cart, wishlist), useAuthStore(user)
 */

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

