import type { NextConfig } from 'next'
import * as fs from 'fs'
import * as path from 'path'

// next.config 로드 시점에 .env를 명시적으로 읽어 remotePatterns hostname이 올바르게 설정되도록 함
function loadCdnUrlFromEnv(): string {
  const env = process.env.NEXT_PUBLIC_AWS_BUCKET_CDN
  if (env) return env
  try {
    const envPath = path.join(process.cwd(), '.env')
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8')
      const m = content.match(/NEXT_PUBLIC_AWS_BUCKET_CDN=(.+)/)
      if (m) return m[1].trim().replace(/^["']|["']$/g, '')
    }
  } catch (_) {}
  return 'https://cdn.ncott.shop'
}

const cdnUrl = loadCdnUrlFromEnv()
const cdnHostname = (() => {
  try {
    return new URL(cdnUrl).hostname
  } catch {
    return 'cdn.ncott.shop'
  }
})()

// 도메인별 캐시 불일치가 생기지 않도록 상품 핵심 경로에 강한 no-store 헤더를 공통 적용합니다.
const NO_STORE_HEADERS = [
  { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate' },
  { key: 'CDN-Cache-Control', value: 'no-store' },
  { key: 'Vercel-CDN-Cache-Control', value: 'no-store' },
  { key: 'Pragma', value: 'no-cache' },
  { key: 'Expires', value: '0' },
]

const nextConfig: NextConfig = {
  serverExternalPackages: ['@prisma/client', 'prisma', '.prisma/client'],
  // Vercel 빌드 워커가 Prisma 생성물을 누락하지 않도록 파일 추적 대상을 명시합니다.
  outputFileTracingIncludes: {
    '/api/**/*': [
      './node_modules/.prisma/client/**/*',
      './node_modules/@prisma/client/.prisma/client/**/*',
      './prisma/schema.prisma',
    ],
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: cdnHostname,
        pathname: '/**',
      },
    ],
  },
  async headers() {
    return [
      {
        // 홈/카테고리/상세 HTML은 항상 최신 데이터와 함께 다시 로드되도록 캐시를 차단합니다.
        source: '/',
        headers: NO_STORE_HEADERS,
      },
      {
        source: '/category/:path*',
        headers: NO_STORE_HEADERS,
      },
      {
        source: '/product/:path*',
        headers: NO_STORE_HEADERS,
      },
      {
        // API 라우트에서 헤더 누락이 생겨도 no-store가 유지되도록 한 번 더 안전장치를 둡니다.
        source: '/api/products/:path*',
        headers: NO_STORE_HEADERS,
      },
    ]
  },
}

export default nextConfig
