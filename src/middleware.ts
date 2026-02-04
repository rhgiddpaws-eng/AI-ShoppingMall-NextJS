import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * [왜 middleware에서 admin 체크를 하지 않는가]
 *
 * Next.js는 두 가지 런타임을 씀:
 * - Node: API Route, Server Component, Layout 등 → cookies(), DB(Prisma), getSession() 등 사용 가능
 * - Edge: middleware만 → 가벼운 런타임(V8 격리), Node 전부가 아님
 *
 * middleware는 항상 Edge에서만 실행됨.
 * getSession()은 iron-session + next/headers의 cookies()를 쓰고, iron-session은 Node crypto로
 * 세션 쿠키를 복호화함. Edge에는 Node crypto가 없거나 제한되어 있어서
 * middleware 안에서 getSession()을 호출하면 동작하지 않음(에러 또는 항상 빈 세션).
 * → "Edge에서 getSession 불가" = middleware(Edge 런타임)에서는 getSession()이 제대로 동작하지 않는다는 뜻.
 *
 * 따라서 admin 보호는 여기서 하지 않고,
 * - /admin 페이지: src/app/admin/layout.tsx (Node)에서 getSession() 후 redirect
 * - /api/admin: 각 API 라우트에서 requireAdminSession() (Node)으로 처리.
 */
export function middleware(_request: NextRequest) {
  return NextResponse.next()
}
