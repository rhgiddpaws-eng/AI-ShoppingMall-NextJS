/**
 * session - iron-session 설정 및 세션 타입/기본값
 *
 * [기능]
 * - SessionData: 세션에 저장되는 필드 타입 (id, email, name, role, isLoggedIn)
 * - defaultSession: 비로그인 시 사용할 기본값
 * - sessionOptions: iron-session에 넘기는 옵션 (비밀키, 쿠키 이름, httpOnly 등)
 *
 * [문법]
 * - SessionOptions: iron-session 패키지 타입
 * - password: { 1: secret1, 2: secret2 } — 비밀키 로테이션용, 최소 하나 필요
 * - cookieOptions.httpOnly: JS에서 접근 불가, XSS 완화
 * - cookieOptions.secure: production에서만 HTTPS로 전송
 * - process.env.SESSION_SECRET_*!: non-null assertion (env 필수로 가정)
 */

import { SessionOptions } from 'iron-session'

/** 세션에 들어가는 데이터 타입 */
export interface SessionData {
  id?: number
  email?: string
  name?: string
  role?: string
  isLoggedIn?: boolean
}

/** 로그인하지 않았을 때 세션에 채워 넣을 기본값 */
export const defaultSession: SessionData = {
  id: undefined,
  email: undefined,
  name: undefined,
  role: undefined,
  isLoggedIn: false,
}

/** iron-session에 전달하는 설정 */
export const sessionOptions: SessionOptions = {
  password: {
    1: process.env.SESSION_SECRET_1!,
    2: process.env.SESSION_SECRET_2!,
  },
  cookieName: 'ecommerce-session',
  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    sameSite: 'lax' as const,
  },
}
