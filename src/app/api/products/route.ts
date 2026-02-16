// =============================================================================
// 상품 목록 API - GET /api/products
// 쿼리: category, limit, sort, order, term → 상품 목록(이미지 포함) 반환
// =============================================================================

import { NextRequest, NextResponse } from 'next/server'
import prismaClient from '@/lib/prismaClient'
// @prisma/client의 개별 enum/model 타입 import 에러를 피하기 위해
// API 응답에서 실제로 쓰는 최소 타입만 로컬로 정의합니다.

export type ProductImage = {
  id: number
  original: string
  thumbnail: string
}

export type ProductWithImages = {
  id: number
  name: string
  price: number
  images: ProductImage[]
}

export type ProductsResponseType = ProductWithImages[]

/** orderBy에 사용 가능한 Product 필드 (Prisma 쿼리 오류 방지) */
const ALLOWED_SORT_KEYS = ['id', 'name', 'price', 'createdAt', 'updatedAt'] as const
// 카테고리 입력을 DB enum 값으로 제한해서 잘못된 쿼리 입력을 방지합니다.
const ALLOWED_CATEGORY_VALUES = ['MEN', 'WOMEN', 'ACCESSORIES', 'SHOES', 'SALE', 'NEW'] as const
type ProductCategoryValue = (typeof ALLOWED_CATEGORY_VALUES)[number]

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)

  const categoryRaw = searchParams.get('category')
    ? searchParams.get('category')?.toUpperCase()
    : null
  const category =
    categoryRaw != null && ALLOWED_CATEGORY_VALUES.includes(categoryRaw as ProductCategoryValue)
      ? (categoryRaw as ProductCategoryValue)
      : null
  const limitRaw = searchParams.get('limit') || '20'
  const sortRaw = searchParams.get('sort') || 'createdAt'
  const orderRaw = searchParams.get('order') || 'desc'
  const term = searchParams.get('term') || ''

  const sort = ALLOWED_SORT_KEYS.includes(sortRaw as (typeof ALLOWED_SORT_KEYS)[number])
    ? sortRaw
    : 'createdAt'
  const order = orderRaw === 'asc' || orderRaw === 'desc' ? orderRaw : 'desc'
  const parsedLimit = parseInt(limitRaw, 10)
  const take = Number.isNaN(parsedLimit) || parsedLimit < 1 ? 20 : Math.min(parsedLimit, 100)

  try {
    const products = await prismaClient.product.findMany({
      where: {
        status: "PUBLISHED" as const,
        ...(category != null && { category }),
        ...(term && {
          name: {
            contains: term,
            mode: 'insensitive',
          },
        }),
      },
      take,
      include: {
        images: true,
      },
      orderBy: {
        [sort]: order,
      },
    })

    // const response = await fetch('https://jsonplaceholder.typicode.com/posts')
    // const mockProducts: MockProduct[] = await response.json()

    // const products: Product[] = mockProducts.slice(0, 20).map(mockProduct => ({
    //   id: mockProduct.id.toString(),
    //   name: mockProduct.title.slice(0, 30),
    //   price: Math.floor(Math.random() * 100000) + 10000,
    //   description: mockProduct.body,
    //   imageSrc: `/placeholder.svg?text=Product${mockProduct.id}`,
    //   category: CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)],
    //   rating: Math.random() * 2 + 3,
    //   reviews: Math.floor(Math.random() * 500),
    //   inStock: Math.random() > 0.2,
    // }))

    return NextResponse.json(products)
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error))
    console.error('Failed to fetch products:', err.message, err.stack)
    return NextResponse.json(
      { error: 'Failed to fetch products' },
      { status: 500 },
    )
  }
}
