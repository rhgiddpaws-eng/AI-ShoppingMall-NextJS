// 런타임에서 사용하는 PrismaClient 경로와 동일한 타입 경로를 사용해 타입 충돌을 방지합니다.
import type { PrismaClient } from "../../node_modules/.prisma/client"

// Prisma 네임스페이스 없이도 트랜잭션 콜백 tx 타입을 안전하게 재사용하기 위한 공통 타입입니다.
export type PrismaTransactionClient = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>
