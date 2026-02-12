// =============================================================================
// Kakao OAuth 시작 - GET /api/auth/kakao
// 카카오 로그인 화면으로 리다이렉트
// =============================================================================

import { NextRequest, NextResponse } from 'next/server'

const KAKAO_AUTH_URL = 'https://kauth.kakao.com/oauth/authorize'
const SCOPE = 'profile_nickname account_email'

export async function GET(request: NextRequest) {
  const clientId = process.env.KAKAO_CLIENT_ID
  if (!clientId) {
    return NextResponse.json({ error: 'Kakao OAuth not configured' }, { status: 503 })
  }
  const origin = request.nextUrl.origin
  const redirectUri = `${origin}/api/auth/kakao/callback`
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: SCOPE,
  })
  const url = `${KAKAO_AUTH_URL}?${params.toString()}`
  return NextResponse.redirect(url)
}
