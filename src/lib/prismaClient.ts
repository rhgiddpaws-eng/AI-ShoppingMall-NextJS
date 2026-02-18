/**
 * prismaClient - Prisma 클라이언트 싱글톤
 *
 * [기능]
 * - PrismaClient 인스턴스를 하나만 두어 연결 수 제한 및 "too many clients" 방지
 * - 개발 시 Hot Reload 시 여러 인스턴스가 생기는 것을 global에 캐시해 방지
 */

// 표준 경로(@prisma/client)를 사용해야 캐시된 빌드 환경에서도 최신 스키마 타입이 정확히 반영됩니다.
import { PrismaClient } from '@prisma/client'

declare global {
  var prismaClient: PrismaClient | undefined
}

const prismaClient = global.prismaClient || new PrismaClient()

if (process.env.NODE_ENV === 'development') global.prismaClient = prismaClient

export default prismaClient
