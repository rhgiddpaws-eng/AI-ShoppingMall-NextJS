// =============================================================================
// Google OAuth 시작 - GET /api/auth/google
// Google 로그인 화면으로 리다이렉트
// =============================================================================

import { NextRequest, NextResponse } from 'next/server'

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
const SCOPE = 'email profile'

export async function GET(request: NextRequest) {
  // 배포 환경에서 환경변수 끝에 공백/개행이 섞여도 안전하게 제거합니다.
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim()
  if (!clientId) {
    return NextResponse.json({ error: 'Google OAuth not configured' }, { status: 503 })
  }
  // 운영 도메인을 고정하고 싶을 때 NEXT_PUBLIC_APP_URL을 우선 사용해 redirect_uri 불일치를 줄입니다.
  const appBaseUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() || request.nextUrl.origin
  const normalizedBaseUrl = appBaseUrl.replace(/\/$/, '')
  const redirectUri = `${normalizedBaseUrl}/api/auth/google/callback`
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: SCOPE,
    access_type: 'offline',
    prompt: 'consent',
  })
  const url = `${GOOGLE_AUTH_URL}?${params.toString()}`
  return NextResponse.redirect(url)
}
