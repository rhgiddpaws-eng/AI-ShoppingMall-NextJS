import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getSession } from './lib/ironSessionControl'
import { UserRole } from '@prisma/client'

// This function can be marked `async` if using `await` inside
export default async function middleware(request: NextRequest) {
  if (
    request.nextUrl.pathname.startsWith('/admin') ||
    request.nextUrl.pathname.startsWith('/api/admin')
  ) {
    const preSession = await getSession()


    if (preSession.role !== UserRole.ADMIN) {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }
}

// See "Matching Paths" below to learn more
export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
}
