// =============================================================================
// 비밀번호 재설정 요청 API - POST /api/forgot-password
// 이메일로 사용자 조회 후 재설정 토큰 발급. (이메일 발송은 추후 연동 가능)
// =============================================================================

import { NextResponse } from 'next/server'
import { z } from 'zod'
import prismaClient from '@/lib/prismaClient'
import crypto from 'crypto'

const schema = z.object({
  email: z.string().email('올바른 이메일을 입력해주세요.'),
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: parsed.error.flatten().fieldErrors.email?.[0] ?? '입력값을 확인해주세요.' },
        { status: 400 }
      )
    }
    const { email } = parsed.data

    const user = await prismaClient.user.findUnique({
      where: { email },
    })
    if (!user || !user.password) {
      // 보안상 존재 여부를 구분하지 않고 동일 메시지 반환
      return NextResponse.json({
        ok: true,
        message: '해당 이메일로 재설정 링크를 보냈습니다. 이메일을 확인해주세요.',
      })
    }

    const token = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1시간

    await prismaClient.user.update({
      where: { id: user.id },
      data: {
        resetToken: token,
        resetTokenExpiresAt: expiresAt,
      },
    })

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? (request.headers.get('origin') || '')
    const resetLink = `${baseUrl.replace(/\/$/, '')}/reset-password?token=${token}`

    // TODO: 이메일 서비스(Resend, SendGrid, SES 등) 연동 시 여기서 실제 발송
    // await sendPasswordResetEmail(user.email, resetLink)

    return NextResponse.json({
      ok: true,
      message: '해당 이메일로 재설정 링크를 보냈습니다. 이메일을 확인해주세요.',
      // 개발/테스트용: 이메일 미설정 시 화면에서 링크 표시할 수 있도록 반환 (운영에서는 제거 권장)
      devResetLink: process.env.NODE_ENV === 'development' ? resetLink : undefined,
    })
  } catch (e) {
    console.error('forgot-password error:', e)
    return NextResponse.json(
      { ok: false, error: '처리 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
