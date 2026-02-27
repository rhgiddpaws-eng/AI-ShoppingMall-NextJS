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
  } catch (_) { }
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
  // 정적 에셋(동영상·이미지)의 브라우저/CDN 캐시를 길게 잡아 반복 다운로드를 방지합니다.
  async headers() {
    return [
      {
        source: '/main/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ]
  },
}

export default nextConfig
