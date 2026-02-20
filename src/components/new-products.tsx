'use client'

/**
 * NewProducts: 메인 최신 상품 섹션
 * - "2번 상품" 세트를 항상 앞쪽에 고정 노출합니다.
 */

import { useQuery } from '@tanstack/react-query'

import { ProductWithImages } from '@/app/api/products/route'
import ProductCard from '@/components/product-card'
import { ProductCardSkeleton } from '@/components/product-card-skeleton'
import { apiRoutes } from '@/lib/apiRoutes'
import { getCdnUrl } from '@/lib/cdn'
import { pickCardMediaKey } from '@/lib/media'
import { isProductInSet, mergePinnedFirst } from '@/lib/product-set'
import { safeParseJson } from '@/lib/utils'

// 메인에서 우선 노출할 세트 번호입니다.
const PINNED_SET_NO = 2
// 최신 섹션 최대 카드 개수입니다.
const NEW_LIMIT = 8
// 고정 세트 후보를 안정적으로 찾기 위한 조회 개수입니다.
const PIN_SOURCE_LIMIT = 100
// 같은 홈 재진입에서 즉시 재사용하도록 1분 동안 fresh로 유지합니다.
const NEW_STALE_TIME_MS = 60_000
// 최신 목록 캐시는 20분 보관해 반복 이동 시 재요청을 줄입니다.
const NEW_GC_TIME_MS = 20 * 60_000

async function fetchNewProducts(): Promise<ProductWithImages[]> {
  try {
    // 최신 목록 + 고정 세트 후보를 함께 조회해 메인 노출 순서를 재구성합니다.
    const [latestResponse, pinSourceResponse] = await Promise.all([
      fetch(`${apiRoutes.routes.products.path}?limit=${NEW_LIMIT}`),
      fetch(`${apiRoutes.routes.products.path}?limit=${PIN_SOURCE_LIMIT}&sort=id&order=asc`),
    ])

    const latestRaw = await safeParseJson<unknown>(latestResponse)
    const pinSourceRaw = await safeParseJson<unknown>(pinSourceResponse)

    const latestRows: ProductWithImages[] = Array.isArray(latestRaw) ? latestRaw : []
    const pinSourceRows: ProductWithImages[] = Array.isArray(pinSourceRaw)
      ? pinSourceRaw
      : []

    // 상품명에서 숫자 세트를 파싱해서 2번 세트만 정확히 추립니다.
    const pinnedRows = pinSourceRows.filter(product =>
      isProductInSet(product.name, PINNED_SET_NO),
    )

    return mergePinnedFirst(pinnedRows, latestRows, NEW_LIMIT)
  } catch (error) {
    console.error('최신 상품 로딩 오류:', error)
    return []
  }
}

export function NewProducts() {
  const { data: products = [], isPending } = useQuery({
    queryKey: ['products', 'new'],
    queryFn: fetchNewProducts,
    // 홈 재진입에서는 캐시를 바로 보여주고, 백그라운드 최신화는 필요할 때만 수행합니다.
    staleTime: NEW_STALE_TIME_MS,
    gcTime: NEW_GC_TIME_MS,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 1,
  })

  if (isPending && products.length === 0) {
    return (
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:gap-6 lg:grid-cols-4">
        {Array.from({ length: NEW_LIMIT }).map((_, index) => (
          <ProductCardSkeleton key={`new-skeleton-${index}`} />
        ))}
      </div>
    )
  }

  if (products.length === 0) {
    return <p className="text-sm text-muted-foreground">신상품이 아직 없습니다.</p>
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:gap-6 lg:grid-cols-4">
      {products.map(product => (
        <ProductCard
          key={product.id}
          id={product.id.toString()}
          name={product.name}
          price={product.price}
          // 카드 첫 진입 안정성을 위해 동영상 상품도 썸네일 이미지를 우선 사용합니다.
          imageSrc={getCdnUrl(pickCardMediaKey(product.images?.[0]))}
          isNew={true}
        />
      ))}
    </div>
  )
}
