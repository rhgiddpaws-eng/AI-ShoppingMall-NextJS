"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

const ADMIN_ME_URL = "/api/admin/me"

/**
 * 레이아웃에서 cookies()가 비어 있을 때 대비.
 * 클라이언트에서 GET /api/admin/me (credentials: include)로 관리자 여부 확인 후,
 * 비관리자면 / 로 리다이렉트, 관리자면 children 렌더.
 */
export function AdminGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [allowed, setAllowed] = useState<boolean | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch(ADMIN_ME_URL, { credentials: "include" })
      .then((res) => {
        if (cancelled) return
        if (res.ok) {
          setAllowed(true)
        } else {
          setAllowed(false)
          router.replace("/")
        }
      })
      .catch(() => {
        if (!cancelled) {
          setAllowed(false)
          router.replace("/")
        }
      })
    return () => {
      cancelled = true
    }
  }, [router])

  if (allowed === null) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-muted-foreground">관리자 확인 중...</p>
      </div>
    )
  }

  if (!allowed) {
    return null
  }

  return <>{children}</>
}
