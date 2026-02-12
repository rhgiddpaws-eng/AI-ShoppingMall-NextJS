// =============================================================================
// 현재 세션 → 사용자 정보 + JWT 반환 (GET /api/auth/me)
// OAuth 콜백 후 클라이언트가 세션 쿠키로 이 API를 호출해 스토어에 user/token 반영
// =============================================================================

import { NextResponse } from 'next/server'
import { getSession } from '@/lib/ironSessionControl'
import { signJwt } from '@/lib/jwt'
import prismaClient from '@/lib/prismaClient'

export type AuthMeResponse = {
  ok: boolean
  user?: { id: number; name?: string; email: string; role?: string }
  token?: string
  error?: string
}

export async function GET() {
  const session = await getSession()
  if (!session.isLoggedIn || session.id == null) {
    return NextResponse.json<AuthMeResponse>({ ok: false, error: 'not_logged_in' }, { status: 401 })
  }

  const user = await prismaClient.user.findUnique({
    where: { id: session.id },
    select: { id: true, email: true, name: true, role: true },
  })
  if (!user) {
    return NextResponse.json<AuthMeResponse>({ ok: false, error: 'user_not_found' }, { status: 401 })
  }

  const token = await signJwt({
    sub: String(user.id),
    email: user.email,
    name: user.name ?? undefined,
    role: String(user.role),
  })

  return NextResponse.json<AuthMeResponse>({
    ok: true,
    user: {
      id: user.id,
      email: user.email,
      name: user.name ?? undefined,
      role: String(user.role),
    },
    token,
  })
}
