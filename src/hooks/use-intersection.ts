import { useState, useEffect, RefObject } from 'react'

interface UseIntersectionOptions {
  root?: Element | null
  rootMargin?: string
  threshold?: number | number[]
}

export function useIntersection(
  ref: RefObject<Element | null>,
  options: UseIntersectionOptions = {}
) {
  const [isIntersecting, setIsIntersecting] = useState(false)

  useEffect(() => {
    const element = ref.current
    if (!element) return

    const observer = new IntersectionObserver(([entry]) => {
      setIsIntersecting(entry.isIntersecting)
    }, options)

    observer.observe(element)

    return () => {
      observer.disconnect()
    }
  }, [ref, options])

  return { isIntersecting }
} 