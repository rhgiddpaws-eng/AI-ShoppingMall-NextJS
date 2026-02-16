/**
 * 이미지가 0개인 Product만 안전하게 삭제합니다.
 * OrderItem이 참조하는 상품은 주문 이력 보존을 위해 제외합니다.
 * CartItem / WishlistEntry는 Product onDelete Cascade로 함께 삭제됩니다.
 *
 * 사용: npx tsx scripts/deleteProductsWithoutImages.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const products = await prisma.product.findMany({
    include: { images: true },
    orderBy: { id: 'asc' },
  })

  const withoutImages = products.filter(p => !p.images || p.images.length === 0)
  const idsToDelete = withoutImages.map(p => p.id)

  if (idsToDelete.length === 0) {
    console.log('이미지 없는 상품이 없습니다.')
    return
  }

  const orderItemProductIds = await prisma.orderItem.findMany({
    where: { productId: { in: idsToDelete } },
    select: { productId: true },
    distinct: ['productId'],
  })
  const skipIds = new Set(orderItemProductIds.map(o => o.productId))
  const safeIds = idsToDelete.filter(id => !skipIds.has(id))

  if (skipIds.size > 0) {
    console.log(
      `주문 이력이 있어 삭제 제외 (${skipIds.size}건):`,
      [...skipIds].join(', ')
    )
  }

  if (safeIds.length === 0) {
    console.log('삭제 가능한 이미지 없는 상품이 없습니다.')
    return
  }

  const result = await prisma.product.deleteMany({
    where: { id: { in: safeIds } },
  })

  console.log(`이미지 없는 상품 ${result.count}건 삭제 완료.`)
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
