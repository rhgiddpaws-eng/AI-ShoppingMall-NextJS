/**
 * pgClient - PostgreSQL 연결 풀 싱글톤
 * - 배포(Vercel/Supabase)에서는 DATABASE_URL 하나로 연결한다.
 * - 로컬 개발에서는 기존 PG_* 분리 변수도 계속 지원한다.
 */

import { Pool, type PoolConfig } from 'pg'

declare global {
  // eslint-disable-next-line no-var
  var pgPool: Pool | undefined
}

function createPoolConfig(): PoolConfig {
  const databaseUrl = process.env.DATABASE_URL?.trim()

  if (databaseUrl) {
    // 배포 환경에서는 DATABASE_URL 우선 사용으로 설정 실수를 줄인다.
    return {
      connectionString: databaseUrl,
      max: 5,
    }
  }

  const parsedPort = Number.parseInt(process.env.PG_PORT ?? '7432', 10)
  const port = Number.isFinite(parsedPort) ? parsedPort : 7432

  // 로컬 환경 호환을 위해 PG_* 설정도 fallback으로 유지한다.
  return {
    host: process.env.PG_HOST,
    user: process.env.PG_USER,
    password: process.env.PG_PASSWORD,
    database: process.env.PG_DATABASE,
    port,
    max: 5,
  }
}

const pool = global.pgPool ?? new Pool(createPoolConfig())

// 개발 모드에서만 전역 캐시를 재사용해 Hot Reload 중복 연결을 막는다.
if (process.env.NODE_ENV === 'development') {
  global.pgPool = pool
}

export default pool
