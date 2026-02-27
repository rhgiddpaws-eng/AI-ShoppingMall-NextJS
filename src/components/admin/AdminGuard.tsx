"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

const ADMIN_ME_URL = "/api/admin/me"

// 인증 결과를 메모리에 캐싱해 페이지 전환마다 /api/admin/me 를 다시 호출하지 않도록 합니다.
let cachedAllowed: boolean | null = null
// 캐시 유효 시간(ms) — 5분 동안은 재검증 없이 통과시킵니다.
const CACHE_TTL_MS = 5 * 60 * 1000
let cachedAt = 0

/**
 * 레이아웃에서 cookies()가 비어 있을 때 대비.
 * 클라이언트에서 GET /api/admin/me (credentials: include)로 로그인 여부 확인 후,
 * 비로그인이면 /login 으로 리다이렉트, 로그인 상태면 children 렌더.
 */
export function AdminGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [allowed, setAllowed] = useState<boolean | null>(cachedAllowed)

  useEffect(() => {
    // 캐시가 아직 유효하면 네트워크 요청을 건너뜁니다.
    if (cachedAllowed === true && Date.now() - cachedAt < CACHE_TTL_MS) {
      setAllowed(true)
      return
    }

    let cancelled = false
    fetch(ADMIN_ME_URL, { credentials: "include" })
      .then((res) => {
        if (cancelled) return
        if (res.ok) {
          cachedAllowed = true
          cachedAt = Date.now()
          setAllowed(true)
        } else {
          cachedAllowed = false
          setAllowed(false)
          // 로그인 후 다시 관리자 화면으로 돌아올 수 있게 returnUrl을 함께 전달합니다.
          router.replace("/login?returnUrl=/admin")
        }
      })
      .catch(() => {
        if (!cancelled) {
          cachedAllowed = false
          setAllowed(false)
          // 네트워크 오류 시에도 관리자 페이지를 무한 대기시키지 않고 로그인 화면으로 보냅니다.
          router.replace("/login?returnUrl=/admin")
        }
      })
    return () => {
      cancelled = true
    }
  }, [router])

  if (allowed === false) {
    // 권한 없을 때는 즉시 리다이렉트가 걸리므로 빈 화면만 반환합니다.
    return null
  }

  // 권한 확인 전에도 children을 먼저 렌더링해 초기 화면 지연을 줄입니다.
  return <>{children}</>
}
