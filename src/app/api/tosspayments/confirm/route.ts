// =============================================================================
// 토스페이먼츠 결제 승인 API - POST /api/tosspayments/confirm
// paymentKey, orderId, amount, data 수신 → 토스 승인 호출 후 주문/결제 DB 저장
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
    const { paymentKey, orderId, amount, data } = await req.json()

    const auth = await getAuthFromRequest(req)
    if (!auth?.id) {
      return NextResponse.json(
        { message: '로그인이 필요합니다.' },
        { status: 401 }
      )
    }

    console.log('paymentKey:', paymentKey)
    console.log('orderId:', orderId)
    console.log('amount:', amount)
    console.log('data:', data)

    const parsedData = JSON.parse(data)


    console.log('parsedData:', parsedData)
    const shippingAddress =
      typeof parsedData?.address === "string" ? parsedData.address.trim() : ""
    const geocodedShipping = shippingAddress
      ? await geocodeAddress(shippingAddress)
      : null

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
    // TS 버전 차이로 인한 implicit any를 막기 위해 트랜잭션 클라이언트 타입을 명시합니다.
    await prismaClient.$transaction(async (prisma: any) => {
      try {
        // 토스 승인(status=DONE)이 끝난 시점이므로 주문/결제 상태를 즉시 PAID로 저장합니다.
        // 웹훅 지연/누락이 있어도 관리자 통계와 주문 이력이 즉시 일관되게 보이도록 합니다.
        // 주문 생성
        const order = await prisma.order.create({
          data: {
            totalAmount: +amount,
            status: OrderStatus.PAID,
            userId: auth.id,
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
                paymentMethod: result.method,
                amount: result.suppliedAmount,
                transactionId: result.paymentKey,
                paymentOrderId: result.orderId,
                status: PaymentStatus.PAID,
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
