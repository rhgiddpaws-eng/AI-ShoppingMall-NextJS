// =============================================================================
// 루트 레이아웃 (Root Layout)
// 모든 페이지 공통으로 테마, 전역 상태, 토스트를 연결합니다.
// =============================================================================

import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"

import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/sonner"
import { ShopProvider } from "@/lib/context/ShopContext"

// 본문 기본 폰트로 Inter를 사용합니다.
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" })

// 사이트 공통 메타데이터입니다.
export const metadata: Metadata = {
  title: "KUS 스타일 | 온라인 패션 쇼핑몰",
  description: "KUS 스타일에서 최신 트렌드 패션 아이템을 만나보세요.",
  generator: "v0.dev",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body className={inter.variable}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {/* 전역 상태와 토스트를 모든 페이지에서 사용하도록 최상단에 배치합니다. */}
          <ShopProvider>
            {children}
            <Toaster richColors />
          </ShopProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
