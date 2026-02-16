/**
 * checkProducts.ts
 *
 * "이 상품과 비슷한 상품" 추천 로직을 테스트하는 스크립트입니다.
 * 상품 이름을 AI 임베딩으로 벡터화한 뒤, DB에 저장된 벡터와 비교해
 * 유사한 상품을 찾고, 여기에 가중치(유사도 90% + 랜덤 10%)를 적용해
 * 최종 4개를 골라냅니다.
 */

import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import path from 'path'
import mime from 'mime-types'
import fetch from 'node-fetch'
import OpenAI from 'openai'
import pool from '@/lib/pgClient'
import pgvector from 'pgvector'

const prisma = new PrismaClient()
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

async function main() {
  // roductId = 20인 상품을 DB에서 가져옵니다.
  const productId = 20

  const product = await prisma.product.findUnique({
    where: {
      id: productId,
    },
  })

  console.log('product', product)

  // ========== 상품 이름 → 임베딩(벡터) 변환 ==========
  // "임베딩" = 텍스트를 숫자 배열(벡터)로 바꾼 것.
  // 비슷한 의미의 텍스트는 비슷한 벡터가 되므로, 
  // 나중에 벡터 거리로 유사도를 계산할 수 있음.
  const text = product?.name as string
  const embedding = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
    encoding_format: 'float',
  })
  const embeddings = embedding.data[0].embedding

  // PostgreSQL pgvector 확장에서 쓰는 형식으로 
  // 벡터 문자열 변환 (예: "[0.1, -0.2, ...]")
  const postEmb = pgvector.toSql(embeddings)

  // ========== 3단계: 유사 상품 검색 (벡터 유사도 + 가중치) ==========
  // - p.vector <=> $1 : "코사인 거리" (작을수록 더 비슷함)
  // - 1 - (거리) = "유사도" (클수록 더 비슷함, 0~1 범위)
  // - p.id가 현재 상품(productId)와 다른 상품들만 조회함
  // - similarity * 0.9 + RANDOM() * 0.1 : 추천에 "약간의 무작위"를 섞어서
  //   매번 비슷한 결과만 나오지 않고 다양성(diversity)을 줌.
  //   → 90%는 진짜 유사도, 10%는 랜덤으로 순서를 바꿔서 다른 상품도 노출될 기회를 줌.
  var queryText = `
      WITH similar_products AS (
        SELECT 
          p.id, 
          p.name, 
          p.price, 
          1 - (p.vector <=> $1) as similarity
        FROM "Product" p
        WHERE p.id <> $2
        ORDER BY similarity DESC
        LIMIT 10
      )
      SELECT * FROM similar_products
      ORDER BY (similarity * 0.9) + (RANDOM() * 0.1) DESC
      LIMIT 4
    `
  var values = [postEmb, productId]
  const rank = await pool.query(queryText, values)
  console.log(rank.rows)
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async e => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
