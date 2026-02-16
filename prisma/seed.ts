import * as argon2 from 'argon2'

// PrismaClient는 `prisma generate` 후 생성됨. 시드 스크립트에서 TS 해석 이슈 회피를 위해 require 사용
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

/**
 * 관리자 계정 1명 생성. 로그인: test@test.com / test1234 (8자)
 * 실행: pnpm run seed (또는 npx dotenv-cli -e .env.host -- prisma db seed)
 */
async function main() {
  const hashedPassword = await argon2.hash('test1234')
  const admin = await prisma.user.upsert({
    where: { email: 'test@test.com' },
    update: {},
    create: {
      email: 'test@test.com',
      password: hashedPassword,
      name: '테스트 관리자',
      role: 'ADMIN',
    },
  })
  console.log('관리자 계정 생성/확인:', admin.email, '(비밀번호: test1234)')
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e)
    prisma.$disconnect()
    process.exit(1)
  })
