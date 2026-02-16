/**
 * JWT 발급·검증 (jose)
 * - 로그인 시 access token 발급, API는 Authorization: Bearer 로 검증
 * - JWT_SECRET 환경 변수 필수
 */

import * as jose from 'jose'

const JWT_SECRET = process.env.JWT_SECRET || process.env.SESSION_SECRET_1 || 'fallback-secret-change-in-production'
const ALG = 'HS256'
const EXPIRY = '7d'

export type JwtPayload = {
  sub: string // userId
  email: string
  name?: string
  role?: string
}

/** JWT 발급 (로그인 성공 시) */
export async function signJwt(payload: JwtPayload): Promise<string> {
  const secret = new TextEncoder().encode(JWT_SECRET)
  return new jose.SignJWT({
    email: payload.email,
    name: payload.name,
    role: payload.role,
  })
    .setProtectedHeader({ alg: ALG })
    .setSubject(String(payload.sub))
    .setExpirationTime(EXPIRY)
    .setIssuedAt()
    .sign(secret)
}

/** JWT 검증 → payload 또는 null */
export async function verifyJwt(token: string): Promise<JwtPayload | null> {
  try {
    const secret = new TextEncoder().encode(JWT_SECRET)
    const { payload } = await jose.jwtVerify(token, secret)
    const sub = payload.sub
    if (!sub) return null
    return {
      sub,
      email: (payload.email as string) ?? '',
      name: payload.name as string | undefined,
      role: payload.role as string | undefined,
    }
  } catch {
    return null
  }
}
