/**
 * /api/user/cart — 로그인 사용자 장바구니 API (서버 관리)
 * - GET: 장바구니 목록 조회. Cart 없으면 생성 후 빈 배열 반환.
 * - POST: 품목 추가 또는 수량 반영. body: { productId, quantity? }
 * - PATCH: 수량만 변경. body: { productId, quantity }. quantity 0이면 해당 품목 삭제.
 * - DELETE: productId 쿼리 있으면 해당 품목 삭제, 없으면 장바구니 전체 비우기.
 */
import { NextResponse } from 'next/server'
import prismaClient from '@/lib/prismaClient'
import { getAuthFromRequest } from '@/lib/authFromRequest'
import type { CartItem } from '@/lib/cart'
import { getCdnUrl } from '@/lib/cdn'

/** GET /api/user/cart — 로그인 사용자 장바구니 조회. Cart 없으면 생성 후 빈 배열 반환 */
export async function GET(request: Request) {
  const auth = await getAuthFromRequest(request)
  if (!auth?.id) {
    return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })
  }
  const userId = auth.id

  try {
    let cart = await prismaClient.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                price: true,
                category: true,
                discountRate: true,
                images: { select: { thumbnail: true }, take: 1 },
              },
            },
          },
        },
      },
    })

    if (!cart) {
      cart = await prismaClient.cart.create({
        data: { userId },
        include: {
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  price: true,
                  category: true,
                  discountRate: true,
                  images: { select: { thumbnail: true }, take: 1 },
                },
              },
            },
          },
        },
      })
    }

    type CartItemEntry = (typeof cart)["items"][number]
    const items: CartItem[] = cart.items.map((item: CartItemEntry) => ({
      id: String(item.productId),
      name: item.product.name,
      price: Number(item.product.price),
      imageSrc: getCdnUrl(item.product.images?.[0]?.thumbnail) || '/placeholder.svg',
      quantity: item.quantity,
      category: item.product.category ?? undefined,
    }))

    return NextResponse.json({ cart: items })
  } catch (error) {
    console.error('장바구니 조회 오류:', error)
    return NextResponse.json(
      { error: '장바구니 조회 중 오류가 발생했습니다' },
      { status: 500 },
    )
  }
}

/** POST /api/user/cart — 장바구니에 추가 또는 수량 변경. body: { productId: number, quantity?: number } */
export async function POST(request: Request) {
  const auth = await getAuthFromRequest(request)
  if (!auth?.id) {
    return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })
  }
  const userId = auth.id

  let body: { productId: number; quantity?: number }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: '잘못된 요청 본문입니다' }, { status: 400 })
  }
  const { productId, quantity = 1 } = body
  if (!productId || quantity < 1) {
    return NextResponse.json(
      { error: 'productId와 quantity(1 이상)가 필요합니다' },
      { status: 400 },
    )
  }

  try {
    let cart = await prismaClient.cart.findUnique({ where: { userId } })
    if (!cart) {
      cart = await prismaClient.cart.create({ data: { userId } })
    }

    await prismaClient.cartItem.upsert({
      where: {
        cartId_productId: { cartId: cart.id, productId },
      },
      create: { cartId: cart.id, productId, quantity },
      update: { quantity },
    })

    const updated = await prismaClient.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                price: true,
                category: true,
                images: { select: { thumbnail: true }, take: 1 },
              },
            },
          },
        },
      },
    })

    type CartItemEntry = NonNullable<typeof updated>["items"][number]
    const items: CartItem[] = (updated?.items ?? []).map((item: CartItemEntry) => ({
      id: String(item.productId),
      name: item.product.name,
      price: Number(item.product.price),
      imageSrc: getCdnUrl(item.product.images?.[0]?.thumbnail) || '/placeholder.svg',
      quantity: item.quantity,
      category: item.product.category ?? undefined,
    }))

    return NextResponse.json({ cart: items })
  } catch (error) {
    console.error('장바구니 추가/수정 오류:', error)
    return NextResponse.json(
      { error: '장바구니 처리 중 오류가 발생했습니다' },
      { status: 500 },
    )
  }
}

/** DELETE /api/user/cart — productId 쿼리 있으면 해당 품목 삭제, 없으면 장바구니 비우기 */
export async function DELETE(request: Request) {
  const auth = await getAuthFromRequest(request)
  if (!auth?.id) {
    return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })
  }
  const userId = auth.id

  const { searchParams } = new URL(request.url)
  const productIdParam = searchParams.get('productId')

  try {
    const cart = await prismaClient.cart.findUnique({ where: { userId } })
    if (!cart) {
      return NextResponse.json({ cart: [] })
    }

    if (productIdParam) {
      const productId = Number(productIdParam)
      if (Number.isNaN(productId)) {
        return NextResponse.json({ error: '유효한 productId가 필요합니다' }, { status: 400 })
      }
      await prismaClient.cartItem.deleteMany({
        where: { cartId: cart.id, productId },
      })
    } else {
      await prismaClient.cartItem.deleteMany({ where: { cartId: cart.id } })
    }

    const updated = await prismaClient.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                price: true,
                category: true,
                images: { select: { thumbnail: true }, take: 1 },
              },
            },
          },
        },
      },
    })

    type CartItemEntry = NonNullable<typeof updated>["items"][number]
    const items: CartItem[] = (updated?.items ?? []).map((item: CartItemEntry) => ({
      id: String(item.productId),
      name: item.product.name,
      price: Number(item.product.price),
      imageSrc: getCdnUrl(item.product.images?.[0]?.thumbnail) || '/placeholder.svg',
      quantity: item.quantity,
      category: item.product.category ?? undefined,
    }))

    return NextResponse.json({ cart: items })
  } catch (error) {
    console.error('장바구니 삭제 오류:', error)
    return NextResponse.json(
      { error: '장바구니 삭제 중 오류가 발생했습니다' },
      { status: 500 },
    )
  }
}

/** PATCH /api/user/cart — 수량만 변경. body: { productId: number, quantity: number } */
export async function PATCH(request: Request) {
  const auth = await getAuthFromRequest(request)
  if (!auth?.id) {
    return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })
  }
  const userId = auth.id

  let body: { productId: number; quantity: number }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: '잘못된 요청 본문입니다' }, { status: 400 })
  }
  const { productId, quantity } = body
  if (productId == null || quantity == null || quantity < 0) {
    return NextResponse.json(
      { error: 'productId와 quantity(0 이상)가 필요합니다' },
      { status: 400 },
    )
  }

  try {
    const cart = await prismaClient.cart.findUnique({ where: { userId } })
    if (!cart) {
      return NextResponse.json({ cart: [] })
    }

    if (quantity === 0) {
      await prismaClient.cartItem.deleteMany({
        where: { cartId: cart.id, productId },
      })
    } else {
      await prismaClient.cartItem.updateMany({
        where: { cartId: cart.id, productId },
        data: { quantity },
      })
    }

    const updated = await prismaClient.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                price: true,
                category: true,
                images: { select: { thumbnail: true }, take: 1 },
              },
            },
          },
        },
      },
    })

    type CartItemEntry = NonNullable<typeof updated>["items"][number]
    const items: CartItem[] = (updated?.items ?? []).map((item: CartItemEntry) => ({
      id: String(item.productId),
      name: item.product.name,
      price: Number(item.product.price),
      imageSrc: getCdnUrl(item.product.images?.[0]?.thumbnail) || '/placeholder.svg',
      quantity: item.quantity,
      category: item.product.category ?? undefined,
    }))

    return NextResponse.json({ cart: items })
  } catch (error) {
    console.error('장바구니 수량 변경 오류:', error)
    return NextResponse.json(
      { error: '장바구니 수정 중 오류가 발생했습니다' },
      { status: 500 },
    )
  }
}
