/**
 * pgClient - PostgreSQL 연결 풀 (싱글톤)
 *
 * [기능]
 * - pg Pool을 앱 전체에서 하나만 사용해 연결 수 제한 및 재사용
 * - 개발 시 Hot Reload로 인한 풀 중복 생성을 막기 위해 global에 캐시
 *
 * [문법]
 * - declare global { var pgPool }: Node에서 global 객체에 타입 선언
 * - global.pgPool || new Pool(): 이미 풀이 있으면 재사용, 없으면 새로 생성
 * - process.env.PG_*: 환경 변수 (호스트, 사용자, 비밀번호, DB명, 포트)
 * - parseInt(process.env.PG_PORT || '7432'): 포트는 숫자로 파싱, 없으면 7432
 */

import { Pool } from 'pg'

declare global {
  // eslint-disable-next-line no-var
  var pgPool: Pool | undefined
}

const pool =
  global.pgPool ||
  new Pool({
    host: process.env.PG_HOST,
    user: process.env.PG_USER,
    password: process.env.PG_PASSWORD,
    database: process.env.PG_DATABASE,
    port: parseInt(process.env.PG_PORT || '7432'),
    max: 5,
  })

// "Hot reload"는 개발 중 코드가 바뀔 때 서버를 완전히 재시작하지 않고,
// 변경된 부분만 즉시 반영해주는 기능입니다.
// Next.js나 Node.js 개발 환경에서는 이때 파일이 다시 로드되어 코드가 여러 번 실행될 수 있는데,
// 이로 인해 데이터베이스 연결 풀(Pool)이 중복 생성되는 문제가 생길 수 있습니다.
// 이를 방지하기 위해, 여기서는 개발 환경에서만 글로벌 객체(global.pgPool)에 Pool을 캐싱하여
// 코드가 재실행돼도 Pool 인스턴스가 여러 개 생기지 않도록 합니다.
// global.pgPool에 캐시합니다.
// 프로덕션에서도 재사용을 원한다면 조건문에서 'development'만 체크하지 않고 
// 항상 캐싱해도 됩니다.
// 여기서는 개발 환경에서만 global.pgPool에 할당합니다.
if (process.env.NODE_ENV === 'development') {
  global.pgPool = pool
}

export default pool
