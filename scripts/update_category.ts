// Prisma ORM으로 DB를 다루기 위한 클라이언트
import { PrismaClient, Category } from '@prisma/client'

const prisma = new PrismaClient()

/** 상품명에서 카테고리 추론 (7종류 → MEN, WOMEN, SHOES, ACCESSORIES) */
function getCategoryFromName(name: string): Category | null {
  if (name.includes('남성')) return 'MEN'
  if (name.includes('여성')) return 'WOMEN'
  if (name.includes('신발')) return 'SHOES'
  if (name.includes('장신구')) return 'ACCESSORIES'
  return null
}

/**
 * 메인 실행: 모든 상품을 상품명 기준으로 카테고리 일괄 매핑합니다.
 * (기존: 5종류/5폴더 → 현재: 7종류/17폴더 구조에 맞춤)
 */
async function main() {
  const all = await prisma.product.findMany({ select: { id: true, name: true, category: true } })
  let updated = 0
  for (const p of all) {
    const category = getCategoryFromName(p.name)
    if (category && p.category !== category) {
      await prisma.product.update({
        where: { id: p.id },
        data: { category },
      })
      updated++
      console.log(`ID ${p.id} "${p.name}" → ${category}`)
    }
  }
  console.log(`총 ${updated}건 카테고리 업데이트 완료`)
}

// 스크립트 실행: main() 성공 시 DB 연결 해제, 실패 시 에러 출력 후 연결 해제하고 종료
main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async e => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
