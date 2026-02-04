import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // ... you will write your Prisma Client queries here

  const products = await prisma.product.updateMany({
    where: {
      id: {
        gte: 70,
      },
    },
    data:{
        category:"WOMEN"
    }
  })

  console.log(products)
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
