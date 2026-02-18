// =============================================================================
// GET /api/admin/me - JWT 또는 세션으로 로그인 여부 확인
// =============================================================================

import { NextResponse } from "next/server"
import { getAuthFromRequest } from "@/lib/authFromRequest"
// admin/me도 같은 리전에 배치해 관리자 진입 시 선행 인증 지연을 줄입니다.
export const preferredRegion = "syd1"

export async function GET(request: Request) {
  const auth = await getAuthFromRequest(request)
  // 관리자 페이지 정책상 "로그인한 사용자"면 모두 접근 가능하므로
  // 여기서는 role이 아닌 인증 성공 여부만 검사합니다.
  if (!auth || auth.id == null) {
    return NextResponse.json({ ok: false }, { status: 401 })
  }

  return NextResponse.json({
    ok: true,
    user: { id: auth.id, email: auth.email, role: auth.role },
  })
}
