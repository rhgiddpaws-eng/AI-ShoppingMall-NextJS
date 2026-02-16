// =============================================================================
// 회원가입 API - POST /api/register
// 이름·이메일·비밀번호 검증, 이메일 중복 확인, 비밀번호 해시 후 User 생성
// =============================================================================

import prismaClient from '@/lib/prismaClient'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import * as argon2 from 'argon2'

const registerSchema = z.object({
  name: z.string().min(2, { message: '이름은 2글자 이상이어야 합니다.' }),
  email: z.string().email({ message: '올바른 이메일 주소를 입력해주세요.' }),
  password: z.string().min(6, { message: '비밀번호는 6자 이상이어야 합니다.' }),
})

export type RegisterResponse = {
  ok: boolean
  message?: string
  error?: string
}

export async function POST(req: NextRequest) {
  try {
    const args = await req.json()

    const validatedFields = registerSchema.safeParse(args)

    if (!validatedFields.success) {
      return NextResponse.json<RegisterResponse>(
        { ok: false, error: '유효하지 않은 필드입니다.' },
        { status: 400 },
      )
    }

    const { name, email, password } = validatedFields.data

    // 이메일 중복 체크
    const user = await prismaClient.user.findUnique({
      where: {
        email: email,
      },
    })

    // 유저가 존재하는 경우 400 에러 반환 - (회원가입 진행 불가)
    if (user) {
      return NextResponse.json<RegisterResponse>(
        { ok: false, error: '이미 존재하는 이메일입니다.' },
        { status: 400 },
      )
    }

    //   비밀번호 해시화
    const hashedPassword = await argon2.hash(password)

    //   유저가 존재하지 않는 경우 회원가입 진행
    const newUser = await prismaClient.user.create({
      data: {
        name: name,
        email: email,
        password: hashedPassword,
      },
    })

    if (!newUser) {
      return NextResponse.json<RegisterResponse>(
        { ok: false, error: '회원가입 실패' },
        { status: 400 },
      )
    }

    return NextResponse.json<RegisterResponse>({
      ok: true,
      message: '회원가입 완료',
    })
  } catch (error) {
    console.error('Error in register route: ', error)
    return NextResponse.json<RegisterResponse>(
      { ok: false, error: 'Internal server error' },
      { status: 500 },
    )
  }
}
