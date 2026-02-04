import type React from "react"
import { redirect } from "next/navigation"
import { getIronSession } from "iron-session"
import { cookies } from "next/headers"
import { AdminSidebar } from "@/components/admin/sidebar"
import type { SessionData } from "@/lib/session"
import { sessionOptions } from "@/lib/session"

/**
 * [admin 페이지 접근 제어]
 * Layout(Node)에서 getIronSession(cookies())로 세션 읽음. 관리자만 통과, 비관리자는 redirect("/").
 * 관리자인데 접근이 안 되면 → 로그인 시 쿠키가 저장·전달되도록 credentials 확인, DB role=ADMIN 확인.
 */
export const dynamic = "force-dynamic"

const ADMIN_ROLE = "ADMIN"

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const cookieStore = await cookies()
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions)
  const isAdmin = session.isLoggedIn === true && session.role === ADMIN_ROLE

  if (!isAdmin) {
    redirect("/")
  }

  return (
    <div className="flex h-screen">
      <div className="w-64 hidden md:block">
        <AdminSidebar />
      </div>
      <div className="flex-1 overflow-auto">
        <div className="p-6">{children}</div>
      </div>
    </div>
  )
}

