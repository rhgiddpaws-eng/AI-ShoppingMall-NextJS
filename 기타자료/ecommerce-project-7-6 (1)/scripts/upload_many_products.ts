// npx tsx upload_many_products.ts

import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import path from 'path'
import mime from 'mime-types'
import fetch from 'node-fetch'
import OpenAI from 'openai'
import pool from '@/lib/pgClient'
import pgvector from 'pgvector'
import sharp from 'sharp' // 이미지 처리를 위한 라이브러리

const prisma = new PrismaClient()
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

// 상품 설명으로부터 임베딩 생성
async function generateEmbedding(text: string) {
  try {
    const embedding = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
      encoding_format: 'float',
    })
    return embedding.data[0].embedding
  } catch (error) {
    console.error('임베딩 생성 중 오류 발생:', error)
    return null
  }
}

// 벡터 업데이트 함수
async function updateProductVector(productId: number, embeddings: number[]) {
  const postEmbedding = pgvector.toSql(embeddings)
  
  const queryText = `
    UPDATE "Product"
    SET "vector" = $1
    WHERE "id" = $2
  `

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

async function main() {
  try {
    // 상품 데이터 파일 읽기
    const productsFilePath = path.resolve('./products/updated_products.json')
    const productsData = JSON.parse(fs.readFileSync(productsFilePath, 'utf8'))
    
    console.log(`총 ${productsData.length}개의 상품을 처리합니다.`)
    
    // 각 상품 처리
    for (let i = 0; i < productsData.length; i++) {
      const product = productsData[i]
      console.log(`[${i+1}/${productsData.length}] 상품 처리 중: ${product.name}`)
      
      try {
        // 1. 상품 설명으로부터 임베딩 생성
        const embeddings = await generateEmbedding(product.description)
        
        // 2. 상품 기본 정보 DB에 저장
        const createdProduct = await prisma.product.create({
          data: {
            name: product.name,
            description: product.description,
            price: product.price,
            stock: product.stock,
          },
        })
        console.log(`상품 기본 정보 저장 완료. ID: ${createdProduct.id}`)
        
        // 3. 임베딩 정보 업데이트
        if (embeddings) {
          await updateProductVector(createdProduct.id, embeddings)
        }
        
        // 4. 이미지 처리 및 업로드
        for (const imagePath of product.images) {
          const fullImagePath = path.resolve(`./products/${imagePath}`)
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
            console.log(`이미지 정보 저장 완료. 원본: ${originalKey}, 썸네일: ${thumbnailKey}`)
          }
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

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async e => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
