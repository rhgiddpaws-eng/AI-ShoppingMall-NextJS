// =============================================================================
// Kakao OAuth 시작 - GET /api/auth/kakao
// 카카오 로그인 화면으로 리다이렉트
// =============================================================================

import { NextRequest, NextResponse } from 'next/server'

const KAKAO_AUTH_URL = 'https://kauth.kakao.com/oauth/authorize'
// KOE205 방지를 위해 이메일 동의 항목을 강제하지 않고 닉네임만 요청한다.
// 이메일이 없을 때는 콜백에서 kakao_{id}@kakao.local 대체값을 사용한다.
const SCOPE = 'profile_nickname'

export async function GET(request: NextRequest) {
  // 카카오 OAuth client_id는 REST API 키 변수 하나만 사용한다.
  // 배포 환경에서 환경변수 끝 공백/개행으로 client_id가 오염되는 문제를 방지합니다.
  const clientId = process.env.KAKAO_REST_API_KEY?.trim()
  if (!clientId) {
    return NextResponse.json({ error: 'Kakao OAuth not configured' }, { status: 503 })
  }
  // 운영 도메인을 고정하고 싶을 때 NEXT_PUBLIC_APP_URL을 우선 사용해 redirect_uri 불일치를 줄입니다.
  const appBaseUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() || request.nextUrl.origin
  const normalizedBaseUrl = appBaseUrl.replace(/\/$/, '')
  const redirectUri = `${normalizedBaseUrl}/api/auth/kakao/callback`
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: SCOPE,
  })
  const url = `${KAKAO_AUTH_URL}?${params.toString()}`
  return NextResponse.redirect(url)
}
