/**
 * useInputDebounce - 입력값(즉시)과 검색값(디바운스)을 분리해 관리하는 훅
 *
 * [핵심 목적]
 * - inputValue: 화면에 즉시 보이는 입력값
 * - searchTerm: API 조회에 쓰는 디바운스 적용값
 *
 * [장점]
 * - 사용자는 입력 즉시 텍스트를 보면서 타이핑할 수 있고,
 * - 서버 조회는 일정 시간 뒤에만 실행되어 불필요한 요청을 줄입니다.
 */

import { debounce } from "lodash"
import { ChangeEvent, useCallback, useEffect, useRef, useState } from "react"

function useInputDebounce(initialValue = "") {
  const [inputValue, setInputValue] = useState(initialValue)
  const [searchTerm, setSearchTerm] = useState(initialValue)

  // 같은 디바운스 인스턴스를 유지해야 타이머가 끊기지 않습니다.
  const debouncedSetTerm = useRef(
    debounce((value: string) => {
      setSearchTerm(value)
    }, 700),
  ).current

  useEffect(() => {
    return () => {
      // 언마운트 시 남아있는 디바운스 호출을 정리합니다.
      debouncedSetTerm.cancel()
    }
  }, [debouncedSetTerm])

  const onSearchTermChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value
      setInputValue(value)
      debouncedSetTerm(value)
    },
    [debouncedSetTerm],
  )

  const setImmediateSearchTerm = useCallback(
    (value: string) => {
      // URL 파라미터 초기값처럼 즉시 반영이 필요한 경우 사용합니다.
      debouncedSetTerm.cancel()
      setInputValue(value)
      setSearchTerm(value)
    },
    [debouncedSetTerm],
  )

  return {
    inputValue,
    searchTerm,
    onSearchTermChange,
    setInputValue,
    setImmediateSearchTerm,
  }
}

export default useInputDebounce
