/**
 * Admin(또는 지정 이메일) 비밀번호를 DB에서 직접 초기화하는 스크립트
 * 이메일 발송 없이 비밀번호를 잊었을 때 사용
 *
 * 사용법:
 *   pnpm run reset-password
 *   pnpm run reset-password -- admin@example.com myNewPassword123
 *   RESET_EMAIL=admin@example.com RESET_PASSWORD=myNewPassword123 pnpm run reset-password
 *
 * 비밀번호는 로그인 API와 동일하게 8자 이상이어야 합니다.
 */

import { PrismaClient } from '@prisma/client'
import * as argon2 from 'argon2'

const prisma = new PrismaClient()

async function main() {
  // pnpm run reset-password -- "email" "pw" 시 -- 가 argv에 들어오므로 제외
  const argv = process.argv.slice(2).filter((a) => a !== '--')
  const email = process.env.RESET_EMAIL ?? argv[0]
  const newPassword = process.env.RESET_PASSWORD ?? argv[1]

  if (!email?.trim()) {
    console.error('사용법: pnpm run reset-password -- <이메일> <새비밀번호>')
    console.error('   또는: RESET_EMAIL=... RESET_PASSWORD=... pnpm run reset-password')
    process.exit(1)
  }

  if (!newPassword || newPassword.length < 8) {
    console.error('비밀번호는 8자 이상이어야 합니다.')
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

  const hashed = await argon2.hash(newPassword)
  await prisma.user.update({
    where: { id: user.id },
    data: { password: hashed },
  })

  console.log(`비밀번호가 변경되었습니다. (이메일: ${user.email}, role: ${user.role})`)
  console.log('해당 계정으로 로그인 후 /admin 에 접속하세요.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
