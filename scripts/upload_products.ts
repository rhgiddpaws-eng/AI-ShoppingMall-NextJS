// npx tsx upload_products.ts

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
  // 1. embedding 테스트
  const text = 'test text'
  const embedding = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
    encoding_format: 'float',
  })
  const embeddings = embedding.data[0].embedding
  console.log('embedding', embeddings)

    // 이미지 파일 경로
    const imagePath = path.resolve('./products/1/1.png')
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
    // Presigned URL 요청
    const presignedResponse = await fetch(
      `http://localhost:3000/api/presignedUrl?fileType=${fileType}&bucketPath=products`,
      { method: 'GET' }
    )
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
    if (uploadResponse.ok) {
      console.log('이미지 업로드 성공!')
      // S3 이미지 URL 생성 (버킷 URL + key)
      const imageUrl = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`
      console.log('이미지 URL:', imageUrl)
    } else {
      console.error('이미지 업로드 실패:', await uploadResponse.text())
    }

  //   3. db 업로드
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

  const productId = products.id

  const postEmbbeding = pgvector.toSql(embeddings)

  const queryText = `
    UPDATE "Product"
    SET "vector" = $1
    WHERE "id" = $2
  `

  const values = [postEmbbeding, productId]

  try {
    await pool.query(queryText, values)
  } catch (error) {
    console.error('Error updating vector:', error)
    throw error // 트랜잭션을 롤백하기 위해 에러를 던집니다.
  }
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
