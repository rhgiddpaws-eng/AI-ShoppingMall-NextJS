import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // 현재는 모든 요청을 그대로 통과시켜 리다이렉트 루프를 방지합니다.
  void request
  return NextResponse.next()
}
