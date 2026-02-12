/**
 * middleware.ts - Next.js Edge 미들웨어
 *
 * [기능]
 * - 모든 요청(페이지/API)이 서버에 도달하기 전에 이 함수가 한 번 실행됨
 * - 현재는 아무 제한 없이 NextResponse.next()로 요청을 그대로 통과시킴
 * - 추후 matcher로 특정 경로만 걸러서, 리다이렉트·헤더 추가·A/B 테스트 등 확장 가능
 *
 * [문법]
 * - 파일명/위치: src/middleware.ts (또는 src/middleware.js). Next.js가 자동으로 인식
 * - export function middleware(request): 
 * - 함수 이름이 반드시 "middleware". request는 NextRequest 타입
 * - NextResponse.next(): 다음 핸들러(라우트/API)로 요청을 넘김. 
 * - 리다이렉트하려면 NextResponse.redirect() 등 사용
 * - Edge 런타임: Node API(crypto, fs 등) 사용 불가 → 아래 주석처럼 getSession() 불가
 */

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
 * getSession()은 iron-session + next/headers의 cookies()를 쓰고, 
 * iron-session은 Node crypto로 세션 쿠키를 복호화함. 
 * Edge에는 Node crypto가 없거나 제한되어 있어서
 * middleware 안에서 getSession()을 호출하면 동작하지 않음(에러 또는 항상 빈 세션).
 * → "Edge에서 getSession 불가" = middleware(Edge 런타임)에서는 getSession()이 제대로 동작하지 않는다는 뜻.
 *
 * 따라서 admin 보호는 여기서 하지 않고,
 * - /admin 페이지: src/app/admin/layout.tsx (Node)에서 getSession() 후 redirect
 * - /api/admin: 각 API 라우트에서 requireAdminSession() (Node)으로 처리.
 */
export function middleware(_request: NextRequest) {
  /** _request: 사용하지 않는 매개변수는 _ 접두사로 표시 (lint 규칙). 
   * NextRequest에는 url, cookies, headers 등 포함 */
  return NextResponse.next()
}
