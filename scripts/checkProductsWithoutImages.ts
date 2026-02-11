/**
 * 이미지가 하나도 없는 상품을 DB에서 찾아 출력합니다.
 * upload_many_products.ts 실행 시 파일 누락/에러로 Image가 생성되지 않은 상품 확인용.
 *
 * 사용: npx tsx scripts/checkProductsWithoutImages.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const products = await prisma.product.findMany({
    include: { images: true },
    orderBy: { id: 'asc' },
  })

  const withoutImages = products.filter(p => !p.images || p.images.length === 0)
  const withImages = products.filter(p => p.images && p.images.length > 0)

  console.log('=== 상품 이미지 점검 ===')
  console.log(`전체 상품: ${products.length}개`)
  console.log(`이미지 있음: ${withImages.length}개`)
  console.log(`이미지 없음: ${withoutImages.length}개`)
  if (withoutImages.length > 0) {
    console.log('\n이미지 없는 상품 (id, name):')
    withoutImages.forEach(p => {
      console.log(`  id=${p.id}  category=${p.category ?? 'null'}  ${p.name}`)
    })
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
