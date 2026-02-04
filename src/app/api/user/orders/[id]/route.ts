import { NextResponse } from 'next/server'
import prismaClient from '@/lib/prismaClient'
import { getSession } from '@/lib/ironSessionControl'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  // 인증된 사용자 세션 가져오기
  const preSession = await getSession()
  const session = {
    ...preSession,
  }

  if (!session || !session.id || !session.isLoggedIn) {
    return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })
  }

  const userId = Number(session.id)
  const orderId = Number((await params).id)

  if (isNaN(orderId)) {
    return NextResponse.json(
      { error: '유효하지 않은 주문 ID입니다' },
      { status: 400 },
    )
  }

  try {
    // Prisma를 사용하여 주문 상세 정보 조회
    const order = await prismaClient.order.findUnique({
      where: {
        id: orderId,
        userId, // 자신의 주문만 조회 가능
      },
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

    if (!order) {
      return NextResponse.json(
        { error: '주문을 찾을 수 없습니다' },
        { status: 404 },
      )
    }

    // 응답 데이터 가공
    const formattedOrder = {
      ...order,
      items: order.items.map(item => ({
        ...item,
        product: {
          ...item.product,
          imageSrc: item.product.images?.[0]?.thumbnail || '/placeholder.svg',
        },
      })),
    }

    return NextResponse.json(formattedOrder)
  } catch (error) {
    console.error('주문 상세 조회 오류:', error)
    return NextResponse.json(
      { error: '주문 상세 조회 중 오류가 발생했습니다' },
      { status: 500 },
    )
  }
}
