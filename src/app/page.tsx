// =============================================================================
// 메인 페이지 (홈)
// 쇼핑몰 랜딩: 히어로 배너, 카테고리, 인기/신상품, 프로모션, 푸터
// =============================================================================

import Link from 'next/link'
import Image from 'next/image'

import { Button } from '@/components/ui/button'
import { FeaturedProducts } from '@/components/featured-products'
import { HeroSection } from '@/components/hero-section'
import { NavBar } from '@/components/NavBar'
import { NewProducts } from '@/components/new-products'
import { HomeDeliveryMapSection } from '@/components/home-delivery-map-section'
import { CategoryCard } from '@/components/category-card'

/**
 * 홈 페이지: 히어로(GIF/동영상/이미지 + 애니메이션), 카테고리, 인기/신상품
 * - GIF: NEXT_PUBLIC_HERO_GIF_URL 또는 HeroSection gifSrc
 * - 동영상: NEXT_PUBLIC_HERO_VIDEO_URL 또는 videoSrc (GIF 없을 때)
 */
export default function Home() {
  const heroGifSrc = typeof process.env.NEXT_PUBLIC_HERO_GIF_URL === "string"
    ? process.env.NEXT_PUBLIC_HERO_GIF_URL
    : undefined
  // 사용자가 요청한 로컬 비디오 파일 경로 사용
  const heroVideoSrc = "/main/1.mp4"

  return (
    <div className="flex flex-col min-h-screen">
      <NavBar />

      <main className="flex-1 bg-gradient-to-b from-background via-background to-muted/20">
        <HeroSection gifSrc={heroGifSrc} videoSrc={heroVideoSrc} />

        {/* Categories: 남성/여성/액세서리/신발 카테고리 그리드 링크 */}
        <section className="py-12 container mx-auto px-4">
          <div className="mb-6">
            <p className="text-xs font-semibold tracking-[0.16em] uppercase text-muted-foreground">Shop By Edit</p>
            <h2 className="text-2xl md:text-3xl font-bold mt-1">카테고리</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <CategoryCard
              href="/category/men"
              label="남성"
              images={["/category/men.png", "/category/men2.png"]}
            />
            <CategoryCard
              href="/category/women"
              label="여성"
              images={["/category/women.png", "/category/women2.png"]}
            />
            <CategoryCard
              href="/category/accessories"
              label="액세서리"
              images={["/category/accessories.png", "/category/accessories2.png"]}
            />
            <CategoryCard
              href="/category/shoes"
              label="신발"
              images={["/category/shoes.png", "/category/shoes2.png"]}
            />
          </div>
        </section>

        {/* Featured Products: 인기 상품 섹션 (배경 muted) */}
        <section className="py-12 bg-gradient-to-r from-muted/50 via-muted to-muted/40 border-y">
          <div className="container mx-auto px-4">
            <div className="mb-6">
              <p className="text-xs font-semibold tracking-[0.16em] uppercase text-muted-foreground">Best Picks</p>
              <h2 className="text-2xl md:text-3xl font-bold mt-1">인기 상품</h2>
            </div>
            <FeaturedProducts />
          </div>
        </section>

        {/* New Arrivals: 신상품 목록 + "더 보기" 버튼 */}
        <section className="py-12 container mx-auto px-4">
          <div className="mb-6">
            <p className="text-xs font-semibold tracking-[0.16em] uppercase text-muted-foreground">Latest Drop</p>
            <h2 className="text-2xl md:text-3xl font-bold mt-1">신상품</h2>
          </div>
          <NewProducts />
          <div className="mt-8 text-center">
            <Button size="lg" variant="outline" asChild>
              <Link href="/category/new">더 보기</Link>
            </Button>
          </div>
        </section>

        {/* Promotion Banner: 신규 회원 10% 할인 CTA */}
        <section className="py-12 bg-primary text-primary-foreground relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute -left-16 -top-16 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
            <div className="absolute -right-16 -bottom-16 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
          </div>
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-2xl md:text-3xl font-bold mb-4">
              신규 회원 가입 시 10% 할인
            </h2>
            <p className="mb-6">
              지금 가입하고 첫 구매 시 10% 할인 혜택을 받아보세요.
            </p>
            <Button size="lg" variant="secondary" asChild>
              <Link href="/register">회원가입</Link>
            </Button>
          </div>
        </section>

        <HomeDeliveryMapSection />
      </main>

      {/* 푸터: 4열 링크 그룹(고객서비스/쇼핑/회사/법적고지) + 저작권 */}
      <footer className="border-t py-8 bg-muted/50">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h3 className="font-semibold mb-4">고객 서비스</h3>
              <ul className="space-y-2">
                <li>
                  <Link
                    href="/help"
                    className="text-sm text-muted-foreground hover:text-foreground"
                  >
                    고객센터
                  </Link>
                </li>
                <li>
                  <Link
                    href="/faq"
                    className="text-sm text-muted-foreground hover:text-foreground"
                  >
                    자주 묻는 질문
                  </Link>
                </li>
                <li>
                  <Link
                    href="/shipping"
                    className="text-sm text-muted-foreground hover:text-foreground"
                  >
                    배송 정보
                  </Link>
                </li>
                <li>
                  <Link
                    href="/returns"
                    className="text-sm text-muted-foreground hover:text-foreground"
                  >
                    교환 및 반품
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">쇼핑하기</h3>
              <ul className="space-y-2">
                <li>
                  <Link
                    href="/category/men"
                    className="text-sm text-muted-foreground hover:text-foreground"
                  >
                    남성
                  </Link>
                </li>
                <li>
                  <Link
                    href="/category/women"
                    className="text-sm text-muted-foreground hover:text-foreground"
                  >
                    여성
                  </Link>
                </li>
                <li>
                  <Link
                    href="/category/accessories"
                    className="text-sm text-muted-foreground hover:text-foreground"
                  >
                    액세서리
                  </Link>
                </li>
                <li>
                  <Link
                    href="/category/sale"
                    className="text-sm text-muted-foreground hover:text-foreground"
                  >
                    세일
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">회사 정보</h3>
              <ul className="space-y-2">
                <li>
                  <Link
                    href="/about"
                    className="text-sm text-muted-foreground hover:text-foreground"
                  >
                    회사 소개
                  </Link>
                </li>
                <li>
                  <Link
                    href="/careers"
                    className="text-sm text-muted-foreground hover:text-foreground"
                  >
                    채용 정보
                  </Link>
                </li>
                <li>
                  <Link
                    href="/press"
                    className="text-sm text-muted-foreground hover:text-foreground"
                  >
                    보도 자료
                  </Link>
                </li>
                <li>
                  <Link
                    href="/sustainability"
                    className="text-sm text-muted-foreground hover:text-foreground"
                  >
                    지속 가능성
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">법적 고지</h3>
              <ul className="space-y-2">
                <li>
                  <Link
                    href="/terms"
                    className="text-sm text-muted-foreground hover:text-foreground"
                  >
                    이용약관
                  </Link>
                </li>
                <li>
                  <Link
                    href="/privacy"
                    className="text-sm text-muted-foreground hover:text-foreground"
                  >
                    개인정보처리방침
                  </Link>
                </li>
                <li>
                  <Link
                    href="/cookies"
                    className="text-sm text-muted-foreground hover:text-foreground"
                  >
                    쿠키 정책
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t text-center text-sm text-muted-foreground">
            <p>
              &copy; {new Date().getFullYear()} ASOS Style. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
