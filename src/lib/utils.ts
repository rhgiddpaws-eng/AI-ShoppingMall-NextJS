/**
 * utils - 공통 유틸 함수
 *
 * [기능]
 * - cn(): Tailwind CSS 클래스명을 조건부로 합치고, 중복/충돌은 tailwind-merge로 정리
 *
 * [문법]
 * - clsx(...inputs): 여러 클래스 인자(문자열, 객체, 배열)를 하나의 문자열로 합침. falsy 제외
 * - twMerge(clsx(...)): Tailwind 동일 유틸리티 충돌 시 뒤에 오는 걸로 덮어씀 (예: p-2 p-4 → p-4)
 * - ClassValue: clsx가 받는 인자 타입 (string | object | array 등)
 */

import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * 조건부 Tailwind 클래스 병합. 충돌하는 유틸리티는 마지막 값 적용
 * @param inputs - 클래스 문자열, { 'hidden': isHidden }, ['a', 'b'] 등
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
