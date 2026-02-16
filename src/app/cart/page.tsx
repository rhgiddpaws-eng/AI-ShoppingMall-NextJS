"use client"
// =============================================================================
// 장바구니 페이지 - /cart
// 장바구니 목록, 상품 금액/배송비/총 결제 금액, 결제하기 버튼
// =============================================================================

import Link from "next/link"
import { ArrowLeft, ShoppingCart } from "lucide-react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import CartItem from "@/components/cart-item"
import { useShopStore, useAuthStore } from "@/lib/store"

/** 장바구니: 상품 목록, 주문 요약(5만원 이상 무료배송), 결제하기 이동 */
export default function CartPage() {
  const { cart } = useShopStore()
  const { user } = useAuthStore()
  const router = useRouter()

  const totalAmount = cart.reduce((total, item) => total + item.price * item.quantity, 0)
  const shippingFee = totalAmount > 50000 ? 0 : 3000
  const finalAmount = totalAmount + shippingFee

  if (cart.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8 min-h-screen">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center mb-8">
            <Button variant="ghost" size="icon" asChild className="mr-2">
              <Link href="/">
                <ArrowLeft className="h-5 w-5" />
                <span className="sr-only">뒤로 가기</span>
              </Link>
            </Button>
            <h1 className="text-2xl font-bold">장바구니</h1>
          </div>

          <div className="text-center py-16 border rounded-lg">
            <ShoppingCart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-medium mb-2">장바구니가 비어있습니다</h2>
            <p className="text-muted-foreground mb-6">장바구니에 상품을 추가해보세요.</p>
            <Button asChild>
              <Link href="/">쇼핑 계속하기</Link>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 min-h-screen">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center mb-8">
          <Button variant="ghost" size="icon" asChild className="mr-2">
            <Link href="/">
              <ArrowLeft className="h-5 w-5" />
              <span className="sr-only">뒤로 가기</span>
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">장바구니</h1>
        </div>

        {user === undefined ? null : !user ? (
          <p className="text-sm text-muted-foreground mb-4 rounded-md bg-muted/50 p-3">
            비로그인 시 장바구니는 이 기기에서만 저장됩니다. 로그인하면 서버에 저장되어 다른 기기에서도 볼 수 있습니다.
          </p>
        ) : null}

        <div className="mb-8">
          {cart.map((item) => (
            <CartItem key={item.id} item={item} />
          ))}
        </div>

        <div className="border rounded-lg p-6 bg-muted/10">
          <h2 className="text-lg font-medium mb-4">주문 요약</h2>

          <div className="space-y-2 mb-4">
            <div className="flex justify-between">
              <span className="text-muted-foreground">상품 금액</span>
              <span>{totalAmount.toLocaleString()}원</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">배송비</span>
              <span>{shippingFee === 0 ? "무료" : `${shippingFee.toLocaleString()}원`}</span>
            </div>
            {shippingFee > 0 && <div className="text-xs text-muted-foreground">* 50,000원 이상 구매 시 무료 배송</div>}
          </div>

          <Separator className="my-4" />

          <div className="flex justify-between font-medium text-lg mb-6">
            <span>총 결제 금액</span>
            <span>{finalAmount.toLocaleString()}원</span>
          </div>

          <Button className="w-full" size="lg" onClick={() => router.push("/checkout")}>
            결제하기
          </Button>

          <div className="mt-4 text-center">
            <Link href="/" className="text-sm text-primary hover:underline">
              쇼핑 계속하기
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

