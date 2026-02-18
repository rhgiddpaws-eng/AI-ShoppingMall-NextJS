/**
 * requireAdminSession - Admin API 라우트용 인증 헬퍼
 * JWT(Authorization Bearer) 또는 세션(쿠키)으로 로그인 여부만 확인합니다.
 *
 * 현재 정책:
 * - 관리자 페이지는 "로그인한 모든 사용자(일반/SNS 포함)"에게 허용합니다.
 * - 즉, role 검사 없이 인증 성공 여부만 통과 기준으로 사용합니다.
 */

import { NextResponse } from "next/server"
import { getAuthFromRequest, type AuthUser } from "./authFromRequest"

/**
 * @param request - API 라우트의 request (JWT 헤더 또는 쿠키 포함)
 * @returns 성공 시 { auth }, 실패 시 { error: NextResponse } (401)
 */
export async function requireAdminSession(request: Request): Promise<
  | { auth: AuthUser }
  | { error: NextResponse }
> {
  const auth = await getAuthFromRequest(request)
  if (!auth || auth.id == null) {
    return { error: NextResponse.json({ message: "Unauthorized" }, { status: 401 }) }
  }

  // 로그인만 되어 있으면 Admin API 접근을 허용합니다.
  return { auth }
}
