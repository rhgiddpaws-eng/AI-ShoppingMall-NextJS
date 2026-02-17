// =============================================================================
// Google OAuth 콜백 - GET /api/auth/google/callback?code=...
// code로 토큰 교환 → 사용자 정보 조회 → findOrCreate User → 세션 + 리다이렉트
// =============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/ironSessionControl'
import { signJwt } from '@/lib/jwt'
import prismaClient from '@/lib/prismaClient'

const TOKEN_URL = 'https://oauth2.googleapis.com/token'
const USERINFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo'

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code')
  // 로그인 시작 라우트와 동일하게 NEXT_PUBLIC_APP_URL 우선 사용으로 도메인 불일치를 줄입니다.
  const appBaseUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() || request.nextUrl.origin
  const normalizedBaseUrl = appBaseUrl.replace(/\/$/, '')
  const loginPath = `${normalizedBaseUrl}/login`
  const successRedirect = `${normalizedBaseUrl}/login?oauth=success`

  if (!code) {
    return NextResponse.redirect(new URL(`${loginPath}?error=no_code`, request.url))
  }

  // 배포 환경에서 환경변수 끝 공백/개행으로 OAuth가 깨지는 문제를 방지합니다.
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim()
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim()
  if (!clientId || !clientSecret) {
    return NextResponse.redirect(new URL(`${loginPath}?error=config`, request.url))
  }

  const redirectUri = `${normalizedBaseUrl}/api/auth/google/callback`
  const tokenRes = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  })

  if (!tokenRes.ok) {
    const err = await tokenRes.text()
    console.error('Google token error:', err)
    return NextResponse.redirect(new URL(`${loginPath}?error=token`, request.url))
  }

  const tokenData = (await tokenRes.json()) as { access_token?: string }
  const accessToken = tokenData.access_token
  if (!accessToken) {
    return NextResponse.redirect(new URL(`${loginPath}?error=token`, request.url))
  }

  const userRes = await fetch(USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!userRes.ok) {
    return NextResponse.redirect(new URL(`${loginPath}?error=userinfo`, request.url))
  }

  const profile = (await userRes.json()) as { email?: string; name?: string; picture?: string }
  const email = profile.email?.trim()
  if (!email) {
    return NextResponse.redirect(new URL(`${loginPath}?error=no_email`, request.url))
  }

  const name = profile.name ?? email.split('@')[0]

  let user = await prismaClient.user.findUnique({ where: { email } })
  if (!user) {
    user = await prismaClient.user.create({
      data: { email, name, password: null },
    })
  }

  const session = await getSession()
  session.id = user.id
  session.email = user.email
  session.name = user.name ?? undefined
  session.role = String(user.role)
  session.isLoggedIn = true
  await session.save()

  return NextResponse.redirect(successRedirect)
}
