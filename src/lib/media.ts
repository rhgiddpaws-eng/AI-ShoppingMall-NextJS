/**
 * 파일 경로/URL에서 확장자를 안전하게 추출합니다.
 * - 쿼리스트링/해시가 붙어 있어도 확장자 판단이 가능해야 합니다.
 */
function getNormalizedExt(pathOrUrl: string): string {
  const [withoutQuery] = pathOrUrl.split("?")
  const [withoutHash] = withoutQuery.split("#")
  const dotIndex = withoutHash.lastIndexOf(".")
  if (dotIndex < 0) return ""
  return withoutHash.slice(dotIndex).toLowerCase()
}

/**
 * 동영상 파일인지 확장자로 판단합니다.
 * - 상품 카드/상세에서 이미지 태그와 비디오 태그를 분기할 때 사용합니다.
 */
export function isVideoMediaPath(pathOrUrl: string | null | undefined): boolean {
  if (!pathOrUrl) return false
  const ext = getNormalizedExt(pathOrUrl)
  return ext === ".mp4" || ext === ".webm" || ext === ".mov"
}

/**
 * 카드에 사용할 대표 미디어 키를 고릅니다.
 * - 원본이 동영상이면 원본을 우선 사용해 카드에서도 비디오가 보이게 합니다.
 * - 그 외에는 thumbnail 우선 정책을 유지해 로딩 부담을 줄입니다.
 */
export function pickCardMediaKey(
  media: { original?: string | null; thumbnail?: string | null } | null | undefined,
): string {
  if (!media) return ""
  if (isVideoMediaPath(media.original ?? "")) return media.original ?? ""
  return media.thumbnail ?? media.original ?? ""
}
