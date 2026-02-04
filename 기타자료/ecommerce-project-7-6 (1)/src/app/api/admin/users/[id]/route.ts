import { NextResponse } from "next/server"

// 유저 상세 모킹 데이터
interface UserData {
  id: string;
  name: string;
  email: string;
  phone: string;
  joinDate: string;
  lastLogin: string;
  status: string;
  role: string;
  address: string;
  orders: Array<{
    id: string;
    date: string;
    total: number;
    status: string;
  }>;
}

const usersData: { [key: string]: UserData } = {
  "USR-001": {
    id: "USR-001",
    name: "김민준",
    email: "minjun@example.com",
    phone: "010-1234-5678",
    joinDate: "2023-01-15",
    lastLogin: "2023-07-14",
    status: "활성",
    role: "사용자",
    address: "서울특별시 강남구 테헤란로 123, 456동 789호",
    orders: [
      { id: "ORD-001", date: "2023-07-15", total: 118000, status: "배송 완료" },
      { id: "ORD-008", date: "2023-06-20", total: 45000, status: "배송 완료" },
      { id: "ORD-015", date: "2023-05-10", total: 67000, status: "배송 완료" },
    ],
  },
  "USR-002": {
    id: "USR-002",
    name: "이서연",
    email: "seoyeon@example.com",
    phone: "010-2345-6789",
    joinDate: "2023-02-20",
    lastLogin: "2023-07-15",
    status: "활성",
    role: "사용자",
    address: "부산광역시 해운대구 해운대로 456, 101동 202호",
    orders: [
      { id: "ORD-002", date: "2023-07-14", total: 125000, status: "배송 중" },
      { id: "ORD-010", date: "2023-06-05", total: 89000, status: "배송 완료" },
    ],
  },
  "USR-003": {
    id: "USR-003",
    name: "박지훈",
    email: "jihoon@example.com",
    phone: "010-3456-7890",
    joinDate: "2023-03-10",
    lastLogin: "2023-07-10",
    status: "활성",
    role: "관리자",
    address: "인천광역시 연수구 송도동 789번지",
    orders: [],
  },
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = (await params).id

  // 해당 ID의 유저가 있는지 확인
  if (!usersData[userId]) {
    return NextResponse.json({ error: "사용자를 찾을 수 없습니다" }, { status: 404 })
  }

  return NextResponse.json(usersData[userId])
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = (await params).id

  // 해당 ID의 유저가 있는지 확인
  if (!usersData[userId]) {
    return NextResponse.json({ error: "사용자를 찾을 수 없습니다" }, { status: 404 })
  }

  try {
    const updatedUser = await request.json()

    // 실제 구현에서는 데이터베이스에 업데이트하는 로직이 들어갑니다
    // 여기서는 간단히 성공 응답만 반환합니다

    return NextResponse.json({
      ...usersData[userId],
      ...updatedUser,
      id: userId, // ID는 변경 불가
    })
  } catch (error) {
    return NextResponse.json({ error: "사용자 정보 업데이트 실패" }, { status: 400 })
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = (await params).id

  // 해당 ID의 유저가 있는지 확인
  if (!usersData[userId]) {
    return NextResponse.json({ error: "사용자를 찾을 수 없습니다" }, { status: 404 })
  }

  // 실제 구현에서는 데이터베이스에서 삭제하는 로직이 들어갑니다
  // 여기서는 간단히 성공 응답만 반환합니다

  return NextResponse.json({ message: "사용자가 성공적으로 삭제되었습니다" })
}

