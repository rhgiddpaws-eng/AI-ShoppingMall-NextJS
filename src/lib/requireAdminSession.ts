/**
 * requireAdminSession - Admin API 라우트용 인증 헬퍼
 * JWT(Authorization Bearer) 또는 세션(쿠키)으로 사용자 조회 후 role === "ADMIN" 확인
 */

import { NextResponse } from "next/server"
import { getAuthFromRequest, type AuthUser } from "./authFromRequest"

const ADMIN_ROLE = "ADMIN"

/**
 * @param request - API 라우트의 request (JWT 헤더 또는 쿠키 포함)
 * @returns 성공 시 { auth }, 실패 시 { error: NextResponse } (401)
 */
export async function requireAdminSession(request: Request): Promise<
  | { auth: AuthUser }
  | { error: NextResponse }
> {
  const auth = await getAuthFromRequest(request)
  if (!auth || auth.role !== ADMIN_ROLE) {
    return { error: NextResponse.json({ message: "Unauthorized" }, { status: 401 }) }
  }
  return { auth }
}
