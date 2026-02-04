import { NextResponse } from "next/server"
import { getSession } from "./ironSessionControl"

const ADMIN_ROLE = "ADMIN"

/**
 * [admin API 접근 제어]
 * API Route는 Node 런타임에서 실행되므로 getSession()이 정상 동작함.
 * middleware(Edge)에서는 getSession 불가 → /api/admin/* 각 라우트에서 이 헬퍼로 관리자 여부 확인 후,
 * 비관리자면 401 반환. 보안은 layout(페이지) + 이 헬퍼(API)로 동일하게 유지됨.
 */
export async function requireAdminSession(): Promise<
  | { session: Awaited<ReturnType<typeof getSession>> }
  | { error: NextResponse }
> {
  const session = await getSession()
  if (session.role !== ADMIN_ROLE) {
    return { error: NextResponse.json({ message: "Unauthorized" }, { status: 401 }) }
  }
  return { session }
}
