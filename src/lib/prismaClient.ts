/**
 * prismaClient - Prisma 클라이언트 싱글톤
 *
 * [기능]
 * - PrismaClient 인스턴스를 하나만 두어 연결 수 제한 및 "too many clients" 방지
 * - 개발 시 Hot Reload 시 여러 인스턴스가 생기는 것을 global에 캐시해 방지
 */

// @prisma/client 초기화 스텁 이슈를 피하기 위해 생성된 클라이언트를 직접 import 합니다.
import { PrismaClient } from "../../node_modules/.prisma/client"

declare global {
  var prismaClient: PrismaClient | undefined
}

const prismaClient = global.prismaClient || new PrismaClient()

if (process.env.NODE_ENV === "development") global.prismaClient = prismaClient

export default prismaClient
