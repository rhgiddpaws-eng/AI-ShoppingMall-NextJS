// =============================================================================
// 주문 완료 확인 페이지 - /order-confirmation
// 결제/주문 완료 후 안내 메시지, 홈으로 돌아가기 버튼
// =============================================================================

import Link from "next/link"
import { CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"

/** 주문 완료: 체크 아이콘 + 감사 메시지 + 홈 링크 */
export default function OrderConfirmationPage() {
  return (
    <div className="container mx-auto px-4 py-8 text-center">
      <CheckCircle className="mx-auto h-16 w-16 text-green-500 mb-4" />
      <h1 className="text-2xl font-bold mb-4">주문이 완료되었습니다</h1>
      <p className="mb-8">주문해주셔서 감사합니다. 곧 배송이 시작될 예정입니다.</p>
      <Button asChild>
        <Link href="/">홈으로 돌아가기</Link>
      </Button>
    </div>
  )
}

