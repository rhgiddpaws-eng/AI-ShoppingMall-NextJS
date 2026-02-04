import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const { email, password } = await request.json()

  // 모킹된 로그인 로직
  if (email === "test" && password === "test12!") {
    return NextResponse.json({
      success: true,
      user: {
        id: "1",
        name: "테스트 사용자",
        email: "test@example.com",
      },
    })
  } else {
    return NextResponse.json(
      {
        success: false,
        message: "이메일 또는 비밀번호가 올바르지 않습니다.",
      },
      { status: 401 },
    )
  }
}

