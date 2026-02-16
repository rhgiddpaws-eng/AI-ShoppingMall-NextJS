/**
 * 지정 이메일 사용자의 role을 ADMIN으로 설정
 * 사용법: pnpm run set-admin-role -- rhgiddp@naver.com
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const argv = process.argv.slice(2).filter((a) => a !== '--')
  const email = process.env.SET_ADMIN_EMAIL ?? argv[0]

  if (!email?.trim()) {
    console.error('사용법: pnpm run set-admin-role -- <이메일>')
    process.exit(1)
  }

  const user = await prisma.user.findUnique({
    where: { email: email.trim() },
    select: { id: true, email: true, role: true },
  })

  if (!user) {
    console.error(`해당 이메일 사용자가 없습니다: ${email}`)
    process.exit(1)
  }

  if (user.role === 'ADMIN') {
    console.log(`이미 ADMIN입니다: ${user.email}`)
    return
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { role: 'ADMIN' },
  })

  console.log(`role이 ADMIN으로 설정되었습니다: ${user.email}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
