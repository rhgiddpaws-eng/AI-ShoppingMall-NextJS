// =============================================================================
// 관리자 문의 상세 - GET /api/admin/inquiries/[id]
// 관리자 문의 답변 - PATCH /api/admin/inquiries/[id]
// =============================================================================

import { NextRequest, NextResponse } from 'next/server'
import prismaClient from '@/lib/prismaClient'
import { requireAdminSession } from '@/lib/requireAdminSession'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminSession()
  if (auth.error) return auth.error

  try {
    const id = Number((await params).id)
    if (!Number.isInteger(id)) {
      return NextResponse.json({ error: '잘못된 문의 번호입니다' }, { status: 400 })
    }

    const inquiry = await prismaClient.inquiry.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, email: true, name: true } },
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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminSession()
  if (auth.error) return auth.error

  try {
    const id = Number((await params).id)
    if (!Number.isInteger(id)) {
      return NextResponse.json({ error: '잘못된 문의 번호입니다' }, { status: 400 })
    }

    const body = await request.json()
    const replyMessage = typeof body?.replyMessage === 'string' ? body.replyMessage.trim() : ''

    if (!replyMessage) {
      return NextResponse.json(
        { error: '답변 내용을 입력해주세요' },
        { status: 400 },
      )
    }

    const inquiry = await prismaClient.inquiry.update({
      where: { id },
      data: {
        replyMessage,
        repliedAt: new Date(),
        repliedBy: auth.session.id,
      },
    })

    return NextResponse.json({
      id: inquiry.id,
      message: '답변이 등록되었습니다',
    })
  } catch (error) {
    console.error('Error replying to inquiry:', error)
    return NextResponse.json(
      { error: '답변 등록에 실패했습니다' },
      { status: 500 },
    )
  }
}
