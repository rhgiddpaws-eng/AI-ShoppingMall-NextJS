import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.yes.monster',
        pathname: '/ecommerce/products/**',
      },
    ],
  },
}

export default nextConfig
