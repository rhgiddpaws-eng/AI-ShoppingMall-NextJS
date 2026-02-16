/**
 * useIsMobile - 현재 뷰포트가 모바일 너비인지 판별하는 React 훅
 *
 * [기능]
 * - 768px 미만을 모바일로 간주하고, 미디어 쿼리 변경 시 상태 갱신
 * - 반응형 UI(모바일 메뉴, 레이아웃 전환)에서 사용
 *
 * [문법]
 * - window.matchMedia(): CSS 미디어 쿼리 결과를 담는 MediaQueryList 반환
 * - "change" 이벤트: 뷰포트 크기 변경 시 발생
 * - !!isMobile: undefined → false 변환 (SSR 초기값 처리)
 */

import * as React from "react"

/** 모바일/데스크톱 경계 픽셀. 이 값 미만이면 모바일로 간주 */
const MOBILE_BREAKPOINT = 768

/**
 * @returns boolean - 768px 미만이면 true(모바일), 이상이면 false. SSR 시 초기에는 false
 */
export function useIsMobile() {
  /** SSR 시 window 없음 → undefined, 클라이언트에서 한 번 더 갱신 */
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    /** max-width: 767px → 768 미만일 때 매칭 */
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }
    mql.addEventListener("change", onChange)
    /** 마운트 시점 한 번 현재 값으로 설정 */
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    return () => mql.removeEventListener("change", onChange)
  }, [])

  /** undefined(SSR)일 때 false로 통일 */
  return !!isMobile
}
