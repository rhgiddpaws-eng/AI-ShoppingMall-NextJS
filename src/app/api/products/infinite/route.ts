// =============================================================================
// 상품 무한 스크롤 API - GET /api/products/infinite
// 쿼리: category, page, pageSize, sort, order, term → 페이지별 상품 목록 + hasMore
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
  const page = parseInt(searchParams.get('page') || '1')
  const pageSize = parseInt(searchParams.get('pageSize') || '12')
  const sort = searchParams.get('sort') || 'createdAt'
  const order = searchParams.get('order') || 'desc'
  const term = searchParams.get('term') || ''

  // slug "new" → 카테고리 필터 없이 "최신순 전체" (DB에 category=NEW인 상품이 없을 수 있음)
  const isNewCategory = category === 'NEW'
  const where = {
    status: "PUBLISHED" as const,
    ...(category != null && !isNewCategory && { category }),
    ...(term && {
      name: {
        contains: term,
        mode: 'insensitive' as const,
      },
    }),
  }

  try {
    const [products, total] = await Promise.all([
      prismaClient.product.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          images: true,
        },
        orderBy: {
          [sort as string]: order as 'asc' | 'desc',
        },
      }),
      prismaClient.product.count({
        where,
      }),
    ])

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

    // 이미지 순서 고정 (id 오름차순) → 프론트 images[0]이 항상 동일
    type ProductRow = (typeof products)[number]
    const productsWithOrderedImages = products.map((p: ProductRow) => ({
      ...p,
      images: [...p.images].sort((a, b) => a.id - b.id),
    }))

    return NextResponse.json({
      products: productsWithOrderedImages,
      total,
      hasMore: page * pageSize < total,
    })
  } catch (error) {
    console.error('Failed to fetch products:', error)
    return NextResponse.json(
      { error: 'Failed to fetch products' },
      { status: 500 },
    )
  }
}
