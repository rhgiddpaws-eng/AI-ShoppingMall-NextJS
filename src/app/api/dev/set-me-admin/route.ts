/**
 * 개발 전용: 로그인된 사용자의 role을 DB에서 ADMIN으로 설정.
 * GET 호출 한 번으로 설정 후 /admin 접근 가능 (NODE_ENV === 'development' 일 때만 동작).
 */
import { NextResponse } from "next/server"
import { getAuthFromRequest } from "@/lib/authFromRequest"
import prismaClient from "@/lib/prismaClient"

export async function GET(request: Request) {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Not available" }, { status: 404 })
  }

  const auth = await getAuthFromRequest(request)
  if (!auth?.id) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 })
  }

  const userId = auth.id
  if (Number.isNaN(userId)) {
    return NextResponse.json({ error: "Invalid session" }, { status: 400 })
  }

  await prismaClient.user.update({
    where: { id: userId },
    data: { role: "ADMIN" },
  })

  return NextResponse.json({
    ok: true,
    message: "이 계정이 ADMIN으로 설정되었습니다. /admin 에 접속하세요.",
  })
}
