// =============================================================================
// 세션 보정 API - GET /api/auth/refresh-session?then=/admin
// 로그인된 사용자의 세션에 role이 없을 때 DB에서 role을 조회해 쿠키에 반영.
// Route Handler이므로 session.save() 시 Set-Cookie가 응답에 붙음.
// =============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/ironSessionControl'
import prismaClient from '@/lib/prismaClient'

const ADMIN_ROLE = 'ADMIN'

export async function GET(request: NextRequest) {
  const thenPath = request.nextUrl.searchParams.get('then') ?? '/'

  const session = await getSession()

  if (!session.isLoggedIn || session.id == null) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  if (session.role === ADMIN_ROLE) {
    return NextResponse.redirect(new URL(thenPath, request.url))
  }

  const user = await prismaClient.user.findUnique({
    where: { id: session.id },
    select: { role: true },
  })

  if (user?.role === 'ADMIN') {
    session.role = ADMIN_ROLE
    await session.save()
  }

  return NextResponse.redirect(new URL(thenPath, request.url))
}
