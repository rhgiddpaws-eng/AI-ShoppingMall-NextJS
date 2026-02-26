'use client'

/**
 * NewProducts: 메인 최신 상품 섹션
 * - 서버에서 프리페칭된 initialData가 있으면 즉시 렌더링합니다 (스켈레톤 없음).
 * - "2번 상품" 세트를 항상 앞쪽에 고정 노출합니다.
 */

import { useQuery } from '@tanstack/react-query'

import { ProductWithImages } from '@/app/api/products/route'
import ProductCard from '@/components/product-card'
import { ProductCardSkeleton } from '@/components/product-card-skeleton'
import { apiRoutes } from '@/lib/apiRoutes'
import { getCdnUrl } from '@/lib/cdn'
import { pickCardMediaSources } from '@/lib/media'
import { isProductInSet, mergePinnedFirst } from '@/lib/product-set'
import { safeParseJson } from '@/lib/utils'
import type { HomeProductItem } from '@/lib/server/home-products'

// 메인에서 우선 노출할 세트 번호입니다.
const PINNED_SET_NO = 2
// 최신 섹션 최대 카드 개수입니다.
const NEW_LIMIT = 8
// 고정 세트 후보를 안정적으로 찾기 위한 조회 개수입니다.
const PIN_SOURCE_LIMIT = 100
// 서버 프리페칭 데이터가 있으면 5분간 fresh로 유지합니다.
const NEW_STALE_TIME_MS = 5 * 60_000
// 최신 목록 캐시는 20분 보관해 반복 이동 시 재요청을 줄입니다.
const NEW_GC_TIME_MS = 20 * 60_000

/** 서버 프리페칭이 없을 때의 클라이언트 fallback fetch 함수입니다. */
async function fetchNewProducts(): Promise<ProductWithImages[]> {
  try {
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

    const pinnedRows = pinSourceRows.filter(product =>
      isProductInSet(product.name, PINNED_SET_NO),
    )

    return mergePinnedFirst(pinnedRows, latestRows, NEW_LIMIT)
  } catch (error) {
    console.error('최신 상품 로딩 오류:', error)
    return []
  }
}

interface NewProductsProps {
  /** 서버에서 프리페칭된 데이터. 있으면 스켈레톤 없이 즉시 렌더링됩니다. */
  initialData?: HomeProductItem[]
}

export function NewProducts({ initialData }: NewProductsProps) {
  // initialData가 있으면 React Query initialData로 바로 사용 → 클라이언트 fetch 생략
  const hasServerData = initialData && initialData.length > 0

  const { data: products = [], isPending } = useQuery({
    queryKey: ['products', 'new'],
    queryFn: fetchNewProducts,
    // 서버 프리페칭 데이터가 있으면 초기 fetch를 건너뛰고 캐시로 사용합니다.
    initialData: hasServerData ? (initialData as unknown as ProductWithImages[]) : undefined,
    // 서버 데이터가 있으면 staleTime을 높게 잡아 불필요한 재요청을 막습니다.
    staleTime: hasServerData ? NEW_STALE_TIME_MS : 60_000,
    gcTime: NEW_GC_TIME_MS,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    // 서버 데이터가 있으면 마운트 시 재요청하지 않습니다.
    refetchOnMount: !hasServerData,
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
      {products.map(product => {
        // initialData에서 온 데이터와 API에서 온 데이터 모두 처리합니다.
        const item = product as Record<string, unknown>

        // initialData 형식: { id, name, price, imageSrc, videoSrc, ... }
        if (typeof item.imageSrc === 'string') {
          return (
            <ProductCard
              key={String(item.id)}
              id={String(item.id)}
              name={String(item.name)}
              price={Number(item.price)}
              imageSrc={item.imageSrc as string}
              videoSrc={item.videoSrc as string | undefined}
              isNew={true}
            />
          )
        }

        // API fetch 형식: { id, name, price, images: [...], ... }
        const apiProduct = product as ProductWithImages
        const mediaSources = pickCardMediaSources(apiProduct.images?.[0])

        return (
          <ProductCard
            key={apiProduct.id}
            id={apiProduct.id.toString()}
            name={apiProduct.name}
            price={apiProduct.price}
            imageSrc={getCdnUrl(mediaSources.thumbnailKey)}
            videoSrc={mediaSources.videoKey ? getCdnUrl(mediaSources.videoKey) : undefined}
            isNew={true}
          />
        )
      })}
    </div>
  )
}
