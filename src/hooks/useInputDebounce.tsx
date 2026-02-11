/**
 * useInputDebounce - 입력 값을 디바운스 처리하는 React 훅
 *
 * [기능]
 * - 사용자가 타이핑을 멈춘 뒤 700ms 후에만 searchTerm 상태를 갱신
 * - 검색 API 호출·필터링 등 빈번한 연산을 줄여 성능 개선
 *
 * [문법]
 * - debounce(fn, ms): lodash 디바운스 — ms 동안 호출이 없을 때만 fn 실행
 * - useRef(debounce(...)).current: 리렌더마다 새 debounce 함수 생성 방지, 인스턴스 유지
 * - cancel(): 디바운스 대기 중인 호출 취소 (언마운트 시 메모리/상태 업데이트 방지)
 *
 * [사용 시 주의]
 * - input의 value는 이 훅과 연결하지 않고 비워둠. 제어 컴포넌트로 쓰면 디바운스 의미 퇴색
 * - onSearchTermChange를 input의 onChange에 연결해 사용
 */

import { debounce } from 'lodash'
import { ChangeEvent, useEffect, useRef, useState } from 'react'

/**
 * @returns { searchTerm, onSearchTermChange, setSearchTerm }
 * - searchTerm: 디바운스 적용된 최종 검색어 (700ms 후 갱신)
 * - onSearchTermChange: input onChange에 넣을 핸들러
 * - setSearchTerm: 검색어를 외부에서 초기화할 때 사용
 */
function useInputDebounce() {
  const [searchTerm, setSearchTerm] = useState('')
  /** 리렌더 시에도 동일한 debounce 인스턴스 유지 → 연속 입력 시 타이머가 유지됨 */
  const debouncedSetTerm = useRef(
    debounce(value => {
      setSearchTerm(value)
    }, 700),
  ).current

  useEffect(() => {
    return () => {
      /** 컴포넌트 언마운트 시 대기 중인 디바운스 호출 취소 (setState on unmounted 방지) */
      debouncedSetTerm.cancel()
    }
  }, [debouncedSetTerm])

  /** input onChange에 바인딩. event.target.value를 디바운스 함수에 전달 */
  const onSearchTermChange = (event: ChangeEvent<HTMLInputElement>) => {
    debouncedSetTerm(event.target.value)
  }

  return { searchTerm, onSearchTermChange, setSearchTerm }
}

export default useInputDebounce
