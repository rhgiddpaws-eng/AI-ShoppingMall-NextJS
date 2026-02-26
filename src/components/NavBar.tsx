"use client"

/**
 * 상단 네비게이션 바입니다.
 * - 로고, 카테고리, 검색, 계정/위시리스트/장바구니 버튼을 제공합니다.
 * - 초기 렌더 직후 예열 트래픽이 몰리지 않도록 워밍업 시점을 늦춥니다.
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

type NavigatorConnection = {
  saveData?: boolean
  effectiveType?: string
}

const categoryLinks: CategoryLink[] = [
  { href: "/category/men", label: "남성" },
  { href: "/category/women", label: "여성" },
  { href: "/category/accessories", label: "액세서리" },
  { href: "/category/shoes", label: "신발" },
  { href: "/category/sale", label: "세일", className: "text-red-500" },
]

const NAV_WARMUP_DELAY_MS = 1500

function shouldSkipNavWarmup() {
  if (typeof window === "undefined") return true

  // 느린 네트워크에서는 초기 예열보다 첫 화면 응답을 우선합니다.
  const connection = (navigator as Navigator & { connection?: NavigatorConnection })
    .connection
  if (connection?.saveData) return true

  const effectiveType = (connection?.effectiveType || "").toLowerCase()
  return (
    effectiveType === "slow-2g" ||
    effectiveType === "2g" ||
    effectiveType === "3g"
  )
}

export function NavBar() {
  const router = useRouter()
  const { cart, wishlist } = useShopStore()
  const { user } = useAuthStore()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [searchInput, setSearchInput] = useState("")

  // 카테고리 링크에 의도가 보이면 페이지/데이터를 미리 예열해 클릭 지연을 줄입니다.
  const handleCategoryIntent = (href: string) => {
    warmCategoryRoute(router, href)
  }

  // 검색어가 비어 있으면 이동하지 않고, 값이 있으면 검색 결과 페이지로 이동합니다.
  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmed = searchInput.trim()
    if (!trimmed) return
    router.push(`/category/new?term=${encodeURIComponent(trimmed)}`)
  }

  useEffect(() => {
    // 초기 렌더 직후에는 UI 안정화를 먼저 하고, 이후 idle 시점에 워밍업을 수행합니다.
    const runWarmup = () => {
      if (shouldSkipNavWarmup()) return
      warmPrimaryRoutes(router, Boolean(user))
      if (user) warmLoggedInApis()
    }

    const browserGlobal = globalThis as typeof globalThis & {
      requestIdleCallback?: (callback: () => void) => number
      cancelIdleCallback?: (handle: number) => void
    }

    let warmupTimerId: number | undefined
    let idleId: number | undefined

    warmupTimerId = window.setTimeout(() => {
      if (typeof browserGlobal.requestIdleCallback === "function") {
        idleId = browserGlobal.requestIdleCallback(() => runWarmup())
        return
      }
      runWarmup()
    }, NAV_WARMUP_DELAY_MS)

    return () => {
      if (warmupTimerId) window.clearTimeout(warmupTimerId)
      if (idleId && typeof browserGlobal.cancelIdleCallback === "function") {
        browserGlobal.cancelIdleCallback(idleId)
      }
    }
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
            <Image src="/kus-logo.svg" alt="KUS 스토어" width={40} height={40} />
            <span className="hidden text-xl font-bold sm:inline-block">KUS 스토어</span>
          </Link>

          {user ? (
            <Button variant="outline" size="sm" asChild className="gap-1.5">
              <Link
                href="/admin"
                aria-label="관리자 페이지"
                onMouseEnter={() => {
                  // 관리자 진입 의도가 보일 때만 관리자 관련 경로/API를 예열합니다.
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
