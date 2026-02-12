// =============================================================================
// 사용자 주문 목록 API - GET /api/user/orders
// 로그인 사용자의 주문 목록 조회(상품·결제 정보 포함)
// =============================================================================

import { NextResponse } from 'next/server'
import prismaClient from '@/lib/prismaClient'
import { OrderStatus, PaymentStatus, Order } from '@prisma/client'
import { getAuthFromRequest } from '@/lib/authFromRequest'
import { getCdnUrl } from '@/lib/cdn'

// 주문 항목의 타입 정의
export interface FormattedOrderItem {
  id: number;
  orderId: number;
  productId: number;
  quantity: number;
  price: number;
  createdAt: Date;
  updatedAt: Date;
  product: {
    id: number;
    name: string;
    imageSrc: string;
  };
}

// API 응답을 위한 주문 타입 정의
// Omit<Order, 'items'> 문법은 Order 타입에서 'items' 필드만 제외한 타입을 만든다는 의미입니다.
// 즉, Order 타입의 모든 필드는 포함하지만, 'items' 필드는 빼고 나머지만 상속받습니다.
export interface FormattedOrder extends Omit<Order, 'items'> {
  items: FormattedOrderItem[];
  payment: {
    id: number
    orderId: number
    paymentMethod: string
    amount: number
    transactionId: string
    paymentOrderId: string
    status: PaymentStatus
    createdAt: Date
    updatedAt: Date
  } | null
}

// API 응답 타입 정의
export interface OrdersResponse {
  orders: FormattedOrder[]
  nextCursor: number | null
}

// 주문 목록 조회를 위한 파라미터 타입
export interface OrdersQueryParams {
  pageParam?: number | null
  status?: OrderStatus | null
}

export interface OrderDetailsParams {
  pageParam?: number | null
  status?: OrderStatus | null
}

export async function GET(request: Request) {
  const auth = await getAuthFromRequest(request)
  if (!auth?.id) {
    return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })
  }
  const userId = auth.id

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status') as OrderStatus | null
  const cursor = searchParams.get('cursor')
  const limit = Number(searchParams.get('limit') || '5')

  // 필터 조건 구성
  const where = {
    userId,
    ...(status ? { status } : {}),
  }

  // 페이지네이션 설정
  const pagination = {
    take: limit,
    ...(cursor ? { skip: 1, cursor: { id: Number(cursor) } } : {}),
  }

  try {
    // Prisma를 사용하여 주문 데이터 조회
    const orders = await prismaClient.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      ...pagination,
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                images: {
                  select: {
                    thumbnail: true,
                  },
                  take: 1,
                },
              },
            },
          },
        },
        payment: true,
      },
    })

    // 다음 페이지 커서 계산
    const nextCursor =
      orders.length === limit ? orders[orders.length - 1].id : null

    // 응답 데이터 가공
    type OrderRow = (typeof orders)[number]
    type OrderItemRow = OrderRow["items"][number]
    const formattedOrders = orders.map((order: OrderRow) => ({
      ...order,
      items: order.items.map((item: OrderItemRow) => ({
        ...item,
        product: {
          ...item.product,
          imageSrc: getCdnUrl(item.product.images?.[0]?.thumbnail) || '/placeholder.svg',
        },
      })),
    }))

    return NextResponse.json({
      orders: formattedOrders,
      nextCursor,
    })
  } catch (error) {
    console.error('주문 조회 오류:', error)
    return NextResponse.json(
      { error: '주문 조회 중 오류가 발생했습니다' },
      { status: 500 },
    )
  }
}
