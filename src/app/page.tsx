// =============================================================================
// 메인 페이지 (홈)
// 히어로, 카테고리, 추천/신상품, 프로모션, 배송 지도, 푸터를 구성합니다.
// =============================================================================

import Link from "next/link"

import { ApiWarmupPrimer } from "@/components/api-warmup-primer"
import { CategoryCard } from "@/components/category-card"
import { FeaturedProducts } from "@/components/featured-products"
import { HeroSection } from "@/components/hero-section"
import { HomeDeliveryMapSection } from "@/components/home-delivery-map-section"
import { NavBar } from "@/components/NavBar"
import { NewProducts } from "@/components/new-products"
import { Button } from "@/components/ui/button"
import { getCdnUrl } from "@/lib/cdn"
import { getHomeProducts } from "@/lib/server/home-products"

// 히어로 에셋 캐시 무효화 버전입니다. 이미지가 갱신되지 않으면 이 값만 올리면 됩니다.
const HERO_ASSET_VERSION =
  process.env.NEXT_PUBLIC_HERO_ASSET_VERSION || "20260217-hero-1"

// 정적 에셋 URL 뒤에 버전 쿼리를 붙여 브라우저/CDN 캐시를 확실히 갱신합니다.
const withAssetVersion = (src: string) => {
  const separator = src.includes("?") ? "&" : "?"
  return `${src}${separator}v=${encodeURIComponent(HERO_ASSET_VERSION)}`
}

export default async function Home() {
  // 서버에서 상품 데이터를 미리 가져와 HTML에 포함시킵니다.
  // 기존: 클라이언트에서 4건 API 호출 (limit=8 x2, limit=100 x2) → 워터폴 발생
  // 개선: 서버에서 1건 DB 쿼리 → HTML에 데이터 포함 → 즉시 렌더링
  const { featured, newProducts } = await getHomeProducts()
  const heroGifSrc =
    typeof process.env.NEXT_PUBLIC_HERO_GIF_URL === "string"
      ? withAssetVersion(process.env.NEXT_PUBLIC_HERO_GIF_URL)
      : undefined

  // 사용자 요청으로 로컬 비디오 파일 경로를 사용합니다.
  const heroVideoSrc = withAssetVersion("/main/1.mp4")
  const heroPosterSrc = withAssetVersion("/main/1.webp")

  return (
    <div className="flex min-h-screen flex-col">
      <NavBar />

      <main className="flex-1 bg-gradient-to-b from-background via-background to-muted/20">
        {/* 첫 진입 직후 API를 가볍게 예열해 카테고리/상세 진입 지연을 줄입니다. */}
        <ApiWarmupPrimer />
        <HeroSection
          gifSrc={heroGifSrc}
          videoSrc={heroVideoSrc}
          posterSrc={heroPosterSrc}
        />

        <section className="container mx-auto px-4 py-12">
          <div className="mb-6">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Shop By Edit
            </p>
            <h2 className="mt-1 text-2xl font-bold md:text-3xl">카테고리</h2>
          </div>

          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <CategoryCard
              href="/category/men"
              label="남성"
              // 카테고리 썸네일은 경량 WebP 2세트를 번갈아 사용해 초기 체감 속도를 높입니다.
              images={[
                getCdnUrl("static/category/men.webp"),
                getCdnUrl("static/category/men2.webp"),
              ]}
            />
            <CategoryCard
              href="/category/women"
              label="여성"
              images={[
                getCdnUrl("static/category/women.webp"),
                getCdnUrl("static/category/women2.webp"),
              ]}
            />
            <CategoryCard
              href="/category/accessories"
              label="액세서리"
              images={[
                getCdnUrl("static/category/accessories.webp"),
                getCdnUrl("static/category/accessories2.webp"),
              ]}
            />
            <CategoryCard
              href="/category/shoes"
              label="신발"
              images={[
                getCdnUrl("static/category/shoes.webp"),
                getCdnUrl("static/category/shoes2.webp"),
              ]}
            />
          </div>
        </section>

        <section className="border-y bg-gradient-to-r from-muted/50 via-muted to-muted/40 py-12">
          <div className="container mx-auto px-4">
            <div className="mb-6">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Best Picks
              </p>
              <h2 className="mt-1 text-2xl font-bold md:text-3xl">인기 상품</h2>
            </div>
            <FeaturedProducts initialData={featured} />
          </div>
        </section>

        <section className="container mx-auto px-4 py-12">
          <div className="mb-6">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Latest Drop
            </p>
            <h2 className="mt-1 text-2xl font-bold md:text-3xl">신상품</h2>
          </div>
          <NewProducts initialData={newProducts} />
          <div className="mt-8 text-center">
            <Button size="lg" variant="outline" asChild>
              <Link href="/category/new">더 보기</Link>
            </Button>
          </div>
        </section>

        <section className="relative overflow-hidden bg-primary py-12 text-primary-foreground">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -left-16 -top-16 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
            <div className="absolute -bottom-16 -right-16 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
          </div>
          <div className="container mx-auto px-4 text-center">
            <h2 className="mb-4 text-2xl font-bold md:text-3xl">
              신규 회원 가입 시 10% 할인
            </h2>
            <p className="mb-6">
              지금 가입하고 첫 구매 때 10% 할인 혜택을 받아보세요.
            </p>
            <Button size="lg" variant="secondary" asChild>
              <Link href="/register">회원가입</Link>
            </Button>
          </div>
        </section>

        <HomeDeliveryMapSection />
      </main>

      <footer className="border-t bg-muted/50 py-8">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
            <div>
              <h3 className="mb-4 font-semibold">고객 서비스</h3>
              <ul className="space-y-2">
                <li>
                  <Link href="/help" className="text-sm text-muted-foreground hover:text-foreground">
                    고객센터
                  </Link>
                </li>
                <li>
                  <Link href="/faq" className="text-sm text-muted-foreground hover:text-foreground">
                    자주 묻는 질문
                  </Link>
                </li>
                <li>
                  <Link href="/shipping" className="text-sm text-muted-foreground hover:text-foreground">
                    배송 정보
                  </Link>
                </li>
                <li>
                  <Link href="/returns" className="text-sm text-muted-foreground hover:text-foreground">
                    교환 및 반품
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="mb-4 font-semibold">쇼핑하기</h3>
              <ul className="space-y-2">
                <li>
                  <Link href="/category/men" className="text-sm text-muted-foreground hover:text-foreground">
                    남성
                  </Link>
                </li>
                <li>
                  <Link href="/category/women" className="text-sm text-muted-foreground hover:text-foreground">
                    여성
                  </Link>
                </li>
                <li>
                  <Link href="/category/accessories" className="text-sm text-muted-foreground hover:text-foreground">
                    액세서리
                  </Link>
                </li>
                <li>
                  <Link href="/category/sale" className="text-sm text-muted-foreground hover:text-foreground">
                    세일
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="mb-4 font-semibold">회사 정보</h3>
              <ul className="space-y-2">
                <li>
                  <Link href="/about" className="text-sm text-muted-foreground hover:text-foreground">
                    회사 소개
                  </Link>
                </li>
                <li>
                  <Link href="/careers" className="text-sm text-muted-foreground hover:text-foreground">
                    채용 정보
                  </Link>
                </li>
                <li>
                  <Link href="/press" className="text-sm text-muted-foreground hover:text-foreground">
                    보도 자료
                  </Link>
                </li>
                <li>
                  <Link href="/sustainability" className="text-sm text-muted-foreground hover:text-foreground">
                    지속 가능성
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="mb-4 font-semibold">법적 고지</h3>
              <ul className="space-y-2">
                <li>
                  <Link href="/terms" className="text-sm text-muted-foreground hover:text-foreground">
                    이용약관
                  </Link>
                </li>
                <li>
                  <Link href="/privacy" className="text-sm text-muted-foreground hover:text-foreground">
                    개인정보처리방침
                  </Link>
                </li>
                <li>
                  <Link href="/cookies" className="text-sm text-muted-foreground hover:text-foreground">
                    쿠키 정책
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-8 border-t pt-8 text-center text-sm text-muted-foreground">
            <p>&copy; {new Date().getFullYear()} KUS 스타일. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
