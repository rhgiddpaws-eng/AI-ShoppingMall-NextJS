/**
 * checkImageKeys.ts
 *
 * 1) DB Image 테이블에 저장된 original/key 값 확인
 * 2) .env 기준으로 만들어지는 CDN URL 확인
 * 3) 업로드 시 사용하는 key 형식(presignedUrl)과 일치 여부 확인
 *
 * 실행: npx tsx scripts/checkImageKeys.ts
 */

import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import path from 'path'

const prisma = new PrismaClient()

// .env에서 NEXT_PUBLIC_AWS_BUCKET_CDN 읽기 (npx tsx 실행 시 process.env에 없을 수 있음)
function loadCdnBaseFromEnv(): string {
  if (process.env.NEXT_PUBLIC_AWS_BUCKET_CDN) {
    return process.env.NEXT_PUBLIC_AWS_BUCKET_CDN
  }
  try {
    const envPath = path.join(process.cwd(), '.env')
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8')
      const match = content.match(/NEXT_PUBLIC_AWS_BUCKET_CDN=(.+)/)
      if (match) {
        return match[1].trim().replace(/^["']|["']$/g, '')
      }
    }
  } catch (_) {}
  return 'https://cdn.ncott.shop'
}

function getCdnBase(): string {
  const base = loadCdnBaseFromEnv()
  return base.endsWith('/') ? base.slice(0, -1) : base
}

function buildCdnUrl(path: string): string {
  return `${getCdnBase()}/${path}`
}

async function main() {
  console.log('=== 1) .env에서 쓰이는 CDN 베이스 주소 ===')
  const cdnBase = getCdnBase()
  console.log('사용 중인 CDN 베이스:', cdnBase)
  console.log('  (NEXT_PUBLIC_AWS_BUCKET_CDN 변경 시 dev 재시작 또는 프로덕션 재빌드 필요)')
  console.log('')

  console.log('=== 2) DB Image 테이블에 저장된 key (original) 샘플 ===')
  const images = await prisma.image.findMany({
    take: 5,
    orderBy: { id: 'desc' },
    select: { id: true, original: true, thumbnail: true, productId: true },
  })

  if (images.length === 0) {
    console.log('Image 레코드가 없습니다.')
    return
  }

  for (const img of images) {
    console.log(`  Image id=${img.id} productId=${img.productId}`)
    console.log(`    original (DB key) : ${img.original}`)
    console.log(`    thumbnail (DB key): ${img.thumbnail}`)
    console.log(`    → 앱에서 쓰는 URL: ${buildCdnUrl(img.original)}`)
    console.log('')
  }

  console.log('=== 3) DB key → CDN URL 실제 접근 가능 여부 (맞나 확인) ===')
  let okCount = 0
  let failCount = 0
  for (const img of images) {
    const url = buildCdnUrl(img.original)
    try {
      const res = await fetch(url, { method: 'HEAD' })
      if (res.ok) {
        console.log(`  [OK]  ${res.status}  ${img.original}`)
        okCount++
      } else {
        console.log(`  [FAIL] ${res.status}  ${img.original}`)
        console.log(`         URL: ${url}`)
        failCount++
      }
    } catch (err) {
      console.log(`  [ERR]  ${(err as Error).message}  ${img.original}`)
      console.log(`         URL: ${url}`)
      failCount++
    }
  }
  console.log('')
  if (failCount > 0) {
    console.log(
      `  → 결과: ${okCount}개 접근 가능, ${failCount}개 실패. DB에 기록된 key와 CDN에 올라간 파일 경로가 다를 수 있습니다.`
    )
    console.log(
      '  → CDN/S3에 실제 파일이 어떤 경로(key)로 있는지 확인한 뒤, presignedUrl key 형식 또는 DB 저장 방식을 맞추면 됩니다.'
    )
  } else {
    console.log('  → 위 샘플 모두 CDN에서 정상 응답(200). DB key와 CDN 경로가 일치합니다.')
  }
  console.log('')

  console.log('=== 4) presignedUrl이 만드는 key 형식 ===')
  console.log(
    '  bucketPath=products → key = "ecommerce/products/" + uuid + ".webp"'
  )
  console.log(
    '  DB에 저장되는 값은 위와 동일한 형태여야 합니다. (앞에 슬래시 없음)'
  )
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e)
    prisma.$disconnect()
    process.exit(1)
  })
