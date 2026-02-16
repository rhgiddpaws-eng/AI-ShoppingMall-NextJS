// =============================================================================
// Google OAuth 시작 - GET /api/auth/google
// Google 로그인 화면으로 리다이렉트
// =============================================================================

import { NextRequest, NextResponse } from 'next/server'

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
const SCOPE = 'email profile'

export async function GET(request: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID
  if (!clientId) {
    return NextResponse.json({ error: 'Google OAuth not configured' }, { status: 503 })
  }
  const origin = request.nextUrl.origin
  const redirectUri = `${origin}/api/auth/google/callback`
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
