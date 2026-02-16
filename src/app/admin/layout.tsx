// =============================================================================
// 관리자 레이아웃 - /admin 하위 모든 페이지
// 레이아웃(Server Component)에서는 cookies()가 비어 있어 세션을 읽지 못하는 경우가 있음.
// 따라서 AdminGuard(Client)에서 GET /api/admin/me 로 관리자 여부를 검사하고,
// 비관리자면 / 로 리다이렉트, 관리자면 사이드바 + children 렌더.
// =============================================================================

import type React from "react"
import { AdminSidebar } from "@/components/admin/sidebar"
import { AdminGuard } from "@/components/admin/AdminGuard"

export const dynamic = "force-dynamic"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AdminGuard>
      <div className="flex h-screen">
        <div className="w-64 hidden md:block">
          <AdminSidebar />
        </div>
        <div className="flex-1 overflow-auto">
          <div className="p-6">{children}</div>
        </div>
      </div>
    </AdminGuard>
  )
}
