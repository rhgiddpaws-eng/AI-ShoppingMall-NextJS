// =============================================================================
// 상품 무한 스크롤 API - GET /api/products/infinite
// 쿼리: category, page, pageSize, sort, order, term → 페이지별 상품 목록 + hasMore
// =============================================================================

import { NextRequest, NextResponse } from 'next/server'
import prismaClient from '@/lib/prismaClient'
import { Category, Product, Image } from '@prisma/client'

export type ProductWithImages = Product & {
  images: Image[]
}

export type ProductsResponseType = ProductWithImages[]

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)

  const category = searchParams.get('category')
    ? searchParams.get('category')?.toUpperCase()
    : null
  const page = parseInt(searchParams.get('page') || '1')
  const pageSize = parseInt(searchParams.get('pageSize') || '12')
  const sort = searchParams.get('sort') || 'createdAt'
  const order = searchParams.get('order') || 'desc'
  const term = searchParams.get('term') || ''

  const where = {
    ...(category != null && { category: category as Category }),
    ...(term && {
      name: {
        contains: term,
        mode: 'insensitive',
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

    return NextResponse.json({
      products,
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
