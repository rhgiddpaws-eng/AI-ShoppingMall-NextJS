/**
 * useIntersection - 요소의 뷰포트 교차 여부를 감지하는 React 훅
 *
 * [기능]
 * - IntersectionObserver API를 활용해 DOM 요소가 뷰포트(또는 root)에 보이는지 추적
 * - 무한 스크롤, 레이지 로딩, 스크롤 애니메이션 트리거 등에 활용
 *
 * [문법/타입]
 * - RefObject<Element | null>: React ref로 관찰할 DOM 요소 참조
 * - UseIntersectionOptions: IntersectionObserver 생성자 옵션과 동일 (root, rootMargin, threshold)
 * - 반환값: { isIntersecting: boolean } — 현재 교차 중인지 여부
 */

import { useState, useEffect, RefObject } from 'react'

/** IntersectionObserver 옵션 타입 (root: 관찰 기준 요소, rootMargin: 여백, threshold: 교차 비율 0~1) */
interface UseIntersectionOptions {
  root?: Element | null
  rootMargin?: string
  threshold?: number | number[]
}

/**
 * @param ref - 관찰할 DOM 요소의 ref (useRef로 생성)
 * @param options - IntersectionObserver 옵션 객체 (선택)
 * @returns { isIntersecting } - 요소가 뷰포트에 보이면 true
 */
export function useIntersection(
  ref: RefObject<Element | null>,
  options: UseIntersectionOptions = {}
) {
  /** 교차 상태. 초기값 false, 관찰 결과에 따라 갱신 */
  const [isIntersecting, setIsIntersecting] = useState(false)

  useEffect(() => {
    const element = ref.current
    if (!element) return

    /** 콜백의 [entry]: observer가 관찰하는 항목이 1개이므로 배열 첫 요소 사용 */
    const observer = new IntersectionObserver(([entry]) => {
      setIsIntersecting(entry.isIntersecting)
    }, options)

    observer.observe(element)

    /** 클린업: 컴포넌트 언마운트 시 관찰 해제로 메모리 누수 방지 */
    return () => {
      observer.disconnect()
    }
  }, [ref, options])

  return { isIntersecting }
}
