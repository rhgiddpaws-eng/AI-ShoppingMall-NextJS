// npx tsx scripts/update_products.ts

import { PrismaClient, Category } from '@prisma/client'
import fs from 'fs'
import path from 'path'
import OpenAI from 'openai'
import pool from '@/lib/pgClient'
import pgvector from 'pgvector'
import sharp from 'sharp'
import { loadEnvConfig } from '@next/env'
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { randomUUID } from 'crypto'

loadEnvConfig(process.cwd())

const prisma = new PrismaClient()
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
})

const s3Client = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
})

// S3 직접 업로드 함수 (버퍼 사용)
async function uploadToS3(buffer: Buffer, key: string, contentType: string) {
    try {
        const command = new PutObjectCommand({
            Bucket: process.env.AWS_BUCKET_NAME,
            Key: key,
            Body: buffer, // Add Body here
            ContentType: contentType,
        })
        await s3Client.send(command)
        return key
    } catch (e) {
        console.error(`S3 업로드 실패 (Key: ${key}):`, e)
        throw e
    }
}

// 이미지 처리 및 업로드 함수 (기존 키가 있으면 덮어쓰기)
async function processAndUploadImage(
    imagePath: string,
    existingKeys?: { original: string, thumbnail: string }
) {
    try {
        // Sharp로 이미지 변환 (메모리 상에서 처리)
        // 원본용: WebP 변환
        const originalBuffer = await sharp(imagePath)
            .webp({ quality: 80 })
            .toBuffer()

        // 썸네일용: 리사이징 + WebP 변환
        const thumbnailBuffer = await sharp(imagePath)
            .resize(300)
            .webp({ quality: 70 })
            .toBuffer()

        // 키 결정: 기존 키가 있으면 재사용, 없으면 새로 생성
        // 기존 API 경로 규칙: ecommerce/products/{uuid}.webp
        let originalKey = existingKeys?.original
        let thumbnailKey = existingKeys?.thumbnail

        if (!originalKey) {
            originalKey = `ecommerce/products/${randomUUID()}.webp`
        }
        if (!thumbnailKey) {
            thumbnailKey = `ecommerce/products/${randomUUID()}.webp`
        }

        // S3 업로드 (병렬 처리 가능)
        await Promise.all([
            uploadToS3(originalBuffer, originalKey, 'image/webp'),
            uploadToS3(thumbnailBuffer, thumbnailKey, 'image/webp')
        ])

        return { originalKey, thumbnailKey }
    } catch (error) {
        console.error('이미지 처리/업로드 중 오류 발생:', error)
        return { originalKey: null, thumbnailKey: null }
    }
}

// 임베딩 생성 (기존과 동일)
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

// 벡터 업데이트 (기존과 동일)
async function updateProductVector(productId: number, embeddings: number[]) {
    const postEmbedding = pgvector.toSql(embeddings)
    const queryText = `
    UPDATE "Product"
    SET "vector" = $1::vector
    WHERE "id" = $2
  `
    const values = [postEmbedding, productId]

    try {
        await pool.query(queryText, values)
        return true
    } catch (error) {
        console.error('벡터 업데이트 중 오류 발생:', error)
        return false
    }
}

function getCategoryFromName(name: string): Category | null {
    if (name.includes('남성')) return 'MEN'
    if (name.includes('여성')) return 'WOMEN'
    if (name.includes('신발')) return 'SHOES'
    if (name.includes('장신구')) return 'ACCESSORIES'
    return null
}

async function main() {
    try {
        // 상품 데이터 파일 읽기
        const productsFilePath = path.join(__dirname, 'products', 'updated_products.json')
        if (!fs.existsSync(productsFilePath)) {
            console.error('데이터 파일을 찾을 수 없습니다:', productsFilePath)
            process.exit(1)
        }

        const productsData = JSON.parse(fs.readFileSync(productsFilePath, 'utf8'))

        console.log(`총 ${productsData.length}개의 상품 업데이트를 시작합니다.`)

        for (let i = 0; i < productsData.length; i++) {
            const product = productsData[i]

            // 1. 기존 상품 찾기 (이름 기준)
            let existingProduct = await prisma.product.findFirst({
                where: { name: product.name }
            })

            const category = getCategoryFromName(product.name)

            if (!existingProduct) {
                console.log(`[CREATE] 신규 상품 생성 중: ${product.name}`)
                const newProduct = await prisma.product.create({
                    data: {
                        name: product.name,
                        description: product.description,
                        price: product.price,
                        stock: product.stock,
                        category: category,
                        status: 'PUBLISHED',
                    }
                })
                existingProduct = newProduct
                console.log(`  - 상품 생성 완료 (ID: ${newProduct.id})`)
            } else {
                console.log(`[${i + 1}/${productsData.length}] 상품 업데이트 중: ${product.name} (ID: ${existingProduct.id})`)

                // 2. 상품 정보 업데이트
                await prisma.product.update({
                    where: { id: existingProduct.id },
                    data: {
                        description: product.description,
                        price: product.price,
                        stock: product.stock,
                        category: category || existingProduct.category,
                    }
                })
                console.log(`  - 기본 정보 업데이트 완료`)
            }

            // 3. 임베딩 재생성 및 업데이트
            const embeddings = await generateEmbedding(product.description)
            if (embeddings) {
                await updateProductVector(existingProduct.id, embeddings)
                console.log(`  - 벡터(임베딩) 업데이트 완료`)
            } else {
                console.warn(`  - [경고] 임베딩 생성 실패`)
            }

            // 4. 이미지 업데이트 (기존 키 덮어쓰기 로직)
            if (product.images && product.images.length > 0) {
                // 4-1. DB에서 현재 상품의 기존 이미지 목록 조회 (ID 순 정렬)
                const currentDBImages = await prisma.image.findMany({
                    where: { productId: existingProduct.id },
                    orderBy: { id: 'asc' }
                })

                let processedCount = 0

                // 새 이미지 목록을 순회하며 기존 슬롯이 있으면 덮어쓰기, 없으면 추가
                for (let j = 0; j < product.images.length; j++) {
                    const imageFileName = product.images[j]
                    const fullImagePath = path.join(__dirname, 'products', imageFileName)

                    if (!fs.existsSync(fullImagePath)) {
                        console.warn(`  - [경고] 이미지 파일 없음: ${fullImagePath}`)
                        continue
                    }

                    // 기존 슬롯 확인
                    const existingImageSlot = currentDBImages[j]
                    const targetKeys = existingImageSlot
                        ? { original: existingImageSlot.original, thumbnail: existingImageSlot.thumbnail }
                        : undefined

                    console.log(`  - 이미지 처리 중 (${j + 1}/${product.images.length}): ${targetKeys ? '기존 키 덮어쓰기' : '새 이미지 추가'}`)

                    const { originalKey, thumbnailKey } = await processAndUploadImage(fullImagePath, targetKeys)

                    if (originalKey && thumbnailKey) {
                        if (existingImageSlot) {
                            // 덮어쓰기인 경우: DB 업데이트 불필요 (키가 같으므로). 
                            // 만약 키가 바뀌는 로직이라면 update 필요하지만 여기선 유지.
                            // 그냥 놔두면 됨.
                        } else {
                            // 새 슬롯인 경우: DB 추가
                            await prisma.image.create({
                                data: {
                                    original: originalKey,
                                    thumbnail: thumbnailKey,
                                    productId: existingProduct.id
                                }
                            })
                        }
                        processedCount++
                    }
                }

                // 4-2. 만약 새 이미지 개수가 기존보다 적다면, 남은(뒤쪽) 기존 이미지들은 삭제
                if (currentDBImages.length > product.images.length) {
                    const imagesToDelete = currentDBImages.slice(product.images.length)
                    console.log(`  - 이미지 개수 감소로 인한 잉여 이미지 ${imagesToDelete.length}개 삭제 진행...`)

                    for (const img of imagesToDelete) {
                        // S3 삭제
                        try {
                            if (img.original) {
                                await s3Client.send(new DeleteObjectCommand({
                                    Bucket: process.env.AWS_BUCKET_NAME, Key: img.original
                                }))
                            }
                            if (img.thumbnail) {
                                await s3Client.send(new DeleteObjectCommand({
                                    Bucket: process.env.AWS_BUCKET_NAME, Key: img.thumbnail
                                }))
                            }
                        } catch (e) {
                            console.error(`    - [경고] 잉여 S3 삭제 실패:`, e)
                        }
                        // DB 삭제 (개별 삭제 or deleteMany로 개선 가능)
                        await prisma.image.delete({ where: { id: img.id } })
                    }
                }

                console.log(`  - 이미지 동기화 완료 (총 ${processedCount}장 유효)`)
            } else {
                console.log(`  - 업데이트할 이미지가 목록에 없어 이미지 갱신 스킵`)
            }

            console.log(`상품 "${product.name}" 업데이트 완료\n`)

        } catch (error) {
            console.error(`상품 "${product.name}" 업데이트 중 오류 발생:`, error)
        }
    }

        console.log('모든 상품 업데이트 작업이 완료되었습니다.')
} catch (error) {
    console.error('작업 중 치명적 오류 발생:', error)
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
