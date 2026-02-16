/**
 * CDN 이미지 URL 생성
 * .env의 NEXT_PUBLIC_AWS_BUCKET_CDN (예: https://cdn.ncott.shop) 을 베이스로 사용
 */
const CDN_BASE =
  (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_AWS_BUCKET_CDN) ||
  'https://cdn.ncott.shop'

/**
 * 상품 이미지 등 CDN 경로를 풀 URL로 만듦.
 * path가 없으면 placeholder 경로 반환.
 * 이미 http(s) 절대 URL이면 그대로 반환(API가 풀 URL을 줄 때 
 * 이중 접두 방지).
 * path 앞뒤 공백·앞 슬래시 제거하여 이중 슬래시 방지.
 */
export function getCdnUrl(path: string | undefined | null): string {
  if (!path || path === 'undefined') return '/placeholder.svg'
  if (path.startsWith('http://') || path.startsWith('https://')) return path
  const base = CDN_BASE.endsWith('/') ? CDN_BASE.slice(0, -1) : CDN_BASE
  const normalized = path.trim().replace(/^\/+/, '')
  return normalized ? `${base}/${normalized}` : '/placeholder.svg'
}

/** Next.js images.remotePatterns용 hostname (next.config에서 사용) */
export function getCdnHostname(): string {
  try {
    return new URL(CDN_BASE).hostname
  } catch {
    return 'cdn.ncott.shop'
  }
}
