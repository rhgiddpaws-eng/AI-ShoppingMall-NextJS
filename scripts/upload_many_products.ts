// npx tsx upload_many_products.ts

import { PrismaClient, Category } from '@prisma/client'
import fs from 'fs'
import path from 'path'
import mime from 'mime-types'
import fetch from 'node-fetch'
import OpenAI from 'openai'
import pool from '@/lib/pgClient'
import pgvector from 'pgvector'
import sharp from 'sharp' // 이미지 처리를 위한 라이브러리

// Prisma: 상품·이미지 등 DB CRUD용
const prisma = new PrismaClient()
// OpenAI: 상품 설명 텍스트 → 벡터(임베딩) 생성용
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// 이미지 업로드 함수
async function uploadImage(imagePath: string, bucketPath: string = 'products') {
  // 파일 존재 여부 확인
  if (!fs.existsSync(imagePath)) {
    console.error('이미지 파일이 존재하지 않습니다:', imagePath)
    return null
  }

  // 파일 타입 확인
  const fileType = mime.lookup(imagePath)
  if (!fileType) {
    console.error('파일 타입을 확인할 수 없습니다')
    return null
  }

  // Presigned URL 요청
  const presignedResponse = await fetch(
    `http://localhost:3000/api/presignedUrl?fileType=${fileType}&bucketPath=${bucketPath}`,
    { method: 'GET' }
  )
  // API 응답에서 S3 업로드용 URL과 저장될 파일 키(경로) 추출
  const { uploadUrl, key } = await presignedResponse.json()
  console.log('Presigned URL 발급 완료:', uploadUrl)

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
    return key
  } else {
    console.error('이미지 업로드 실패:', await uploadResponse.text())
    return null
  }
}

// 이미지 처리 및 업로드 함수
async function processAndUploadImage(imagePath: string) {
  try {
    // 원본 이미지를 webp로 변환 (약간 압축)
    const originalBuffer = await sharp(imagePath)
      .webp({ quality: 80 })
      .toBuffer()

    // 썸네일 이미지 생성
    const thumbnailBuffer = await sharp(imagePath)
      .resize(300) // 썸네일 크기 조정
      .webp({ quality: 70 })
      .toBuffer()

    // 임시 파일로 저장
    const tempOriginalPath = path.join(path.dirname(imagePath), `temp_original_${path.basename(imagePath)}.webp`)
    const tempThumbnailPath = path.join(path.dirname(imagePath), `temp_thumbnail_${path.basename(imagePath)}.webp`)
    
    fs.writeFileSync(tempOriginalPath, originalBuffer)
    fs.writeFileSync(tempThumbnailPath, thumbnailBuffer)

    // 각각 업로드
    const originalKey = await uploadImage(tempOriginalPath)
    const thumbnailKey = await uploadImage(tempThumbnailPath)

    // 임시 파일 삭제
    fs.unlinkSync(tempOriginalPath)
    fs.unlinkSync(tempThumbnailPath)

    return { originalKey, thumbnailKey }
  } catch (error) {
    console.error('이미지 처리 중 오류 발생:', error)
    return { originalKey: null, thumbnailKey: null }
  }
}

/**
 * 상품 설명(텍스트)을 OpenAI 임베딩 API로 벡터화합니다.
 * - 검색/추천 시 유사도 비교에 사용됩니다.
 */
async function generateEmbedding(text: string) {
  try {
    const embedding = await openai.embeddings.create({
      model: 'text-embedding-3-small', // OpenAI 임베딩 모델명
      input: text,                      // 벡터로 바꿀 텍스트
      encoding_format: 'float',        // 벡터 원소 타입 (float 배열)
    })
    // 응답에서 첫 번째(유일한) 임베딩 벡터 배열 반환
    return embedding.data[0].embedding
  } catch (error) {
    console.error('임베딩 생성 중 오류 발생:', error)
    return null
  }
}

/**
 * 상품 벡터(임베딩) 업데이트 함수
 * - PostgreSQL pgvector 형식으로 변환 후 Product.vector 컬럼을 갱신합니다.
 */
async function updateProductVector(productId: number, embeddings: number[]) {
  // 숫자 배열을 pgvector 문법 문자열로 변환 (예: '[0.1, -0.2, ...]')
  const postEmbedding = pgvector.toSql(embeddings)
  
  // Product 테이블에서 해당 id의 vector만 업데이트 (pgvector 타입 캐스트)
  const queryText = `
    UPDATE "Product"
    SET "vector" = $1::vector
    WHERE "id" = $2
  `

  // $1, $2에 바인딩할 값 (vector 문자열, 상품 id)
  const values = [postEmbedding, productId]

  try {
    await pool.query(queryText, values)
    console.log(`상품 ID ${productId}의 벡터 업데이트 완료`)
    return true
  } catch (error) {
    console.error('벡터 업데이트 중 오류 발생:', error)
    return false
  }
}

/**
 * 상품명에서 카테고리 추론 (7종류 → 앱 카테고리: MEN, WOMEN, SHOES, ACCESSORIES)
 */
function getCategoryFromName(name: string): Category | null {
  if (name.includes('남성')) return 'MEN'
  if (name.includes('여성')) return 'WOMEN'
  if (name.includes('신발')) return 'SHOES'
  if (name.includes('장신구')) return 'ACCESSORIES'
  return null
}

/**
 * 메인 실행: updated_products.json의 상품을 순서대로 DB 등록·이미지 업로드·벡터 저장합니다.
 */
async function main() {
  try {
    // 상품 데이터 파일 읽기 (스크립트 파일 위치 기준 scripts/products/updated_products.json)
    const productsFilePath = path.join(__dirname, 'products', 'updated_products.json')
    const productsData = JSON.parse(fs.readFileSync(productsFilePath, 'utf8'))
    
    console.log(`총 ${productsData.length}개의 상품을 처리합니다.`)
    
    // 각 상품 처리
    for (let i = 0; i < productsData.length; i++) {
      const product = productsData[i]
      const category = getCategoryFromName(product.name)
      console.log(`[${i+1}/${productsData.length}] 상품 처리 중: ${product.name}${category ? ` (${category})` : ''}`)
      
      try {
        // 1. 상품 설명으로부터 임베딩 생성
        const embeddings = await generateEmbedding(product.description)
        
        // 2. 상품 기본 정보 DB에 저장 (7종류 구조에 맞춰 category 매핑)
        const createdProduct = await prisma.product.create({
          data: {
            name: product.name,
            description: product.description,
            price: product.price,
            stock: product.stock,
            category,
          },
        })
        console.log(`상품 기본 정보 저장 완료. ID: ${createdProduct.id}`)
        
        // 3. 임베딩 정보 업데이트
        if (embeddings) {
          await updateProductVector(createdProduct.id, embeddings)
        }
        
        // 4. 이미지 처리 및 업로드
        let imageCount = 0
        for (const imagePath of product.images) {
          // 상대 경로를 스크립트 실행 위치 기준 절대 경로로 변환
          const fullImagePath = path.join(__dirname, 'products', imagePath)
          if (!fs.existsSync(fullImagePath)) {
            console.warn(`  [경고] 파일 없음 - 이미지 스킵: ${fullImagePath}`)
            continue
          }
          console.log(`이미지 처리 중: ${fullImagePath}`)
          
          const { originalKey, thumbnailKey } = await processAndUploadImage(fullImagePath)
          
          if (originalKey && thumbnailKey) {
            // 5. 이미지 정보 DB에 저장
            await prisma.image.create({
              data: {
                original: originalKey,
                thumbnail: thumbnailKey,
                productId: createdProduct.id
              }
            })
            imageCount++
            console.log(`이미지 정보 저장 완료. 원본: ${originalKey}, 썸네일: ${thumbnailKey}`)
          } else {
            console.warn(`  [경고] 업로드/변환 실패 - 이미지 스킵: ${fullImagePath}`)
          }
        }
        if (imageCount === 0) {
          console.warn(`  [경고] 상품 ID ${createdProduct.id}("${product.name}")에 이미지가 0건 등록됨. 목록/카테고리에서 플레이스홀더로 표시됩니다.`)
        }
        
        console.log(`상품 "${product.name}" 처리 완료\n`)
      } catch (error) {
        console.error(`상품 "${product.name}" 처리 중 오류 발생:`, error)
        // 오류가 발생해도 다음 상품 처리 계속 진행
        continue
      }
    }
    
    console.log('모든 상품 처리 완료!')
  } catch (error) {
    console.error('상품 일괄 업로드 중 오류 발생:', error)
    throw error
  }
}

// 스크립트 실행: 성공 시 Prisma 연결 종료, 실패 시 에러 출력 후 연결 종료하고 프로세스 종료(1)
main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async e => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
