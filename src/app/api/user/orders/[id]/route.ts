// =============================================================================
// 사용자 주문 상세 API - GET /api/user/orders/[id]
// 로그인 사용자가 본인 주문만 조회할 수 있습니다.
// =============================================================================

import { NextResponse } from 'next/server'
import prismaClient from '@/lib/prismaClient'
import { getAuthFromRequest } from '@/lib/authFromRequest'
import { getCdnUrl } from '@/lib/cdn'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await getAuthFromRequest(request)
  if (!auth?.id) {
    return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
  }

  const userId = auth.id
  const orderId = Number((await params).id)
  if (!Number.isInteger(orderId)) {
    return NextResponse.json({ error: '유효하지 않은 주문 ID입니다.' }, { status: 400 })
  }

  try {
    const order = await prismaClient.order.findFirst({
      where: { id: orderId, userId },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                images: {
                  select: { thumbnail: true },
                  take: 1,
                },
              },
            },
          },
        },
        payment: true,
      },
    })

    if (!order) {
      return NextResponse.json({ error: '주문을 찾을 수 없습니다.' }, { status: 404 })
    }

    const formattedOrder = {
      ...order,
      items: order.items.map((item) => ({
        ...item,
        product: {
          ...item.product,
          imageSrc: getCdnUrl(item.product.images?.[0]?.thumbnail) || '/placeholder.svg',
        },
      })),
    }

    return NextResponse.json(formattedOrder)
  } catch (error) {
    console.error('주문 상세 조회 오류:', error)
    return NextResponse.json({ error: '주문 상세 조회 중 오류가 발생했습니다.' }, { status: 500 })
  }
}
