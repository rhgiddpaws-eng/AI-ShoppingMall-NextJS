"use client"

/**
 * ThemeProvider — 앱 전체 다크/라이트 테마 래퍼
 *
 * [모양]
 * - UI 없음. 자식만 감싸서 next-themes 컨텍스트 제공
 *
 * [기능]
 * - next-themes의 ThemeProvider를 그대로 래핑
 * - 루트 레이아웃에서 사용 시 전체 앱이 theme, setTheme, resolvedTheme 사용 가능
 * - SSR 시 className 깜빡임 방지(next-themes 기본 동작)
 *
 * [문법]
 * - ThemeProviderProps: next-themes 타입 (defaultTheme, storageKey, attribute 등)
 * - ...props 로 next-themes 옵션 전달
 *
 * [라이브러리 연계]
 * - next-themes: ThemeProvider (as NextThemesProvider), ThemeProviderProps
 * - 보통 layout.tsx에서 <ThemeProvider attribute="class" ...> 로 사용
 */

import { ThemeProvider as NextThemesProvider } from "next-themes"
import type { ThemeProviderProps } from "next-themes"

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}

