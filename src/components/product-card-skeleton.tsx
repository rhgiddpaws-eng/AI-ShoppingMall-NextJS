"use client"

import { Skeleton } from "@/components/ui/skeleton"

/**
 * 상품 카드 스켈레톤입니다.
 * - 데이터 로딩 중에도 카드 레이아웃(이미지/텍스트 자리)을 먼저 보여줘
 *   화면이 비어 보이는 시간을 줄입니다.
 */
export function ProductCardSkeleton() {
  return (
    <div className="group block">
      <div className="relative overflow-hidden rounded-lg">
        {/* 실제 카드와 동일한 비율의 이미지 자리 */}
        <Skeleton className="aspect-[7/8] w-full rounded-lg" />

        <div className="mt-2 space-y-2 py-4">
          {/* 상품명 2줄 자리 */}
          <Skeleton className="h-5 w-4/5" />
          <Skeleton className="h-5 w-3/5" />
          {/* 카테고리 자리 */}
          <Skeleton className="h-3 w-1/3" />
          {/* 가격 자리 */}
          <Skeleton className="h-5 w-2/5" />
        </div>
      </div>
    </div>
  )
}

