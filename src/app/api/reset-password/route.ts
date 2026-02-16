// =============================================================================
// 비밀번호 재설정 실행 API - POST /api/reset-password
// 토큰 검증 후 새 비밀번호로 업데이트
// =============================================================================

import { NextResponse } from 'next/server'
import { z } from 'zod'
import prismaClient from '@/lib/prismaClient'
import * as argon2 from 'argon2'

const schema = z.object({
  token: z.string().min(1, '토큰이 필요합니다.'),
  password: z.string().min(8, '비밀번호는 8자 이상이어야 합니다.'),
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      const msg = parsed.error.flatten().fieldErrors.password?.[0] ?? parsed.error.flatten().fieldErrors.token?.[0] ?? '입력값을 확인해주세요.'
      return NextResponse.json({ ok: false, error: msg }, { status: 400 })
    }
    const { token, password } = parsed.data

    const user = await prismaClient.user.findFirst({
      where: {
        resetToken: token,
        resetTokenExpiresAt: { gt: new Date() },
      },
    })
    if (!user) {
      return NextResponse.json(
        { ok: false, error: '링크가 만료되었거나 유효하지 않습니다. 비밀번호 찾기를 다시 시도해주세요.' },
        { status: 400 }
      )
    }

    const hashed = await argon2.hash(password)
    await prismaClient.user.update({
      where: { id: user.id },
      data: {
        password: hashed,
        resetToken: null,
        resetTokenExpiresAt: null,
      },
    })

    return NextResponse.json({
      ok: true,
      message: '비밀번호가 변경되었습니다. 새 비밀번호로 로그인해주세요.',
    })
  } catch (e) {
    console.error('reset-password error:', e)
    return NextResponse.json(
      { ok: false, error: '처리 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
