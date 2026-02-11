// =============================================================================
// 문의 상세 API - GET /api/user/inquiries/[id]
// 본인 문의만 조회
// =============================================================================

import { NextRequest, NextResponse } from 'next/server'
import prismaClient from '@/lib/prismaClient'
import { getSession } from '@/lib/ironSessionControl'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSession()
    if (!session?.id || !session.isLoggedIn) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })
    }

    const id = Number((await params).id)
    if (!Number.isInteger(id)) {
      return NextResponse.json({ error: '잘못된 문의 번호입니다' }, { status: 400 })
    }

    const inquiry = await prismaClient.inquiry.findFirst({
      where: { id, userId: session.id },
      select: {
        id: true,
        orderId: true,
        message: true,
        attachmentKeys: true,
        replyMessage: true,
        repliedAt: true,
        createdAt: true,
      },
    })

    if (!inquiry) {
      return NextResponse.json({ error: '문의를 찾을 수 없습니다' }, { status: 404 })
    }

    return NextResponse.json(inquiry)
  } catch (error) {
    console.error('Error fetching inquiry:', error)
    return NextResponse.json(
      { error: '문의를 불러오는데 실패했습니다' },
      { status: 500 },
    )
  }
}
