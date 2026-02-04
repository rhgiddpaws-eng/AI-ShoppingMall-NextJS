import { NextResponse } from "next/server"

// 유저 모킹 데이터
const users = [
  {
    id: "USR-001",
    name: "김민준",
    email: "minjun@example.com",
    joinDate: "2023-01-15",
    lastLogin: "2023-07-14",
    status: "활성",
    role: "사용자",
  },
  {
    id: "USR-002",
    name: "이서연",
    email: "seoyeon@example.com",
    joinDate: "2023-02-20",
    lastLogin: "2023-07-15",
    status: "활성",
    role: "사용자",
  },
  {
    id: "USR-003",
    name: "박지훈",
    email: "jihoon@example.com",
    joinDate: "2023-03-10",
    lastLogin: "2023-07-10",
    status: "활성",
    role: "관리자",
  },
  {
    id: "USR-004",
    name: "최예은",
    email: "yeeun@example.com",
    joinDate: "2023-04-05",
    lastLogin: "2023-06-30",
    status: "비활성",
    role: "사용자",
  },
  {
    id: "USR-005",
    name: "정도윤",
    email: "doyoon@example.com",
    joinDate: "2023-05-12",
    lastLogin: "2023-07-13",
    status: "활성",
    role: "사용자",
  },
  {
    id: "USR-006",
    name: "강지아",
    email: "jia@example.com",
    joinDate: "2023-06-08",
    lastLogin: "2023-07-12",
    status: "활성",
    role: "사용자",
  },
  {
    id: "USR-007",
    name: "윤서준",
    email: "seojun@example.com",
    joinDate: "2023-06-25",
    lastLogin: "2023-07-11",
    status: "활성",
    role: "사용자",
  },
]

export async function GET(request: Request) {
  // URL에서 검색어 파라미터 추출
  const { searchParams } = new URL(request.url)
  const search = searchParams.get("search")?.toLowerCase()

  // 검색어가 있으면 필터링, 없으면 전체 반환
  let filteredUsers = users
  if (search) {
    filteredUsers = users.filter(
      (user) => user.name.toLowerCase().includes(search) || user.email.toLowerCase().includes(search),
    )
  }

  return NextResponse.json(filteredUsers)
}

export async function POST(request: Request) {
  try {
    const newUser = await request.json()

    // 실제 구현에서는 데이터베이스에 저장하는 로직이 들어갑니다
    // 여기서는 간단히 ID만 생성해서 반환합니다
    const userId = `USR-${Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, "0")}`

    return NextResponse.json(
      {
        ...newUser,
        id: userId,
        joinDate: new Date().toISOString().split("T")[0],
        lastLogin: new Date().toISOString().split("T")[0],
      },
      { status: 201 },
    )
  } catch (error) {
    return NextResponse.json({ error: "유저 생성 실패" }, { status: 400 })
  }
}

