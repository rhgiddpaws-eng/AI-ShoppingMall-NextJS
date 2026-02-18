import { ProductCardSkeleton } from "@/components/product-card-skeleton"
import { Skeleton } from "@/components/ui/skeleton"

/**
 * 카테고리 라우트 전환 중 표시할 로딩 UI입니다.
 * 페이지 JS/데이터 준비 전에도 즉시 카드 스켈레톤을 보여줍니다.
 */
export default function Loading() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-md" />
        <Skeleton className="h-8 w-40" />
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {/* 초기 진입에서 충분히 뼈대가 보이도록 8개 카드를 고정 렌더합니다. */}
        {Array.from({ length: 8 }).map((_, index) => (
          <ProductCardSkeleton key={`category-loading-skeleton-${index}`} />
        ))}
      </div>
    </div>
  )
}
