/**
 * 홈 페이지 상품 데이터를 서버사이드에서 직접 가져옵니다.
 *
 * [기존 문제]
 * - FeaturedProducts·NewProducts가 각각 /api/products를 2번씩 호출(총 4건)
 * - 클라이언트 사이드 fetch → JS 로딩 후에야 데이터 요청 시작 (워터폴)
 * - limit=100 쿼리가 2번 중복 실행
 *
 * [개선]
 * - Prisma 직접 호출 1회로 통합
 * - Server Component에서 호출 → HTML에 데이터가 포함되어 즉시 렌더링
 * - 클라이언트는 initialData로 받아 스켈레톤 없이 바로 표시
 */

import prismaClient from '@/lib/prismaClient'
import { getCdnUrl } from '@/lib/cdn'
import { pickCardMediaSources } from '@/lib/media'
import { isProductInSet, mergePinnedFirst } from '@/lib/product-set'

// 메인에서 고정 노출할 세트 번호입니다.
const PINNED_SET_NO = 2
// 추천/신상 섹션 최대 카드 개수입니다.
const HOME_PRODUCTS_LIMIT = 8
// 고정 세트 후보를 안정적으로 찾기 위한 조회 개수입니다.
const PIN_SOURCE_LIMIT = 100

/** 클라이언트 컴포넌트에 전달할 추천 상품 데이터 형식 */
export interface HomeProductItem {
    id: string
    name: string
    price: number
    imageSrc: string
    videoSrc?: string
    category: string
    isNew?: boolean
    isSale?: boolean
    salePrice?: number
}

/** DB 조회 결과의 이미지 행 타입 */
interface ImageRow {
    id: number
    original: string
    thumbnail: string
    mediaType: 'image' | 'video'
}

/** DB 조회 결과의 상품 행 타입 */
interface ProductRow {
    id: number
    name: string
    price: number
    discountRate: number
    category: string | null
    createdAt: Date
    images: ImageRow[]
}

/**
 * DB 상품 행을 카드 표시용 데이터로 변환합니다.
 */
function toHomeProducts(products: ProductRow[]): HomeProductItem[] {
    const oneWeekAgo = new Date()
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)

    return products.map(product => {
        const discountAmount = product.price * (product.discountRate / 100)
        const salePrice = product.price - discountAmount
        const mediaSources = pickCardMediaSources(product.images?.[0])

        return {
            id: product.id.toString(),
            name: product.name,
            price: product.price,
            imageSrc: getCdnUrl(mediaSources.thumbnailKey),
            videoSrc: mediaSources.videoKey ? getCdnUrl(mediaSources.videoKey) : undefined,
            category: product.category || '기타',
            isNew: product.createdAt > oneWeekAgo,
            isSale: product.discountRate > 0,
            salePrice: product.discountRate > 0 ? salePrice : undefined,
        }
    })
}

/**
 * 메인 페이지에 필요한 상품 데이터를 서버에서 한 번에 가져옵니다.
 *
 * 기존: 클라이언트에서 4건 API 호출 (limit=8 x2, limit=100 x2)
 * 개선: 서버에서 1건 Prisma 쿼리 (limit=100, pinned + latest 모두 커버)
 *
 * @returns { featured, newProducts } - 추천/신상 섹션 데이터
 */
export async function getHomeProducts(): Promise<{
    featured: HomeProductItem[]
    newProducts: HomeProductItem[]
}> {
    try {
        // 고정 세트 후보와 최신 상품을 모두 커버하는 단일 쿼리입니다.
        // limit=100이면 최신 8개 + 세트 2번 상품이 모두 포함됩니다.
        const allProducts = await prismaClient.product.findMany({
            where: {
                status: 'PUBLISHED' as const,
            },
            take: PIN_SOURCE_LIMIT,
            select: {
                id: true,
                name: true,
                price: true,
                discountRate: true,
                category: true,
                createdAt: true,
                images: {
                    take: 1,
                    orderBy: [{ mediaType: 'desc' }, { id: 'asc' }],
                    select: {
                        id: true,
                        original: true,
                        thumbnail: true,
                        mediaType: true,
                    },
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
        })

        // 고정 세트(2번) 상품을 필터링합니다.
        const pinnedRows = allProducts.filter(product =>
            isProductInSet(product.name, PINNED_SET_NO),
        )

        // 최신 8개 (createdAt desc → 이미 정렬됨)
        const latestRows = allProducts.slice(0, HOME_PRODUCTS_LIMIT)

        // 고정 세트를 앞에 배치하고, 나머지는 최신으로 채웁니다.
        const featuredMerged = mergePinnedFirst(pinnedRows, latestRows, HOME_PRODUCTS_LIMIT)
        const newMerged = mergePinnedFirst(pinnedRows, latestRows, HOME_PRODUCTS_LIMIT)

        return {
            featured: toHomeProducts(featuredMerged),
            newProducts: toHomeProducts(newMerged),
        }
    } catch (error) {
        console.error('홈 상품 서버 프리페칭 오류:', error)
        // 서버 프리페칭이 실패하더라도 빈 배열을 반환해 클라이언트 fallback이 동작합니다.
        return { featured: [], newProducts: [] }
    }
}
