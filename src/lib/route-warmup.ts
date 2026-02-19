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
const warmedRouteSet = new Set<string>()
const warmedAuthSet = new Set<string>()
const warmedAdminSet = new Set<string>()

function normalizeCategorySlug(raw: string): string {
  return raw.trim().toLowerCase()
}

async function safeBackgroundFetch(url: string) {
  try {
    await fetch(url, {
      method: "GET",
      // 워밍업에서 받은 응답을 브라우저 캐시에 넣어 실제 다음 이동에서 재사용합니다.
      // 워밍업은 서버를 깨우는 목적만 유지하고 브라우저 캐시는 비웁니다.
      cache: "no-store",
      keepalive: true,
    })
  } catch {
    // 워밍 실패는 사용자 동작을 막지 않기 위해 조용히 무시합니다.
  }
}

function safePrefetch(router: PrefetchRouter, href: string) {
  try {
    router.prefetch(href)
  } catch {
    // 라우트 prefetch 실패는 사용자 동작에 영향을 주지 않도록 무시합니다.
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

  safePrefetch(router, href)

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

  safePrefetch(router, `/product/${id}`)

  if (warmedProductSet.has(id)) return
  warmedProductSet.add(id)
  void warmProductApis(id)
}

/**
 * 공통 네비게이션 라우트를 세션당 한 번만 prefetch합니다.
 * 홈/검색/장바구니/위시리스트/계정/관리자 이동의 첫 클릭 지연을 줄이는 용도입니다.
 */
export function warmPrimaryRoutes(router: PrefetchRouter, isLoggedIn: boolean) {
  const commonRoutes = ["/search", "/cart", "/wishlist"]
  const guestRoutes = ["/login", "/register"]
  const memberRoutes = ["/account", "/admin"]
  const targets = isLoggedIn
    ? [...commonRoutes, ...memberRoutes]
    : [...commonRoutes, ...guestRoutes]

  for (const href of targets) {
    if (warmedRouteSet.has(href)) continue
    warmedRouteSet.add(href)
    safePrefetch(router, href)
  }
}

/**
 * 로그인 사용자의 계정/관리자 진입 시 필요한 API를 가볍게 선행 워밍합니다.
 */
export function warmLoggedInApis() {
  if (warmedAuthSet.has("auth")) return
  warmedAuthSet.add("auth")

  void Promise.all([
    // 인증 상태 확인 API를 먼저 깨워 계정/관리자 진입 시 첫 호출 지연을 줄입니다.
    safeBackgroundFetch("/api/auth/me"),
    safeBackgroundFetch("/api/user/cart"),
    safeBackgroundFetch("/api/user/wishlist"),
  ])
}

/**
 * 관리자 버튼 진입 의도가 보일 때만 관리자 인증/대시보드 API를 워밍합니다.
 */
export function warmAdminApis() {
  if (warmedAdminSet.has("admin")) return
  warmedAdminSet.add("admin")

  void Promise.all([
    safeBackgroundFetch("/api/admin/me"),
    safeBackgroundFetch("/api/admin/dashboard?period=month"),
  ])
}
