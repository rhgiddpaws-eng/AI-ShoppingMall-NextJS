// =============================================================================
// 관리자 문의 목록 - GET /api/admin/inquiries
// =============================================================================

import { NextResponse } from 'next/server'
import prismaClient from '@/lib/prismaClient'
import { requireAdminSession } from '@/lib/requireAdminSession'

export async function GET(request: Request) {
  const auth = await requireAdminSession(request)
  if ('error' in auth) return auth.error

  try {
    const list = await prismaClient.inquiry.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, email: true, name: true } },
      },
    })

    return NextResponse.json({ inquiries: list })
  } catch (error) {
    console.error('Error listing inquiries:', error)
    return NextResponse.json(
      { error: '문의 목록을 불러오는데 실패했습니다' },
      { status: 500 },
    )
  }
}
