/**
 * requireAdminSession - Admin API 라우트용 인증 헬퍼
 * JWT(Authorization Bearer) 또는 세션(쿠키)으로 사용자 조회 후 role === "ADMIN" 확인
 */

import { NextResponse } from "next/server"
import { getAuthFromRequest, type AuthUser } from "./authFromRequest"
import prismaClient from "@/lib/prismaClient"

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
  if (!auth || auth.id == null) {
    return { error: NextResponse.json({ message: "Unauthorized" }, { status: 401 }) }
  }

  // 세션 role 값이 오래된 경우를 대비해 DB role을 한 번 더 확인합니다.
  if (auth.role !== ADMIN_ROLE) {
    try {
      const user = await prismaClient.user.findUnique({
        where: { id: auth.id },
        select: { role: true },
      })

      if (user?.role !== ADMIN_ROLE) {
        return { error: NextResponse.json({ message: "Unauthorized" }, { status: 401 }) }
      }

      // 이후 로직에서 관리자 role을 일관되게 쓰도록 보정해서 반환합니다.
      return { auth: { ...auth, role: ADMIN_ROLE } }
    } catch {
      // 권한 확인 중 DB 오류가 나면 인증 실패 대신 서버 오류로 명확히 응답합니다.
      return { error: NextResponse.json({ message: "Admin role check failed" }, { status: 500 }) }
    }
  }

  return { auth }
}
