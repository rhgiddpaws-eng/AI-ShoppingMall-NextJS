// =============================================================================
// 문의하기 API - GET(목록) / POST(생성) /api/user/inquiries
// =============================================================================

import { NextRequest, NextResponse } from 'next/server'
import prismaClient from '@/lib/prismaClient'
import { getAuthFromRequest } from '@/lib/authFromRequest'

export async function GET(request: Request) {
  try {
    const auth = await getAuthFromRequest(request)
    if (!auth?.id) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })
    }

    const list = await prismaClient.inquiry.findMany({
      where: { userId: auth.id },
      orderBy: { createdAt: 'desc' },
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

    return NextResponse.json({ inquiries: list })
  } catch (error) {
    console.error('Error listing inquiries:', error)
    return NextResponse.json(
      { error: '문의 목록을 불러오는데 실패했습니다' },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthFromRequest(request)
    if (!auth?.id) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })
    }

    const body = await request.json()
    const message = typeof body?.message === 'string' ? body.message.trim() : ''
    const orderId =
      body?.orderId != null ? Number(body.orderId) : undefined
    const attachmentKeys = Array.isArray(body?.attachmentKeys)
      ? body.attachmentKeys.filter((k: unknown) => typeof k === 'string')
      : []

    if (!message) {
      return NextResponse.json(
        { error: '문의 내용을 입력해주세요' },
        { status: 400 },
      )
    }

    // orderId가 있으면 해당 주문이 현재 사용자 소유인지 확인
    if (orderId != null) {
      const order = await prismaClient.order.findFirst({
        where: { id: orderId, userId: auth.id },
      })
      if (!order) {
        return NextResponse.json(
          { error: '해당 주문을 찾을 수 없거나 권한이 없습니다' },
          { status: 404 },
        )
      }
    }

    const inquiry = await prismaClient.inquiry.create({
      data: {
        userId: auth.id,
        orderId: orderId ?? null,
        message,
        attachmentKeys,
      },
    })

    return NextResponse.json({
      id: inquiry.id,
      message: '문의가 접수되었습니다',
    })
  } catch (error) {
    console.error('Error creating inquiry:', error)
    return NextResponse.json(
      { error: '문의 접수에 실패했습니다' },
      { status: 500 },
    )
  }
}
