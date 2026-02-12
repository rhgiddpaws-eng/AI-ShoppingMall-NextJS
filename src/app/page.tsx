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

/**
 * 홈 페이지: 히어로(GIF/동영상/이미지 + 애니메이션), 카테고리, 인기/신상품
 * - GIF: NEXT_PUBLIC_HERO_GIF_URL 또는 HeroSection gifSrc
 * - 동영상: NEXT_PUBLIC_HERO_VIDEO_URL 또는 videoSrc (GIF 없을 때)
 */
export default function Home() {
  const heroGifSrc = typeof process.env.NEXT_PUBLIC_HERO_GIF_URL === "string"
    ? process.env.NEXT_PUBLIC_HERO_GIF_URL
    : undefined
  const heroVideoSrc = typeof process.env.NEXT_PUBLIC_HERO_VIDEO_URL === "string"
    ? process.env.NEXT_PUBLIC_HERO_VIDEO_URL
    : undefined

  return (
    <div className="flex flex-col min-h-screen">
      <NavBar />

      <main className="flex-1">
        <HeroSection gifSrc={heroGifSrc} videoSrc={heroVideoSrc} />

        {/* Categories: 남성/여성/액세서리/신발 카테고리 그리드 링크 */}
        <section className="py-12 container mx-auto px-4">
          <h2 className="text-2xl font-bold mb-6">카테고리</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link
              href="/category/men"
              className="group relative h-[180px] rounded-lg overflow-hidden"
            >
              <Image
                src="/category/men.webp"
                alt="남성"
                fill
                sizes="(max-width: 768px) 50vw, 25vw"
                className="object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute inset-0 bg-black/40 group-hover:bg-black/50 transition-colors flex items-center justify-center">
                <span className="text-white text-xl font-semibold">남성</span>
              </div>
            </Link>
            <Link
              href="/category/women"
              className="group relative h-[180px] rounded-lg overflow-hidden"
            >
              <Image
                src="/category/women.webp"
                alt="여성"
                fill
                sizes="(max-width: 768px) 50vw, 25vw"
                className="object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute inset-0 bg-black/40 group-hover:bg-black/50 transition-colors flex items-center justify-center">
                <span className="text-white text-xl font-semibold">여성</span>
              </div>
            </Link>
            <Link
              href="/category/accessories"
              className="group relative h-[180px] rounded-lg overflow-hidden"
            >
              <Image
                src="/category/accessories.webp"
                alt="액세서리"
                fill
                sizes="(max-width: 768px) 50vw, 25vw"
                className="object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute inset-0 bg-black/40 group-hover:bg-black/50 transition-colors flex items-center justify-center">
                <span className="text-white text-xl font-semibold">
                  액세서리
                </span>
              </div>
            </Link>
            <Link
              href="/category/shoes"
              className="group relative h-[180px] rounded-lg overflow-hidden"
            >
              <Image
                src="/category/shoes.webp"
                alt="신발"
                fill
                sizes="(max-width: 768px) 50vw, 25vw"
                className="object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute inset-0 bg-black/40 group-hover:bg-black/50 transition-colors flex items-center justify-center">
                <span className="text-white text-xl font-semibold">신발</span>
              </div>
            </Link>
          </div>
        </section>

        {/* Featured Products: 인기 상품 섹션 (배경 muted) */}
        <section className="py-12 bg-muted">
          <div className="container mx-auto px-4">
            <h2 className="text-2xl font-bold mb-6">인기 상품</h2>
            <FeaturedProducts />
          </div>
        </section>

        {/* New Arrivals: 신상품 목록 + "더 보기" 버튼 */}
        <section className="py-12 container mx-auto px-4">
          <h2 className="text-2xl font-bold mb-6">신상품</h2>
          <NewProducts />
          <div className="mt-8 text-center">
            <Button size="lg" variant="outline" asChild>
              <Link href="/category/new">더 보기</Link>
            </Button>
          </div>
        </section>

        {/* Promotion Banner: 신규 회원 10% 할인 CTA */}
        <section className="py-12 bg-primary text-primary-foreground">
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
