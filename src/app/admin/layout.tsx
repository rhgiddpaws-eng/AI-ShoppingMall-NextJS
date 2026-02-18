// =============================================================================
// 관리자 레이아웃 - /admin 하위 모든 페이지
// 인증 확인은 AdminGuard(Client)에서 처리합니다.
// 이 레이아웃은 서버 동적 데이터가 없으므로 force-dynamic을 제거해
// 라우트 전환 시 불필요한 서버 작업을 줄이고 체감 속도를 개선합니다.
// =============================================================================

import type React from "react"
import { AdminSidebar } from "@/components/admin/sidebar"
import { AdminGuard } from "@/components/admin/AdminGuard"

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
