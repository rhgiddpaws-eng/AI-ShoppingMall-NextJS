/**
 * /api/user/wishlist — 로그인 사용자 위시리스트 API (서버 관리)
 * - GET: 위시리스트 목록 조회. Wishlist 없으면 생성 후 빈 배열 반환.
 * - POST: 품목 추가. body: { productId }
 * - DELETE: productId 쿼리 있으면 해당 품목 제거, 없으면 전체 비우기.
 */
import { NextResponse } from 'next/server'
import prismaClient from '@/lib/prismaClient'
import { getSession } from '@/lib/ironSessionControl'
import type { WishlistItem } from '@/lib/wishlist'
import { getCdnUrl } from '@/lib/cdn'

/** Prisma generate 실패 시 wishlist/wishlistEntry 접근용 (스키마에는 Wishlist·WishlistEntry 존재) */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const prisma = prismaClient as any

/** 위시리스트 항목(상품 포함) — map 콜백 타입 */
interface WishlistEntryWithProduct {
  product: {
    id: number
    name: string
    price: number
    category: string | null
    discountRate: number
    images: { thumbnail: string }[]
  }
}

/** GET /api/user/wishlist — 로그인 사용자 위시리스트 조회. 없으면 생성 후 빈 배열 반환 */
export async function GET() {
  const session = await getSession()
  if (!session?.id || !session.isLoggedIn) {
    return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })
  }
  const userId = Number(session.id)

  try {
    let wishlist = await prisma.wishlist.findUnique({
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

    if (!wishlist) {
      wishlist = await prisma.wishlist.create({
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

    const items: WishlistItem[] = wishlist.items.map((entry: WishlistEntryWithProduct) => {
      const p = entry.product
      const price = Number(p.price)
      const salePrice = p.discountRate
        ? price * (1 - Number(p.discountRate) / 100)
        : undefined
      return {
        id: String(p.id),
        name: p.name,
        price,
        imageSrc: getCdnUrl(p.images?.[0]?.thumbnail) || '/placeholder.svg',
        category: p.category ?? undefined,
        salePrice,
      }
    })

    return NextResponse.json({ wishlist: items })
  } catch (error) {
    console.error('위시리스트 조회 오류:', error)
    return NextResponse.json(
      { error: '위시리스트 조회 중 오류가 발생했습니다' },
      { status: 500 },
    )
  }
}

/** POST /api/user/wishlist — 위시리스트에 추가. body: { productId: number } */
export async function POST(request: Request) {
  const session = await getSession()
  if (!session?.id || !session.isLoggedIn) {
    return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })
  }
  const userId = Number(session.id)

  let body: { productId: number }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: '잘못된 요청 본문입니다' }, { status: 400 })
  }
  const { productId } = body
  if (!productId) {
    return NextResponse.json({ error: 'productId가 필요합니다' }, { status: 400 })
  }

  try {
    let wishlist = await prisma.wishlist.findUnique({ where: { userId } })
    if (!wishlist) {
      wishlist = await prisma.wishlist.create({ data: { userId } })
    }

    await prisma.wishlistEntry.upsert({
      where: {
        wishlistId_productId: { wishlistId: wishlist.id, productId },
      },
      create: { wishlistId: wishlist.id, productId },
      update: {},
    })

    const updated = await prisma.wishlist.findUnique({
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

    const items: WishlistItem[] = (updated?.items ?? []).map((entry: WishlistEntryWithProduct) => {
      const p = entry.product
      const price = Number(p.price)
      const salePrice = p.discountRate
        ? price * (1 - Number(p.discountRate) / 100)
        : undefined
      return {
        id: String(p.id),
        name: p.name,
        price,
        imageSrc: getCdnUrl(p.images?.[0]?.thumbnail) || '/placeholder.svg',
        category: p.category ?? undefined,
        salePrice,
      }
    })

    return NextResponse.json({ wishlist: items })
  } catch (error) {
    console.error('위시리스트 추가 오류:', error)
    return NextResponse.json(
      { error: '위시리스트 추가 중 오류가 발생했습니다' },
      { status: 500 },
    )
  }
}

/** DELETE /api/user/wishlist?productId=1 — 해당 품목 제거. productId 없으면 전체 비우기 */
export async function DELETE(request: Request) {
  const session = await getSession()
  if (!session?.id || !session.isLoggedIn) {
    return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })
  }
  const userId = Number(session.id)

  const { searchParams } = new URL(request.url)
  const productIdParam = searchParams.get('productId')

  try {
    const wishlist = await prisma.wishlist.findUnique({ where: { userId } })
    if (!wishlist) {
      return NextResponse.json({ wishlist: [] })
    }

    if (productIdParam) {
      const productId = Number(productIdParam)
      if (Number.isNaN(productId)) {
        return NextResponse.json({ error: '유효한 productId가 필요합니다' }, { status: 400 })
      }
      await prisma.wishlistEntry.deleteMany({
        where: { wishlistId: wishlist.id, productId },
      })
    } else {
      await prisma.wishlistEntry.deleteMany({
        where: { wishlistId: wishlist.id },
      })
    }

    const updated = await prisma.wishlist.findUnique({
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

    const items: WishlistItem[] = (updated?.items ?? []).map((entry: WishlistEntryWithProduct) => {
      const p = entry.product
      const price = Number(p.price)
      const salePrice = p.discountRate
        ? price * (1 - Number(p.discountRate) / 100)
        : undefined
      return {
        id: String(p.id),
        name: p.name,
        price,
        imageSrc: getCdnUrl(p.images?.[0]?.thumbnail) || '/placeholder.svg',
        category: p.category ?? undefined,
        salePrice,
      }
    })

    return NextResponse.json({ wishlist: items })
  } catch (error) {
    console.error('위시리스트 삭제 오류:', error)
    return NextResponse.json(
      { error: '위시리스트 삭제 중 오류가 발생했습니다' },
      { status: 500 },
    )
  }
}
