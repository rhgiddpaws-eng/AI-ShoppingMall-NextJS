// =============================================================================
// 토스페이먼츠 결제 승인 API - POST /api/tosspayments/confirm
// paymentKey, orderId, amount, data 수신 → 토스 승인 호출 후 주문/결제 DB 저장
// =============================================================================

import { NextResponse } from 'next/server'
import prismaClient from '@/lib/prismaClient'
import { OrderStatus, PaymentStatus } from '@prisma/client'
import { getSession } from '@/lib/ironSessionControl'
import { CartItem } from '@/lib/cart'

export async function POST(req: Request) {
  try {
    const { paymentKey, orderId, amount, data } = await req.json()

    const session = await getSession()

    const parsedSession = {
      ...session,
    }

    if (!parsedSession.id) {
      return NextResponse.json({
        message: '로그인이 필요합니다.',
      })
    }

    console.log('paymentKey:', paymentKey)
    console.log('orderId:', orderId)
    console.log('amount:', amount)
    console.log('data:', data)

    const parsedData = JSON.parse(data)


    console.log('parsedData:', parsedData)

    const secretKey = 'test_gsk_docs_OaPz8L5KdmQXkzRz3y47BMw6'
    
    // Base64로 인코딩된 인증 키 생성
    const encryptedSecretKey = 'Basic ' + Buffer.from(secretKey + ':').toString('base64')

    // 결제 취소 함수 추가
    async function cancelPayment(paymentKey: string, cancelReason: string) {
      const response = await fetch(
        `https://api.tosspayments.com/v1/payments/${paymentKey}/cancel`,
        {
          method: 'POST',
          headers: {
            Authorization: encryptedSecretKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            cancelReason,
          }),
        }
      )
      
      const data = await response.json()
      console.log('결제 취소 응답:', data)
      return data
    }

    async function confirmPayment() {
      const response = await fetch(
        'https://api.tosspayments.com/v1/payments/confirm',
        {
          method: 'POST',
          body: JSON.stringify({ orderId, amount, paymentKey }),
          headers: {
            Authorization: encryptedSecretKey,
            'Content-Type': 'application/json',
          },
        },
      )
      const data = await response.json()
      console.log('결제 승인 응답:', data)

      return data
    }

    // 결제 승인 처리
    const result = await confirmPayment()

    if (result.status !== 'DONE') {
      return NextResponse.json({
        message: '결제 승인 실패',
      })
    }

    // 데이터베이스 트랜잭션 처리
    const createdOrder = await prismaClient.$transaction(async (prisma) => {
      try {
        // 주문 생성
        const order = await prisma.order.create({
          data: {
            totalAmount: +amount,
            status: OrderStatus.PENDING,
            userId: parsedSession.id!,
            items: {
              create: parsedData.cart.map((item: CartItem) => ({
                productId: +item.id,
                quantity: item.quantity,
                price: item.price,
              })),
            },
            payment: {
              create: {
                paymentMethod: result.method,
                amount: result.suppliedAmount,
                transactionId: result.paymentKey,
                paymentOrderId: result.orderId,
                status: PaymentStatus.WAITING,
              },
            },
          },
        })
        
        return order;
      } catch (error) {
        // 데이터베이스 처리 중 오류 발생 시 결제 취소
        console.error('데이터베이스 처리 오류:', error);
        await cancelPayment(paymentKey, '주문 처리 중 오류 발생');
        throw error;
      }
    });

    // console.log('result in tosspayments confirm route:', result)

    return NextResponse.json({
      message: '결제 승인 완료',
    })
  } catch (error) {
    console.error('결제 처리 중 오류 발생:', error);
    
    // 이미 결제가 승인되었다면 취소 시도
    if (error instanceof Error) {
      try {
        const { paymentKey } = await req.json();
        if (paymentKey) {
          const secretKey = 'test_gsk_docs_OaPz8L5KdmQXkzRz3y47BMw6';
          const encryptedSecretKey = 'Basic ' + Buffer.from(secretKey + ':').toString('base64');
          
          const response = await fetch(
            `https://api.tosspayments.com/v1/payments/${paymentKey}/cancel`,
            {
              method: 'POST',
              headers: {
                Authorization: encryptedSecretKey,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                cancelReason: '시스템 오류로 인한 결제 취소',
              }),
            }
          );
          
          console.log('결제 취소 시도:', await response.json());
        }
      } catch (cancelError) {
        console.error('결제 취소 중 오류:', cancelError);
      }
    }
    
    return NextResponse.json({
      message: '결제 처리 중 오류가 발생했습니다',
      error: error instanceof Error ? error.message : '알 수 없는 오류',
    }, { status: 500 });
  }
}
