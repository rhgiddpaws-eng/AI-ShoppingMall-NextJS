// npx tsx upload_products.ts
// 용도: 임베딩 테스트, 이미지 S3 업로드 테스트, 상품 DB 등록 및 벡터 저장 테스트

import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import path from 'path'
import mime from 'mime-types'
import fetch from 'node-fetch'
import OpenAI from 'openai'
import pool from '@/lib/pgClient'
import pgvector from 'pgvector'

// DB 접근용 Prisma 클라이언트
const prisma = new PrismaClient()
// OpenAI API: 텍스트 → 벡터(임베딩) 생성
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

/**
 * 메인 실행: 임베딩 테스트 → 이미지 S3 업로드 테스트 → 상품 DB 등록 및 벡터 저장 테스트
 */
async function main() {
  // 1. embedding 테스트: 짧은 문장을 벡터로 변환
  const text = 'test text'
  const embedding = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
    encoding_format: 'float',
  })

  //업로드가 1개 뿐이므로 그 1개의  임베딩의 결과값을 리턴받음.
  const embeddings = embedding.data[0].embedding
  console.log('embedding', embeddings)

    // 프로젝트 루트 기준
    // const imagePath = path.resolve('./scripts/products/1/1.png')  
    // 이미지 파일 경로 (현재 스크립트 파일 위치 기준: scripts/products/1/1.png)
    const imagePath = path.join(__dirname, 'products', '1', '1.png')
    // 파일 존재 여부 확인
    if (!fs.existsSync(imagePath)) {
      console.error('이미지 파일이 존재하지 않습니다:', imagePath)
      return
    }
    // 파일 타입 확인
    const fileType = mime.lookup(imagePath)
    if (!fileType) {
      console.error('파일 타입을 확인할 수 없습니다')
      return
    }
    // API_BASE_URL(또는 http://localhost:3000)은 “파일을 저장하는 서버”가 아니라, 
    // Presigned URL을 만들어 주는 API 서버 주소입니다.
    const presignedResponse = await fetch(
      `http://localhost:3000/api/presignedUrl?fileType=${fileType}&bucketPath=products`,
      { method: 'GET' }
    )

    // Presigned URL(일회성 업로드 주소)과 S3에 저장될 파일 키(경로) 받기
    const { uploadUrl, key } = await presignedResponse.json()
    console.log('Presigned URL 발급 완료:', uploadUrl)
    console.log('S3 키:', key)

    // 파일 내용 읽기
    const fileContent = fs.readFileSync(imagePath)
    
    // 파일 업로드
    const uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      body: fileContent,
      headers: {
        'Content-Type': fileType
      }
    })
    
    if (!uploadResponse.ok) {
      console.error('이미지 업로드 실패:', await uploadResponse.text())
      return
    }
    console.log('이미지 업로드 성공!')
    const imageKey = key // 나중에 Image 레코드에 저장

  // 3. DB 업로드: 상품 레코드 생성 후 벡터·이미지 저장
  console.log('script 실행됨')
  const products = await prisma.product.create({
    data: {
      name: text,
      description: 'test2 description',
      price: 30000,
      stock: 200,
    },
  })
  console.log('products', products)

  // 방금 생성된 상품의 id (벡터 업데이트 시 WHERE 조건으로 사용)
  const productId = products.id

  // 업로드한 이미지를 Image 테이블에 연결 (같은 key를 original/thumbnail 둘 다 사용)
  if (typeof imageKey === 'string') {
    await prisma.image.create({
      data: {
        original: imageKey,
        thumbnail: imageKey,
        productId,
      },
    })
    console.log('이미지 DB 연결 완료:', imageKey)
  }

  // 임베딩 숫자 배열을 PostgreSQL pgvector 타입 문자열로 변환
  const postEmbbeding = pgvector.toSql(embeddings)

  // Product 테이블에서 해당 id의 vector 컬럼만 업데이트하는 SQL
  const queryText = `
    UPDATE "Product"
    SET "vector" = $1
    WHERE "id" = $2
  `

  // $1 = vector 문자열, $2 = productId
  const values = [postEmbbeding, productId]

  try {
    await pool.query(queryText, values)
  } catch (error) {
    console.error('Error updating vector:', error)
    throw error // 트랜잭션을 롤백하기 위해 에러를 던집니다.
  }
}

// 스크립트 실행: 성공 시 DB 연결 해제, 실패 시 에러 출력 후 연결 해제하고 프로세스 종료(1)
main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async e => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
