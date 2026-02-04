import type React from 'react'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from '@/components/ui/sonner'
import { ShopProvider } from '@/lib/context/ShopContext'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'ASOS Style | 온라인 패션 쇼핑몰',
  description: '최신 트렌드의 패션 아이템을 만나보세요',
  generator: 'v0.dev',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <ShopProvider>
            {children}
            <Toaster richColors />
          </ShopProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}

import './globals.css'
