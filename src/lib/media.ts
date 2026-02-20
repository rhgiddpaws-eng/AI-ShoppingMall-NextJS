/**
 * 파일 경로/URL에서 확장자를 안전하게 추출합니다.
 * - 쿼리스트링/해시가 붙어 있어도 확장자 판별이 가능해야 합니다.
 */
export type MediaTypeValue = "image" | "video"

function getNormalizedExt(pathOrUrl: string): string {
  const [withoutQuery] = pathOrUrl.split("?")
  const [withoutHash] = withoutQuery.split("#")
  const dotIndex = withoutHash.lastIndexOf(".")
  if (dotIndex < 0) return ""
  return withoutHash.slice(dotIndex).toLowerCase()
}

/**
 * 동영상 파일인지 확장자로 판단합니다.
 * - 카드/상세에서 이미지 태그와 비디오 태그를 분기할 때 사용합니다.
 */
export function isVideoMediaPath(pathOrUrl: string | null | undefined): boolean {
  if (!pathOrUrl) return false
  const ext = getNormalizedExt(pathOrUrl)
  return ext === ".mp4" || ext === ".webm" || ext === ".mov"
}

/**
 * DB mediaType 값을 우선 사용해 동영상 여부를 판단합니다.
 * - 값이 비어 있으면 기존 확장자 판별로 자연스럽게 fallback 합니다.
 */
export function isVideoMediaType(mediaType: string | null | undefined): boolean {
  return mediaType?.toLowerCase() === "video"
}

/**
 * 카드에서 사용할 대표 미디어 경로를 고릅니다.
 * - 카드 첫 진입 안정성을 위해 동영상도 썸네일 이미지를 우선 사용합니다.
 * - 썸네일이 없을 때만 원본 경로로 fallback 합니다.
 */
export function pickCardMediaKey(
  media:
    | {
        original?: string | null
        thumbnail?: string | null
        mediaType?: MediaTypeValue | string | null
      }
    | null
    | undefined,
): string {
  if (!media) return ""

  const original = media.original ?? ""
  const thumbnail = media.thumbnail ?? ""
  const originalIsVideo = isVideoMediaPath(original)
  const thumbnailIsVideo = isVideoMediaPath(thumbnail)

  // 카드 첫 진입에서 동영상 로드 실패로 빈 화면이 보이지 않도록 썸네일을 우선 노출합니다.
  if (isVideoMediaType(media.mediaType) || originalIsVideo || thumbnailIsVideo) {
    if (thumbnail && !thumbnailIsVideo) return thumbnail
    if (original) return original
    return thumbnail
  }

  if (media.mediaType?.toLowerCase() === "image") return thumbnail || original
  return thumbnail || original
}
