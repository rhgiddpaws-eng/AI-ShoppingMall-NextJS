import { getSession } from '@/lib/ironSessionControl'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import * as argon2 from 'argon2'
import prismaClient from '@/lib/prismaClient'
export type LoginResponse = {
  ok: boolean
  message?: string
  error?: string
  user?: {
    id: number
    name?: string
    email: string
  }
}

const loginSchema = z.object({
  email: z.string().email({ message: '올바른 이메일 주소를 입력해주세요.' }),
  password: z.string().min(6, { message: '비밀번호는 6자 이상이어야 합니다.' }),
})

type LoginForm = z.infer<typeof loginSchema>

export async function POST(request: Request) {
  const args = await request.json()

  const validatedFields = loginSchema.safeParse(args)

  if (!validatedFields.success) {
    return NextResponse.json<LoginResponse>(
      { ok: false, error: '유효하지 않은 필드입니다.' },
      { status: 400 },
    )
  }

  const { email, password } = validatedFields.data

  try {
    const session = await getSession()

    // email조회
    const user = await prismaClient.user.findUnique({
      where: {
        email: email,
      },
    })

    if (!user || !user.password) {
      return NextResponse.json<LoginResponse>(
        { ok: false, error: '아이디 또는 비밀번호가 올바르지 않습니다.' },
        { status: 400 },
      )
    }

    const isPasswordValid = await argon2.verify(user.password, password)
    if (!isPasswordValid) {
      return NextResponse.json<LoginResponse>(
        { ok: false, error: '비밀번호가 올바르지 않습니다.' },
        { status: 400 },
      )
    }

    // 세션 업데이트
    session.id = user.id
    session.email = user.email
    session.name = user.name ?? undefined
    session.role = user.role
    session.isLoggedIn = true
    await session.save()

    return NextResponse.json<LoginResponse>({
      ok: true,
      message: '로그인 성공',
      user: {
        id: user.id,
        name: user.name ?? undefined,
        email: user.email,
      },
    })
  } catch (error) {
    console.error('Error in login route: ', error)
    return NextResponse.json<LoginResponse>(
      { ok: false, error: '로그인 실패' },
      { status: 400 },
    )
  }
}
