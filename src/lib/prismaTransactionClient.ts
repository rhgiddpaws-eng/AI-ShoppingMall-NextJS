// Prisma 타입은 @prisma/client 한 경로로 통일해서 빌드 환경별 타입 충돌을 막습니다.
import type { PrismaClient } from '@prisma/client'

// 트랜잭션 콜백의 tx 타입에서 연결/종료 같은 메서드를 제외한 안전한 타입입니다.
export type PrismaTransactionClient = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>
