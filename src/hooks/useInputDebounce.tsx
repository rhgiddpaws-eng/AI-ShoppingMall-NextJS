import { debounce } from 'lodash'
import { ChangeEvent, useEffect, useRef, useState } from 'react'

/**
 * 입력 값을 디바운스 처리하는 훅
 * 알반적으로 onSearchTermChange 이벤트 핸들러에서 사용
 * input의 value는 연결하지 않습니다. input의 value는 빈값으로 둡니다.
 * @returns
 */
function useInputDebounce() {
  const [searchTerm, setSearchTerm] = useState('')
  const debouncedSetTerm = useRef(
    debounce(value => {
      setSearchTerm(value)
    }, 700),
  ).current
  useEffect(() => {
    return () => {
      debouncedSetTerm.cancel()
    }
  }, [debouncedSetTerm])

  const onSearchTermChange = (event: ChangeEvent<HTMLInputElement>) => {
    // react hook을 사용한다면 getValues를 인자로 전달하면 된다.(다른버젼 훅을 만들던지..)
    debouncedSetTerm(event.target.value)
  }

  return { searchTerm, onSearchTermChange, setSearchTerm }
}

export default useInputDebounce
