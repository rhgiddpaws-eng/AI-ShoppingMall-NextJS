/**
 * prismaClient - Prisma 클라이언트 싱글톤
 *
 * [기능]
 * - PrismaClient 인스턴스를 하나만 두어 연결 수 제한 및 "too many clients" 방지
 * - 개발 시 Hot Reload 시 여러 인스턴스가 생기는 것을 global에 캐시해 방지
 *
 * [문법]
 * - declare global { var prismaClient }: 전역 타입 확장으로 prismaClient 선언
 * - global.prismaClient || new PrismaClient(): 있으면 재사용, 없으면 생성
 * - NODE_ENV === 'development'일 때만 global에 할당 (프로덕션은 단일 프로세스 가정)
 */

import { PrismaClient } from "@prisma/client"

declare global {
  var prismaClient: PrismaClient | undefined
}

const prismaClient = global.prismaClient || new PrismaClient()

if (process.env.NODE_ENV === "development") global.prismaClient = prismaClient

export default prismaClient
