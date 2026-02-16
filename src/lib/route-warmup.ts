/**
 * 라우트/데이터 워밍 유틸
 * - 사용자가 클릭하기 직전에 API와 라우트를 가볍게 예열해서 첫 진입 지연을 줄입니다.
 * - 같은 대상은 세션 동안 한 번만 워밍해서 불필요한 트래픽을 막습니다.
 */

type PrefetchRouter = {
  prefetch: (href: string) => void
}

const warmedCategorySet = new Set<string>()
const warmedProductSet = new Set<string>()

function normalizeCategorySlug(raw: string): string {
  return raw.trim().toLowerCase()
}

async function safeBackgroundFetch(url: string) {
  try {
    await fetch(url, {
      method: "GET",
      cache: "force-cache",
      keepalive: true,
    })
  } catch {
    // 워밍 실패는 사용자 동작을 막지 않기 위해 조용히 무시합니다.
  }
}

/**
 * 카테고리 목록 API를 가볍게 미리 호출합니다.
 */
export async function warmCategoryApis(categorySlug: string) {
  const slug = normalizeCategorySlug(categorySlug)
  if (!slug) return

  await Promise.all([
    safeBackgroundFetch(`/api/products?category=${encodeURIComponent(slug)}&limit=1`),
    safeBackgroundFetch(
      `/api/products/infinite?category=${encodeURIComponent(slug)}&page=1&pageSize=1`,
    ),
  ])
}

/**
 * 상품 상세/추천 API를 가볍게 미리 호출합니다.
 */
export async function warmProductApis(productId: string | number) {
  const id = String(productId).trim()
  if (!id) return

  await Promise.all([
    safeBackgroundFetch(`/api/products/${encodeURIComponent(id)}`),
    safeBackgroundFetch(`/api/products/recommended?exclude=${encodeURIComponent(id)}`),
  ])
}

/**
 * 카테고리 페이지 라우트 + API를 함께 워밍합니다.
 */
export function warmCategoryRoute(router: PrefetchRouter, href: string) {
  const matched = href.match(/^\/category\/([^/?#]+)/i)
  const slug = matched?.[1]
  if (!slug) return

  router.prefetch(href)

  const normalizedSlug = normalizeCategorySlug(slug)
  if (warmedCategorySet.has(normalizedSlug)) return
  warmedCategorySet.add(normalizedSlug)
  void warmCategoryApis(normalizedSlug)
}

/**
 * 상품 상세 라우트 + API를 함께 워밍합니다.
 */
export function warmProductRoute(router: PrefetchRouter, productId: string | number) {
  const id = String(productId).trim()
  if (!id) return

  router.prefetch(`/product/${id}`)

  if (warmedProductSet.has(id)) return
  warmedProductSet.add(id)
  void warmProductApis(id)
}
