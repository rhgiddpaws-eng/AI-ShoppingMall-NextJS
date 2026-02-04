'use client'

import type React from 'react'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, CreditCard } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { useShopStore } from '@/lib/store'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'

export default function CheckoutPage() {
  const router = useRouter()
  const { cart, clearCart } = useShopStore()
  const [isLoading, setIsLoading] = useState(false)

  const totalAmount = cart.reduce(
    (total, item) => total + item.price * item.quantity,
    0,
  )
  const shippingFee = totalAmount > 50000 ? 0 : 3000
  const finalAmount = totalAmount + shippingFee

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsLoading(true)

    // 여기에 실제 결제 처리 로직을 구현합니다.
    // 예: API 호출, 결제 게이트웨이 연동 등
    await new Promise(resolve => setTimeout(resolve, 2000)) // 결제 처리 시뮬레이션

    setIsLoading(false)
    clearCart()
    toast.success('주문이 완료되었습니다')
    router.push('/order-confirmation') // 주문 확인 페이지로 이동 (이 페이지는 별도로 만들어야 합니다)
  }

  if (cart.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-4">장바구니가 비어있습니다</h1>
        <Button onClick={() => router.push('/')} className="mt-4">
          쇼핑 계속하기
        </Button>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => router.back()}
        className="mb-4"
      >
        <ArrowLeft className="h-5 w-5" />
        <span className="sr-only">뒤로 가기</span>
      </Button>

      <h1 className="text-2xl font-bold mb-8">결제하기</h1>

      <div className="grid md:grid-cols-2 gap-8">
        <div>
          <h2 className="text-xl font-semibold mb-4">주문 상품</h2>
          {cart.map(item => (
            <div key={item.id} className="flex items-center mb-4">
              <img
                src={item.imageSrc || '/placeholder.svg'}
                alt={item.name}
                className="w-16 h-16 object-cover rounded mr-4"
              />
              <div>
                <h3 className="font-medium">{item.name}</h3>
                <p className="text-sm text-gray-600">
                  {item.quantity}개 x {item.price.toLocaleString()}원
                </p>
              </div>
            </div>
          ))}

          <Separator className="my-4" />

          <div className="space-y-2">
            <div className="flex justify-between">
              <span>상품 금액</span>
              <span>{totalAmount.toLocaleString()}원</span>
            </div>
            <div className="flex justify-between">
              <span>배송비</span>
              <span>
                {shippingFee === 0
                  ? '무료'
                  : `${shippingFee.toLocaleString()}원`}
              </span>
            </div>
            <div className="flex justify-between font-semibold">
              <span>총 결제 금액</span>
              <span>{finalAmount.toLocaleString()}원</span>
            </div>
          </div>
        </div>

        <div>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold mb-4">배송 정보</h2>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">이름</Label>
                  <Input id="name" required />
                </div>
                <div>
                  <Label htmlFor="phone">전화번호</Label>
                  <Input id="phone" type="tel" required />
                </div>
                <div>
                  <Label htmlFor="address">주소</Label>
                  <Input id="address" required />
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-xl font-semibold mb-4">결제 방법</h2>
              <RadioGroup defaultValue="card">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="card" id="card" />
                  <Label htmlFor="card">신용카드</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="bank" id="bank" />
                  <Label htmlFor="bank">무통장입금</Label>
                </div>
              </RadioGroup>
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <CreditCard className="mr-2 h-4 w-4 animate-spin" />
                  결제 처리 중...
                </>
              ) : (
                <>
                  <CreditCard className="mr-2 h-4 w-4" />
                  {finalAmount.toLocaleString()}원 결제하기
                </>
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
