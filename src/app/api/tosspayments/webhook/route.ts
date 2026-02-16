// =============================================================================
// 토스페이먼츠 웹훅 API - POST /api/tosspayments/webhook
// 결제 상태 변경 이벤트(PAYMENT_STATUS_CHANGED) 수신 시 Order/Payment 상태 업데이트
// =============================================================================

import { NextRequest } from 'next/server'
import prismaClient from '@/lib/prismaClient'
// Prisma named export 이슈를 피하기 위해 공용 enum 상수를 사용합니다.
import { OrderStatus, PaymentStatus } from '@/lib/orderEnums'

export async function POST(req: NextRequest) {
  
  const body = await req.json()

  console.log('body in tosspayments webhook route:', body)

  try {
    const { eventType, orderId, status } = body
    
    // 이벤트 타입이 결제 상태 변경인 경우만 처리
    if (eventType === 'PAYMENT_STATUS_CHANGED') {
      // orderId로 결제 정보 검색
      const payment = await prismaClient.payment.findFirst({
        where: { paymentOrderId: orderId }
      })

      if (!payment) {
        console.error(`Payment not found for orderId: ${orderId}`)
        return new Response('Payment not found', { status: 404 })
      }

      // 주문 정보 검색
      const order = await prismaClient.order.findUnique({
        where: { id: payment.orderId }
      })

      if (!order) {
        console.error(`Order not found for payment: ${payment.id}`)
        return new Response('Order not found', { status: 404 })
      }

      // 결제 상태에 따른 업데이트 처리
      if (status === 'DONE') {
        // 결제 성공: PAID로 상태 업데이트
        await prismaClient.$transaction([
          prismaClient.payment.update({
            where: { id: payment.id },
            data: { status: PaymentStatus.PAID }
          }),
          prismaClient.order.update({
            where: { id: order.id },
            data: { status: OrderStatus.PAID }
          })
        ])
        console.log(`Payment success for orderId: ${orderId}`)
      } else if (status === 'CANCELED' || status === 'ABORTED') {
        // 결제 실패: FAILED로 상태 업데이트
        await prismaClient.$transaction([
          prismaClient.payment.update({
            where: { id: payment.id },
            data: { status: PaymentStatus.FAILED }
          }),
          prismaClient.order.update({
            where: { id: order.id },
            data: { status: OrderStatus.CANCELED }
          })
        ])
        console.log(`Payment failed for orderId: ${orderId}`)
      }
    }

    return new Response('OK', { status: 200 })
  } catch (error) {
    console.error('Error processing webhook:', error)
    return new Response('Internal Server Error', { status: 500 })
  }
}
