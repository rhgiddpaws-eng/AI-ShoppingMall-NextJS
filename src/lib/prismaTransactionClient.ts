import type { PrismaClient } from "@prisma/client"

// Prisma 네임스페이스 없이도 트랜잭션 콜백 tx 타입을 안전하게 재사용하기 위한 공통 타입입니다.
export type PrismaTransactionClient = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>
