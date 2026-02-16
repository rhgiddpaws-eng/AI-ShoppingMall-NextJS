// =============================================================================
// Kakao OAuth 콜백 - GET /api/auth/kakao/callback?code=...
// code로 토큰 교환 → 사용자 정보 조회 → findOrCreate User → 세션 + 리다이렉트
// =============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/ironSessionControl'
import prismaClient from '@/lib/prismaClient'

const TOKEN_URL = 'https://kauth.kakao.com/oauth/token'
const USERINFO_URL = 'https://kapi.kakao.com/v2/user/me'

type KakaoProfile = {
  id?: number
  kakao_account?: {
    email?: string
    profile?: { nickname?: string }
  }
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code')
  const origin = request.nextUrl.origin
  const loginPath = `${origin}/login`
  const successRedirect = `${origin}/login?oauth=success`

  if (!code) {
    return NextResponse.redirect(new URL(`${loginPath}?error=no_code`, request.url))
  }

  // 카카오 OAuth client_id는 REST API 키 변수 하나만 사용한다.
  const clientId = process.env.KAKAO_REST_API_KEY
  const clientSecret = process.env.KAKAO_CLIENT_SECRET ?? ''
  if (!clientId) {
    return NextResponse.redirect(new URL(`${loginPath}?error=config`, request.url))
  }

  const redirectUri = `${origin}/api/auth/kakao/callback`
  // 카카오 Client Secret을 켠 환경에서만 client_secret을 보내고, 비활성 환경에서는 제외합니다.
  // 이렇게 하면 Secret을 끈 앱에서 빈 문자열로 인한 토큰 교환 실패를 예방할 수 있습니다.
  const tokenParams = new URLSearchParams({
    code,
    client_id: clientId,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
  })
  if (clientSecret.trim()) {
    tokenParams.set('client_secret', clientSecret)
  }

  const tokenRes = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: tokenParams,
  })

  if (!tokenRes.ok) {
    const err = await tokenRes.text()
    console.error('Kakao token error:', err)
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

  const profile = (await userRes.json()) as KakaoProfile
  const email =
    profile.kakao_account?.email?.trim() ||
    `kakao_${profile.id ?? Date.now()}@kakao.local`
  const name =
    profile.kakao_account?.profile?.nickname?.trim() ||
    email.split('@')[0]

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
