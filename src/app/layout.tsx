// =============================================================================
// 루트 레이아웃 (Root Layout)
// Next.js App Router에서 모든 페이지를 감싸는 최상위 레이아웃 컴포넌트
// =============================================================================

import type React from 'react'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from '@/components/ui/sonner'
import { ShopProvider } from '@/lib/context/ShopContext'

/** Google Inter 폰트 설정 (라틴 서브셋) */
// 라틴 텍스트는 Inter를 사용하고, 한글은 전역 CSS 폴백 폰트로 안정적으로 표시합니다.
const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

/** SEO·메타데이터: 문서 제목, 설명, 생성기 정보 */
export const metadata: Metadata = {
  title: 'ASOS Style | 온라인 패션 쇼핑몰',
  description: '최신 트렌드의 패션 아이템을 만나보세요',
  generator: 'v0.dev',
}

/**
 * 루트 레이아웃
 * - html/body 래퍼, 다크/라이트 테마, 쇼핑 컨텍스트, 토스트 알림 제공
 */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko" suppressHydrationWarning>
      {/* 폰트 변수 클래스를 body에 넣어 전역 폴백 폰트 체인을 함께 적용합니다. */}
      <body className={inter.variable}>
        {/* 테마 제공: 다크/라이트/시스템, 클래스 기반, 전환 애니메이션 비활성화 */}
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {/* 쇼핑몰 전역 상태 (장바구니, 위시리스트 등) */}
          <ShopProvider>
            {children}
            {/* 토스트 알림 (성공/에러 등) */}
            <Toaster richColors />
          </ShopProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
