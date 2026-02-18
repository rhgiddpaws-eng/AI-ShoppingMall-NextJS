// npx tsx scripts/update_products.ts

import { PrismaClient, Category, MediaType } from '@prisma/client'
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
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
})
// 현재 IAM 권한에서 DeleteObject가 제한될 수 있어, 명시적으로 켰을 때만 삭제를 시도합니다.
const ENABLE_S3_DELETE = process.env.ENABLE_S3_DELETE === 'true'

const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif'])
const VIDEO_EXTENSIONS = new Set(['.mp4', '.webm', '.mov'])

type ProductJsonRow = {
  name: string
  description: string
  price: number
  stock: number
  images?: string[]
}

type ExistingKeys = { original: string; thumbnail: string }
type MediaUploadResult = {
  originalKey: string | null
  thumbnailKey: string | null
  mediaType: MediaType | null
}

type CliOptions = {
  nameExact?: string
  nameContains?: string
  setNo?: string
  limit?: number
}

/**
 * CLI 옵션을 파싱합니다.
 * 예시:
 * - pnpm run update-products -- --name-exact="남성 케쥬얼 의상 2번 상품"
 * - pnpm run update-products -- --set=2 --limit=1
 */
function parseCliOptions(): CliOptions {
  const args = process.argv.slice(2).filter(arg => arg !== '--')
  const options: CliOptions = {}

  for (const arg of args) {
    if (arg.startsWith('--name-exact=')) {
      options.nameExact = arg.replace('--name-exact=', '').trim()
      continue
    }
    if (arg.startsWith('--name-contains=')) {
      options.nameContains = arg.replace('--name-contains=', '').trim()
      continue
    }
    if (arg.startsWith('--set=')) {
      options.setNo = arg.replace('--set=', '').trim()
      continue
    }
    if (arg.startsWith('--limit=')) {
      const parsed = Number(arg.replace('--limit=', '').trim())
      if (Number.isFinite(parsed) && parsed > 0) {
        options.limit = Math.floor(parsed)
      }
    }
  }

  return options
}

/** 확장자를 소문자로 반환합니다. */
function getExt(filePath: string): string {
  return path.extname(filePath).toLowerCase()
}

/** 이미지 파일 여부를 확장자로 판단합니다. */
function isImageFile(filePath: string): boolean {
  return IMAGE_EXTENSIONS.has(getExt(filePath))
}

/** 동영상 파일 여부를 확장자로 판단합니다. */
function isVideoFile(filePath: string): boolean {
  return VIDEO_EXTENSIONS.has(getExt(filePath))
}

/** 동영상 content-type을 확장자 기준으로 반환합니다. */
function getVideoContentType(filePath: string): string {
  const ext = getExt(filePath)
  if (ext === '.webm') return 'video/webm'
  if (ext === '.mov') return 'video/quicktime'
  return 'video/mp4'
}

/** S3 키를 재사용해도 되는지 확장자로 판단합니다. */
function hasExtension(fileKey: string | undefined | null, ext: string): boolean {
  if (!fileKey) return false
  return fileKey.toLowerCase().endsWith(ext)
}

/** 경로 정규화 없이 S3에 버퍼를 업로드합니다. */
async function uploadToS3(buffer: Buffer, key: string, contentType: string) {
  const command = new PutObjectCommand({
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  })
  await s3Client.send(command)
  return key
}

/** 불필요해진 S3 키를 삭제합니다. 실패해도 전체 작업은 계속 진행합니다. */
async function deleteS3ObjectSafely(key: string | null | undefined) {
  if (!key) return
  if (!ENABLE_S3_DELETE) return
  try {
    await s3Client.send(
      new DeleteObjectCommand({
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: key,
      }),
    )
  } catch (error) {
    console.error(`[경고] S3 삭제 실패: ${key}`, error)
  }
}

/**
 * 동영상과 같은 이름의 이미지 파일을 찾아 썸네일 소스로 사용합니다.
 * 예: 2/1.mp4 -> 2/1.png 우선 탐색
 */
function findPosterImagePathForVideo(videoPath: string): string | null {
  const parsed = path.parse(videoPath)
  const candidates = ['.png', '.jpg', '.jpeg', '.webp']

  for (const ext of candidates) {
    const candidatePath = path.join(parsed.dir, `${parsed.name}${ext}`)
    if (fs.existsSync(candidatePath)) {
      return candidatePath
    }
  }

  return null
}

/**
 * 이미지 파일을 원본/썸네일 webp로 업로드합니다.
 * - 기존 키가 webp면 재사용하고, 아니면 새 webp 키를 발급합니다.
 */
async function processAndUploadImage(
  imagePath: string,
  existingKeys?: ExistingKeys,
): Promise<MediaUploadResult> {
  try {
    const originalBuffer = await sharp(imagePath).webp({ quality: 80 }).toBuffer()
    const thumbnailBuffer = await sharp(imagePath)
      .resize(300)
      .webp({ quality: 70 })
      .toBuffer()

    const originalKey = hasExtension(existingKeys?.original, '.webp')
      ? existingKeys!.original
      : `ecommerce/products/${randomUUID()}.webp`

    let thumbnailKey = hasExtension(existingKeys?.thumbnail, '.webp')
      ? existingKeys!.thumbnail
      : `ecommerce/products/${randomUUID()}.webp`

    // original/thumbnail 키가 같으면 썸네일 업로드가 원본을 덮을 수 있어 분리합니다.
    if (thumbnailKey === originalKey) {
      thumbnailKey = `ecommerce/products/${randomUUID()}.webp`
    }

    await Promise.all([
      uploadToS3(originalBuffer, originalKey, 'image/webp'),
      uploadToS3(thumbnailBuffer, thumbnailKey, 'image/webp'),
    ])

    return { originalKey, thumbnailKey, mediaType: 'image' }
  } catch (error) {
    console.error('이미지 처리/업로드 중 오류 발생:', error)
    return { originalKey: null, thumbnailKey: null, mediaType: null }
  }
}

/**
 * 동영상을 업로드하고, 썸네일은 아래 우선순위로 결정합니다.
 * 1) 같은 이름의 이미지가 있으면 썸네일로 업로드
 * 2) 기존 썸네일 키가 있으면 유지
 * 3) 둘 다 없으면 원본 동영상 키를 썸네일에 임시 사용
 */
async function processAndUploadVideo(
  videoPath: string,
  existingKeys?: ExistingKeys,
): Promise<MediaUploadResult> {
  try {
    const videoBuffer = fs.readFileSync(videoPath)
    const ext = getExt(videoPath)
    const contentType = getVideoContentType(videoPath)

    // 동영상으로 바뀐 경우 확장자가 맞는 새 키를 발급해 Content-Type/확장자 불일치를 막습니다.
    const originalKey = hasExtension(existingKeys?.original, ext)
      ? existingKeys!.original
      : `ecommerce/products/${randomUUID()}${ext}`

    await uploadToS3(videoBuffer, originalKey, contentType)

    let thumbnailKey: string | null = existingKeys?.thumbnail ?? null
    const posterImagePath = findPosterImagePathForVideo(videoPath)

    if (posterImagePath && isImageFile(posterImagePath)) {
      const thumbnailBuffer = await sharp(posterImagePath)
        .resize(300)
        .webp({ quality: 70 })
        .toBuffer()

      thumbnailKey = hasExtension(existingKeys?.thumbnail, '.webp')
        ? existingKeys!.thumbnail
        : `ecommerce/products/${randomUUID()}.webp`

      await uploadToS3(thumbnailBuffer, thumbnailKey, 'image/webp')
    }

    if (!thumbnailKey) {
      thumbnailKey = originalKey
    }

    return { originalKey, thumbnailKey, mediaType: 'video' }
  } catch (error) {
    console.error('동영상 처리/업로드 중 오류 발생:', error)
    return { originalKey: null, thumbnailKey: null, mediaType: null }
  }
}

/** 파일 타입을 자동 분기해 S3 업로드를 수행합니다. */
async function processAndUploadMedia(
  mediaPath: string,
  existingKeys?: ExistingKeys,
): Promise<MediaUploadResult> {
  if (isVideoFile(mediaPath)) {
    return processAndUploadVideo(mediaPath, existingKeys)
  }
  return processAndUploadImage(mediaPath, existingKeys)
}

/** OpenAI 임베딩을 생성합니다. */
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

/** pgvector 컬럼을 업데이트합니다. */
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

/** CLI 필터를 적용해 대상 상품 목록을 줄입니다. */
function filterProductsByCli(products: ProductJsonRow[], options: CliOptions): ProductJsonRow[] {
  let filtered = [...products]

  if (options.nameExact) {
    filtered = filtered.filter(product => product.name === options.nameExact)
  }

  if (options.nameContains) {
    filtered = filtered.filter(product => product.name.includes(options.nameContains!))
  }

  if (options.setNo) {
    const targetSetNo = Number(options.setNo)
    // 한글 문자열 매칭 대신 마지막 숫자를 사용해 세트 번호를 안정적으로 비교합니다.
    filtered = filtered.filter(product => {
      const matched = product.name.match(/(\d+)(?!.*\d)/)
      if (!matched) return false
      const setNoInName = Number(matched[1])
      return Number.isFinite(targetSetNo) && setNoInName === targetSetNo
    })
  }

  if (options.limit && options.limit > 0) {
    filtered = filtered.slice(0, options.limit)
  }

  return filtered
}

async function main() {
  const options = parseCliOptions()

  try {
    const productsFilePath = path.join(__dirname, 'products', 'updated_products.json')
    if (!fs.existsSync(productsFilePath)) {
      console.error('데이터 파일을 찾을 수 없습니다:', productsFilePath)
      process.exit(1)
    }

    const productsData = JSON.parse(
      fs.readFileSync(productsFilePath, 'utf8'),
    ) as ProductJsonRow[]

    const targetProducts = filterProductsByCli(productsData, options)

    if (targetProducts.length === 0) {
      console.warn('조건에 맞는 대상 상품이 없습니다. 옵션을 확인해 주세요.')
      return
    }

    console.log(`총 ${targetProducts.length}개의 상품 업데이트를 시작합니다.`)

    for (let i = 0; i < targetProducts.length; i++) {
      const product = targetProducts[i]

      // 상품 단위로 예외를 분리해 한 상품 실패가 전체 중단으로 이어지지 않게 합니다.
      try {
        let existingProduct = await prisma.product.findFirst({
          where: { name: product.name },
        })

        const category = getCategoryFromName(product.name)

        if (!existingProduct) {
          console.log(`[CREATE] 신규 상품 생성 중: ${product.name}`)
          existingProduct = await prisma.product.create({
            data: {
              name: product.name,
              description: product.description,
              price: product.price,
              stock: product.stock,
              category,
              status: 'PUBLISHED',
            },
          })
          console.log(`  - 상품 생성 완료 (ID: ${existingProduct.id})`)
        } else {
          console.log(
            `[${i + 1}/${targetProducts.length}] 상품 업데이트 중: ${product.name} (ID: ${existingProduct.id})`,
          )

          await prisma.product.update({
            where: { id: existingProduct.id },
            data: {
              description: product.description,
              price: product.price,
              stock: product.stock,
              category: category || existingProduct.category,
            },
          })
          console.log('  - 기본 정보 업데이트 완료')
        }

        const embeddings = await generateEmbedding(product.description)
        if (embeddings) {
          await updateProductVector(existingProduct.id, embeddings)
          console.log('  - 벡터(임베딩) 업데이트 완료')
        } else {
          console.warn('  - [경고] 임베딩 생성 실패')
        }

        if (product.images && product.images.length > 0) {
          const currentDBImages = await prisma.image.findMany({
            where: { productId: existingProduct.id },
            orderBy: { id: 'asc' },
          })

          let processedCount = 0

          for (let j = 0; j < product.images.length; j++) {
            const mediaFileName = product.images[j]
            const fullMediaPath = path.join(__dirname, 'products', mediaFileName)

            if (!fs.existsSync(fullMediaPath)) {
              console.warn(`  - [경고] 미디어 파일 없음: ${fullMediaPath}`)
              continue
            }

            const existingImageSlot = currentDBImages[j]
            const targetKeys = existingImageSlot
              ? { original: existingImageSlot.original, thumbnail: existingImageSlot.thumbnail }
              : undefined

            console.log(
              `  - 미디어 처리 중 (${j + 1}/${product.images.length}): ${targetKeys ? '기존 슬롯 갱신' : '새 슬롯 추가'}`,
            )

            const { originalKey, thumbnailKey, mediaType } = await processAndUploadMedia(
              fullMediaPath,
              targetKeys,
            )

            if (!originalKey || !thumbnailKey || !mediaType) {
              console.warn('  - [경고] 업로드 실패로 해당 슬롯을 건너뜁니다.')
              continue
            }

            if (existingImageSlot) {
              const shouldUpdateKey =
                existingImageSlot.original !== originalKey ||
                existingImageSlot.thumbnail !== thumbnailKey ||
                // 키가 같아도 타입 불일치면 DB 보정이 필요합니다.
                existingImageSlot.mediaType !== mediaType

              if (shouldUpdateKey) {
                await prisma.image.update({
                  where: { id: existingImageSlot.id },
                  data: {
                    original: originalKey,
                    thumbnail: thumbnailKey,
                    // png -> mp4 변환처럼 타입이 바뀌면 mediaType도 함께 반영합니다.
                    mediaType,
                  },
                })

                const retainedKeys = new Set([originalKey, thumbnailKey])
                // 키가 바뀐 경우에만 기존 오브젝트를 정리합니다.
                if (
                  existingImageSlot.original !== originalKey &&
                  !retainedKeys.has(existingImageSlot.original)
                ) {
                  await deleteS3ObjectSafely(existingImageSlot.original)
                }
                if (
                  existingImageSlot.thumbnail !== thumbnailKey &&
                  !retainedKeys.has(existingImageSlot.thumbnail)
                ) {
                  await deleteS3ObjectSafely(existingImageSlot.thumbnail)
                }
              }
            } else {
              await prisma.image.create({
                data: {
                  original: originalKey,
                  thumbnail: thumbnailKey,
                  // 신규 미디어는 DB에 타입을 명시적으로 기록합니다.
                  mediaType,
                  productId: existingProduct.id,
                },
              })
            }

            processedCount++
          }

          if (currentDBImages.length > product.images.length) {
            const imagesToDelete = currentDBImages.slice(product.images.length)
            console.log(`  - 이미지 개수 감소로 인한 잉여 이미지 ${imagesToDelete.length}개 삭제 진행...`)

            for (const img of imagesToDelete) {
              await deleteS3ObjectSafely(img.original)
              await deleteS3ObjectSafely(img.thumbnail)
              await prisma.image.delete({ where: { id: img.id } })
            }
          }

          console.log(`  - 미디어 동기화 완료 (총 ${processedCount}개 유효)`)
        } else {
          console.log('  - 업데이트할 이미지/동영상 목록이 없어 미디어 갱신을 스킵합니다.')
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
  .catch(async error => {
    console.error(error)
    await prisma.$disconnect()
    process.exit(1)
  })
