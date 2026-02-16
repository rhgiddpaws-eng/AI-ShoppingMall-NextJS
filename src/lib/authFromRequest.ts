/**
 * API 라우트용 인증: JWT(Authorization Bearer) 우선, 없으면 세션(쿠키) fallback
 * - getAuthFromRequest(request) → { id, email, name, role } | null
 */

import { getSession } from '@/lib/ironSessionControl'
import { verifyJwt } from '@/lib/jwt'

export type AuthUser = {
  id: number
  email: string
  name?: string
  role?: string
}

/** Request에서 JWT 또는 세션으로 사용자 정보 반환 */
export async function getAuthFromRequest(request: Request): Promise<AuthUser | null> {
  const authHeader = request.headers.get('Authorization')
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null

  if (token) {
    const payload = await verifyJwt(token)
    if (payload) {
      return {
        id: Number(payload.sub),
        email: payload.email,
        name: payload.name,
        role: payload.role,
      }
    }
  }

  const session = await getSession()
  if (session.isLoggedIn && session.id != null) {
    return {
      id: session.id,
      email: session.email ?? '',
      name: session.name,
      role: session.role,
    }
  }

  return null
}
