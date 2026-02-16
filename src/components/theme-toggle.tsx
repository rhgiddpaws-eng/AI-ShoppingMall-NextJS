"use client"

/**
 * ThemeToggle — 라이트/다크/시스템 테마 선택 드롭다운
 *
 * [모양]
 * - 버튼: Sun 아이콘(라이트 시) / Moon 아이콘(다크 시)
 * - next-themes: 라이트일 때 Sun 표시, 다크일 때 Moon 표시 (rotate/scale로 전환)
 * - 클릭 시 드롭다운: "라이트", "다크", "시스템" 메뉴, align="end"
 * - sr-only: "테마 변경"
 *
 * [기능]
 * - useTheme().setTheme("light"|"dark"|"system") 호출
 * - 시스템: OS 설정 따름
 *
 * [문법]
 * - DropdownMenuTrigger asChild: Button을 트리거로 사용
 * - Sun/Moon: dark: 시 클래스로 표시 전환 (scale-0/scale-100, rotate)
 *
 * [라이브러리 연계]
 * - next-themes: useTheme (setTheme)
 * - lucide-react: Moon, Sun
 * - @/components/ui/button: Button
 * - @/components/ui/dropdown-menu: DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger (shadcn)
 */

import { useTheme } from "next-themes"
import { Moon, Sun } from "lucide-react"

import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

export function ThemeToggle() {
  const { setTheme } = useTheme()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">테마 변경</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme("light")}>라이트</DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")}>다크</DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("system")}>시스템</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

