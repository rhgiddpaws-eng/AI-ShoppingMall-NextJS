// =============================================================================
// GET /api/admin/me - JWT 또는 세션으로 관리자 여부 확인
// =============================================================================

import { NextResponse } from "next/server"
import { getAuthFromRequest } from "@/lib/authFromRequest"
import prismaClient from "@/lib/prismaClient"

const ADMIN_ROLE = "ADMIN"

export async function GET(request: Request) {
  const auth = await getAuthFromRequest(request)
  let isAdmin = auth?.role === ADMIN_ROLE

  if (!isAdmin && auth?.id != null) {
    const user = await prismaClient.user.findUnique({
      where: { id: auth.id },
      select: { role: true },
    })
    if (user?.role === "ADMIN") isAdmin = true
  }

  if (!isAdmin || !auth) {
    return NextResponse.json({ ok: false }, { status: 401 })
  }

  return NextResponse.json({
    ok: true,
    user: { id: auth.id, email: auth.email, role: auth.role },
  })
}
