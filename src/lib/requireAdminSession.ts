/**
 * requireAdminSession - Admin API 라우트용 인증 헬퍼
 *
 * [기능]
 * - API Route(Node 런타임)에서 getSession()으로 세션 조회 후 role === "ADMIN" 확인
 * - 비관리자면 401 Unauthorized 반환; 관리자면 session 객체 반환
 *
 * [배경]
 * - Next.js middleware는 Edge 런타임이라 iron-session의 getSession 사용 불가
 * - 따라서 /api/admin/* 각 라우트에서 이 함수를 호출해 관리자 여부 검사
 *
 * [문법]
 * - Awaited<ReturnType<typeof getSession>>: getSession()의 
 *   Promise 반환 타입을 풀어서 사용
 * - 반환: 성공 시 { session }, 실패 시 { error: NextResponse } (구별해 분기 처리)
 */

import { NextResponse } from "next/server"
import { getSession } from "./ironSessionControl"

const ADMIN_ROLE = "ADMIN"

/**
 * 세션을 가져와 role이 ADMIN인지 확인.
 * @returns 성공 시 { session }, 실패 시 { error: NextResponse } (401)
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
