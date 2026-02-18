/**
 * 상품명에서 마지막 숫자(세트 번호)를 파싱합니다.
 * - 한글 문자열 매칭에 의존하지 않아 인코딩 영향이 적습니다.
 * - 예) "남성 케쥬얼 의상 2번 상품" -> 2
 */
export function parseProductSetNo(name: string): number | null {
  const matched = name.match(/(\d+)(?!.*\d)/)
  if (!matched) return null
  const parsed = Number(matched[1])
  return Number.isFinite(parsed) ? parsed : null
}

/** 상품명이 특정 세트 번호에 속하는지 정확히 판단합니다. */
export function isProductInSet(name: string, setNo: number): boolean {
  const parsed = parseProductSetNo(name)
  return parsed === setNo
}

/**
 * 고정 노출 상품을 앞쪽으로 배치하고, 중복 ID를 제거한 뒤 최대 개수만 반환합니다.
 * - pinned가 항상 먼저 보이고, 남는 칸은 base 목록으로 채웁니다.
 */
export function mergePinnedFirst<T extends { id: number }>(
  pinned: T[],
  base: T[],
  limit: number,
): T[] {
  const merged: T[] = []
  const seen = new Set<number>()

  for (const item of [...pinned, ...base]) {
    if (seen.has(item.id)) continue
    seen.add(item.id)
    merged.push(item)
    if (merged.length >= limit) break
  }

  return merged
}
