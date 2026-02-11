// =============================================================================
// GET /api/admin/me - 현재 요청의 세션으로 관리자 여부 확인 (쿠키는 API에서 정상 수신)
// 레이아웃에서 cookies()가 비어 있을 때 대비해, 클라이언트가 이 API를 호출해 검사용으로 사용.
// =============================================================================

import { NextResponse } from "next/server"
import { getSession } from "@/lib/ironSessionControl"
import prismaClient from "@/lib/prismaClient"

const ADMIN_ROLE = "ADMIN"

export async function GET() {
  const session = await getSession()

  let isAdmin = session.isLoggedIn === true && session.role === ADMIN_ROLE

  if (!isAdmin && session.isLoggedIn === true && session.id != null) {
    const userId = typeof session.id === "number" ? session.id : Number(session.id)
    if (!Number.isNaN(userId)) {
      const user = await prismaClient.user.findUnique({
        where: { id: userId },
        select: { role: true },
      })
      if (user?.role === "ADMIN") isAdmin = true
    }
  }

  if (!isAdmin) {
    return NextResponse.json({ ok: false }, { status: 401 })
  }

  return NextResponse.json({
    ok: true,
    user: {
      id: session.id,
      email: session.email,
      role: session.role,
    },
  })
}
