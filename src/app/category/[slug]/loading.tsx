import { LoadingSpinner } from "@/components/ui/loading-spinner"

/**
 * 카테고리 라우트 전환 중 표시할 로딩 UI입니다.
 * 페이지 JS/데이터 준비 전에도 즉시 스피너를 보여줍니다.
 */
export default function Loading() {
  return (
    <div className="container mx-auto flex min-h-[50vh] items-center justify-center px-4 py-8">
      <LoadingSpinner size={28} label="카테고리 페이지를 여는 중" />
    </div>
  )
}
