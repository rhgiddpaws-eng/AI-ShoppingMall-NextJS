// =============================================================================
// 추천 상품 API - GET /api/products/recommended
// 쿼리: exclude(제외할 상품 ID) → 임베딩 기반 유사 상품 추천 목록 반환
// DATABASE_URL(Prisma) 단일 연결 사용 — 도커에서 PG_HOST/PG_PORT 불필요
// =============================================================================

import { NextResponse } from "next/server"
import prismaClient from '@/lib/prismaClient'
import { getCdnUrl } from '@/lib/cdn'
import OpenAI from 'openai'
import pgvector from 'pgvector'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const excludeId = searchParams.get("exclude")
  
  if (!excludeId) {
    return NextResponse.json({ error: "상품 ID가 필요합니다" }, { status: 400 })
  }

  try {
    // 현재 상품 정보 가져오기 (쇼핑몰에는 PUBLISHED만 노출)
    const product = await prismaClient.product.findFirst({
      where: {
        id: parseInt(excludeId),
        status: "PUBLISHED",
      },
    })

    if (!product) {
      return NextResponse.json({ error: "상품을 찾을 수 없습니다" }, { status: 404 })
    }

    // 상품명 임베딩 생성
    const embedding = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: product.name,
      encoding_format: 'float',
    })
    const embeddings = embedding.data[0].embedding
    const postEmb = pgvector.toSql(embeddings)

    // 유사한 상품 검색 — Prisma $queryRawUnsafe(DATABASE_URL) 사용, 도커에서 별도 PG_* 불필요
    type SimilarRow = { id: number; name: string; price: number; category: string | null }
    const similarRows = (await prismaClient.$queryRawUnsafe(
      `
      WITH similar_products AS (
        SELECT 
          p.id, p.name, p.price, p.category,
          1 - (p.vector <=> $1::vector) as similarity
        FROM "Product" p
        WHERE p.id <> $2 AND p.vector IS NOT NULL
        ORDER BY similarity DESC
        LIMIT 10
      )
      SELECT sp.id, sp.name, sp.price, sp.category
      FROM similar_products sp
      ORDER BY (similarity * 0.9) + (RANDOM() * 0.1) DESC
      LIMIT 4
      `,
      postEmb,
      parseInt(excludeId, 10)
    )) as SimilarRow[]
    const productIds = similarRows.map((p: SimilarRow) => p.id)
    
    const productsWithImages = await prismaClient.product.findMany({
      where: {
        id: { in: productIds },
        status: "PUBLISHED",
      },
      include: {
        images: {
          take: 1 // 첫 번째 이미지만 가져오기
        }
      }
    })
    
    // 최종 결과 생성
    const result = similarRows.map((row: SimilarRow) => {
      type ProductWithImage = (typeof productsWithImages)[number]
      const productWithImage = productsWithImages.find((p: ProductWithImage) => p.id === row.id)
      const imageSrc = getCdnUrl(productWithImage?.images?.[0]?.original)
      return {
        id: row.id,
        name: row.name,
        price: row.price,
        category: row.category,
        imageSrc,
      }
    })
    
    return NextResponse.json(result)
  } catch (error) {
    console.error("추천 상품 조회 오류:", error)
    return NextResponse.json({ error: "추천 상품을 가져오는데 실패했습니다" }, { status: 500 })
  }
}

