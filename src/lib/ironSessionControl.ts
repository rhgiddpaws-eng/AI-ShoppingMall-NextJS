/**
 * ironSessionControl - 서버 측 세션 읽기/로그아웃 (iron-session)
 *
 * [기능]
 * - getSession: 쿠키에서 암호화된 세션 읽기, 비로그인 시 기본값으로 채움
 * - logout: 세션 파괴(쿠키 삭제)
 *
 * [문법]
 * - 'use server': Next.js Server Action 지시어 — 이 파일의 export는 서버에서만 실행
 * - cookies(): Next.js 15+ 비동기 cookies API (await 필요)
 * - getIronSession<SessionData>: iron-session이 쿠키를 복호화해 SessionData 형태로 반환
 * - session.destroy(): 세션 쿠키 제거
 */

'use server'

import { cookies } from 'next/headers'
import { defaultSession, SessionData, sessionOptions } from './session'
import { getIronSession } from 'iron-session'

/**
 * 현재 요청의 세션 객체 반환. 비로그인 시 defaultSession 값으로 채워진 객체 반환
 */
export const getSession = async () => {
  const cookieStore = await cookies()
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions)
  if (!session.isLoggedIn) {
    session.id = defaultSession.id
    session.email = defaultSession.email
    session.name = defaultSession.name
    session.role = defaultSession.role
    session.isLoggedIn = defaultSession.isLoggedIn
  }

  return session
}

/**
 * 왜 로그아웃 시 세션을 삭제해야 하나요?
 *
 * 사용자가 로그아웃을 할 때 서버에 저장된 로그인 상태(세션)를 초기화(파괴)해야
 * 더 이상 해당 사용자가 인증된 상태로 간주되지 않기 때문입니다.
 * 
 * - iron-session에서는 세션(로그인 정보 등)이 쿠키(ecommerce-session)에 암호화되어 저장됩니다.
 * - 로그아웃(=session.destroy())을 호출하면 이 세션 쿠키가 만료되어, 사용자의 인증 정보가 완전히 사라집니다.
 * - 즉, 다음 요청부터는 사용자가 더 이상 로그인된 상태가 아니며, 인증이 필요한 API 접근이 모두 거부됩니다.
 *
 * 이렇게 해야 로그아웃 후에 다른 사용자가 같은 브라우저를 쓸 때
 * 이전 사용자의 정보나 권한이 노출되지 않습니다.
 */
export const logout = async () => {
  // 프론트엔드(브라우저)에서 서버로 요청을 보낼 때, 
  // fetch나 axios 등에 credentials: 'include' 옵션을 주면
    // 브라우저는 "도메인"별(=사이트별)로 쿠키를 관리하며, 
    // 같은 도메인 내의 모든 주소(경로)에서 공유되는 쿠키(예: 세션 쿠키)를 
    // 해당 도메인으로 요청할 때마다 자동으로 첨부합니다.
    // 즉, "현재 접속한 사이트의 도메인"이 같다면 어떤 하위 경로(주소)로 요청해도
    // 세션 쿠키가 늘 함께 전송되어 로그인 상태를 인식할 수 있습니다.
  // 즉, fetch나 axios 등에서 credentials: 'include'를 설정하면,
  // 브라우저는 접속한 사이트(=현재 도메인)의 인증 정보(쿠키)를 서버 요청에 함께 보냅니다.
  // 회원 인증이 필요한 API에서는 반드시 credentials: 'include'가 사용되어야 
  // 서버에서 쿠키(세션값)를 읽을 수 있습니다.

  // 여기서 cookies()는 Next.js 15+에서 비동기로 쿠키값 전체를 읽어오는 함수입니다.
  // iron-session은 이 쿠키값(cookieStore)을 이용하여 암호화된 세션을 식별/복호화합니다.
  // getIronSession<SessionData>(cookieStore, sessionOptions)
  //   - 첫번째 인자(cookieStore): 위에서 읽어온 쿠키 데이터 전체
  //   - 두번째 인자(sessionOptions): iron-session의 설정

  // 주의: getIronSession이 반환하는 객체(SessionData)는 실제 SessionData 타입의 속성들을 가짐과 동시에
  // iron-session에서 확장된 메서드(destroy, save 등)를 포함합니다.
  // 즉, session.destroy()는 실제로 가능하며, 세션 쿠키를 만료시켜 로그아웃 처리를 합니다.
  const cookieStore = await cookies()
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions)
  session.destroy()
}
