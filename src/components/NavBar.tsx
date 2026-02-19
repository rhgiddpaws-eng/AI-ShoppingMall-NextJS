"use client"

/**
 * 상단 네비게이션 바입니다.
 * - 브랜드 로고, 카테고리 메뉴, 검색, 계정/위시리스트/장바구니 버튼을 제공합니다.
 * - 검색어 제출 시 /category/new?term=... 으로 이동합니다.
 */

import { FormEvent, useEffect, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { ShoppingCart, Search, User, Heart, Menu, LogIn, Shield } from "lucide-react"

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
import { useAuthStore, useShopStore } from "@/lib/store"
import {
  warmAdminApis,
  warmCategoryRoute,
  warmLoggedInApis,
  warmPrimaryRoutes,
} from "@/lib/route-warmup"

type CategoryLink = {
  href: string
  label: string
  className?: string
}

const categoryLinks: CategoryLink[] = [
  { href: "/category/men", label: "남성" },
  { href: "/category/women", label: "여성" },
  { href: "/category/accessories", label: "액세서리" },
  { href: "/category/shoes", label: "신발" },
  { href: "/category/sale", label: "세일", className: "text-red-500" },
]

export function NavBar() {
  const router = useRouter()
  const { cart, wishlist } = useShopStore()
  const { user } = useAuthStore()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [searchInput, setSearchInput] = useState("")

  // 카테고리 링크에 마우스/포커스가 닿으면 상세 화면 진입 전에 데이터를 미리 예열합니다.
  const handleCategoryIntent = (href: string) => {
    warmCategoryRoute(router, href)
  }

  // 검색어를 비우면 이동하지 않고, 값이 있으면 검색 결과 페이지로 이동합니다.
  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmed = searchInput.trim()
    if (!trimmed) return
    router.push(`/category/new?term=${encodeURIComponent(trimmed)}`)
  }

  useEffect(() => {
    // 초기 렌더가 끝난 뒤 여유 시간에 핵심 이동 경로를 미리 prefetch해 첫 페이지 이동 지연을 줄입니다.
    const runWarmup = () => {
      warmPrimaryRoutes(router, Boolean(user))
      if (user) warmLoggedInApis()
    }

    const browserGlobal = globalThis as typeof globalThis & {
      requestIdleCallback?: (callback: () => void) => number
      cancelIdleCallback?: (handle: number) => void
    }

    if (typeof browserGlobal.requestIdleCallback === "function") {
      const idleId = browserGlobal.requestIdleCallback(() => runWarmup())
      return () => browserGlobal.cancelIdleCallback?.(idleId)
    }

    const timeoutId = setTimeout(runWarmup, 120)
    return () => clearTimeout(timeoutId)
  }, [router, user])

  return (
    <header className="border-b">
      <div className="container mx-auto flex items-center justify-between gap-3 px-4 py-2">
        <div className="flex items-center gap-2">
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
                      // 주요 카테고리는 기본 prefetch를 켜서 클릭 직후 화면 전환을 빠르게 만듭니다.
                      className={`block py-2 font-medium hover:text-primary ${className ?? ""}`}
                      onTouchStart={() => handleCategoryIntent(href)}
                      onFocus={() => handleCategoryIntent(href)}
                      onClick={() => {
                        handleCategoryIntent(href)
                        setMobileMenuOpen(false)
                      }}
                    >
                      {label}
                    </Link>
                  ))}
                </nav>
              </SheetContent>
            </Sheet>
          </div>

          <Link href="/" className="flex shrink-0 items-center gap-2">
            <Image src="/kus-logo.svg" alt="KUS 스타일" width={40} height={40} />
            <span className="hidden text-xl font-bold sm:inline-block">KUS 스타일</span>
          </Link>

          {user ? (
            // 로그인 사용자에게만 좌측 상단에서 바로 관리자 페이지 진입 버튼을 노출합니다.
            <Button variant="outline" size="sm" asChild className="gap-1.5">
              <Link
                href="/admin"
                aria-label="관리자 페이지"
                onMouseEnter={() => {
                  // 관리자 버튼에 커서가 닿으면 관리자 경로/인증 API를 즉시 예열합니다.
                  warmPrimaryRoutes(router, true)
                  warmAdminApis()
                }}
                onFocus={() => {
                  warmPrimaryRoutes(router, true)
                  warmAdminApis()
                }}
              >
                <Shield className="h-4 w-4 shrink-0" />
                <span className="hidden sm:inline">Admin</span>
              </Link>
            </Button>
          ) : null}
        </div>

        <nav className="hidden items-center gap-6 md:flex">
          {categoryLinks.map(({ href, label, className }) => (
            <Link
              key={href}
              href={href}
              // 주요 카테고리는 기본 prefetch를 켜서 클릭 직후 화면 전환을 빠르게 만듭니다.
              onMouseEnter={() => handleCategoryIntent(href)}
              onFocus={() => handleCategoryIntent(href)}
              className={`text-sm font-medium hover:text-primary ${className ?? ""}`}
            >
              {label}
            </Link>
          ))}
        </nav>

        <div className="flex min-w-0 items-center gap-2">
          <form
            onSubmit={handleSearchSubmit}
            className="relative hidden w-full max-w-sm items-center md:flex"
          >
            <Search className="absolute left-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="상품 검색..."
              className="w-full pl-8"
              value={searchInput}
              onChange={event => setSearchInput(event.target.value)}
            />
          </form>

          <ThemeToggle />

          <Button variant="ghost" size="icon" asChild className="text-foreground">
            <Link href="/search" title="검색">
              <Search className="h-5 w-5 md:hidden" />
              <span className="sr-only">검색</span>
            </Link>
          </Button>

          <Button variant="ghost" size="sm" asChild className="gap-1.5 text-foreground">
            <Link
              href={user ? "/account" : "/login"}
              title={user ? "계정" : "로그인"}
              aria-label={user ? "계정" : "로그인"}
            >
              {user ? (
                <User className="h-5 w-5 shrink-0" />
              ) : (
                <LogIn className="h-5 w-5 shrink-0" />
              )}
              <span className="hidden sm:inline">{user ? "계정" : "로그인"}</span>
            </Link>
          </Button>

          <Button variant="ghost" size="icon" className="relative text-foreground" asChild>
            <Link href="/wishlist" title="위시리스트">
              <Heart className="h-5 w-5" />
              {wishlist.length > 0 && (
                <Badge className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center p-0 text-xs">
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
                <Badge className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center p-0 text-xs">
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
