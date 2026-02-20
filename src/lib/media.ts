/**
 * 파일 경로/URL에서 확장자를 안전하게 추출합니다.
 * - 쿼리스트링/해시가 붙어 있어도 확장자 판별이 가능해야 합니다.
 */
export type MediaTypeValue = "image" | "video"

/** 카드에서 사용할 미디어 소스 집합 타입입니다. */
export type CardMediaSources = {
  thumbnailKey: string
  videoKey?: string
}

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
 * 카드 렌더링에 필요한 썸네일/동영상 경로를 함께 계산합니다.
 * - 동영상 상품이라도 썸네일을 먼저 보여준 뒤, 준비되면 동영상을 노출할 수 있게 두 값을 모두 반환합니다.
 */
export function pickCardMediaSources(
  media:
    | {
        original?: string | null
        thumbnail?: string | null
        mediaType?: MediaTypeValue | string | null
      }
    | null
    | undefined,
): CardMediaSources {
  if (!media) {
    return { thumbnailKey: "" }
  }

  const original = media.original ?? ""
  const thumbnail = media.thumbnail ?? ""
  const mediaTypeLower = media.mediaType?.toLowerCase()
  const originalIsVideo = isVideoMediaPath(original)
  const thumbnailIsVideo = isVideoMediaPath(thumbnail)

  // DB 값 또는 확장자상 동영상이면 동영상 경로를 따로 보관하고, 썸네일 이미지를 우선 사용합니다.
  if (isVideoMediaType(mediaTypeLower) || originalIsVideo || thumbnailIsVideo) {
    const videoKey = originalIsVideo ? original : thumbnailIsVideo ? thumbnail : ""
    const thumbnailKey = !thumbnailIsVideo && thumbnail ? thumbnail : ""

    if (videoKey) {
      return {
        thumbnailKey: thumbnailKey || original || thumbnail,
        videoKey,
      }
    }

    return {
      thumbnailKey: thumbnail || original,
    }
  }

  // 이미지 상품은 기존처럼 썸네일 우선 정책을 유지합니다.
  if (mediaTypeLower === "image") {
    return { thumbnailKey: thumbnail || original }
  }

  return { thumbnailKey: thumbnail || original }
}

/**
 * 카드에서 사용할 기본 썸네일 경로만 필요할 때의 호환 함수입니다.
 * - 기존 호출부를 유지하기 위해 썸네일 키만 반환합니다.
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
  return pickCardMediaSources(media).thumbnailKey
}
