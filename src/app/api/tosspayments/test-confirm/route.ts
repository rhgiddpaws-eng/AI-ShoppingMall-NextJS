// =============================================================================
// 테스트 결제 승인 API - POST /api/tosspayments/test-confirm
// 실제 결제 없이 주문/결제 레코드만 생성 (개발·테스트용)
// =============================================================================

import { NextResponse } from 'next/server'
import prismaClient from '@/lib/prismaClient'
// Prisma named export 이슈를 피하기 위해 공용 enum 상수를 사용합니다.
import { OrderStatus, PaymentStatus } from '@/lib/orderEnums'
import { getAuthFromRequest } from '@/lib/authFromRequest'
import { CartItem } from '@/lib/cart'
import { geocodeAddress } from '@/lib/naverGeocode'

export async function POST(req: Request) {
  try {
    const { amount, data } = await req.json()

    const auth = await getAuthFromRequest(req)
    if (!auth?.id) {
      return NextResponse.json(
        { message: '로그인이 필요합니다.' },
        { status: 401 }
      )
    }
    const userId = auth.id

    const parsedData = typeof data === 'string' ? JSON.parse(data) : data
    const shippingAddress =
      typeof parsedData?.address === "string" ? parsedData.address.trim() : ""
    const geocodedShipping = shippingAddress
      ? await geocodeAddress(shippingAddress)
      : null
    const totalAmount = Number(amount) || 0
    if (!parsedData?.cart?.length || totalAmount <= 0) {
      return NextResponse.json(
        { message: '주문 정보가 올바르지 않습니다.' },
        { status: 400 }
      )
    }

    const testOrderId = `test-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`

    // TS 버전 차이로 인한 implicit any를 막기 위해 트랜잭션 클라이언트 타입을 명시합니다.
    await prismaClient.$transaction(async (prisma: any) => {
      await prisma.order.create({
        data: {
          totalAmount,
          status: OrderStatus.PAID,
          userId,
          shippingAddress: shippingAddress || null,
          shippingLat: geocodedShipping?.lat ?? null,
          shippingLng: geocodedShipping?.lng ?? null,
          items: {
            create: parsedData.cart.map((item: CartItem) => ({
              productId: +item.id,
              quantity: item.quantity,
              price: item.price,
            })),
          },
          payment: {
            create: {
              paymentMethod: '테스트',
              amount: totalAmount,
              transactionId: testOrderId,
              paymentOrderId: testOrderId,
              status: PaymentStatus.PAID,
            },
          },
        },
      })
    })

    return NextResponse.json({ message: '테스트 결제 완료' })
  } catch (error) {
    console.error('테스트 결제 처리 오류:', error)
    return NextResponse.json(
      {
        message: '테스트 결제 처리 중 오류가 발생했습니다.',
        error: error instanceof Error ? error.message : '알 수 없는 오류',
      },
      { status: 500 }
    )
  }
}
