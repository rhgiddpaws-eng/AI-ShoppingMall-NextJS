import { NextResponse } from "next/server"

// 주문 모킹 데이터
const orders = [
  {
    id: "ORD-001",
    customer: "김민준",
    date: "2023-07-15",
    items: 3,
    total: 89000,
    paymentStatus: "결제 완료",
    deliveryStatus: "배송 완료",
  },
  {
    id: "ORD-002",
    customer: "이서연",
    date: "2023-07-14",
    items: 2,
    total: 125000,
    paymentStatus: "결제 완료",
    deliveryStatus: "배송 중",
  },
  {
    id: "ORD-003",
    customer: "박지훈",
    date: "2023-07-14",
    items: 1,
    total: 45000,
    paymentStatus: "결제 완료",
    deliveryStatus: "배송 준비 중",
  },
  {
    id: "ORD-004",
    customer: "최예은",
    date: "2023-07-13",
    items: 4,
    total: 67000,
    paymentStatus: "결제 대기",
    deliveryStatus: "결제 대기",
  },
  {
    id: "ORD-005",
    customer: "정도윤",
    date: "2023-07-12",
    items: 2,
    total: 112000,
    paymentStatus: "결제 완료",
    deliveryStatus: "배송 완료",
  },
  {
    id: "ORD-006",
    customer: "강지아",
    date: "2023-07-11",
    items: 1,
    total: 39000,
    paymentStatus: "결제 완료",
    deliveryStatus: "배송 완료",
  },
  {
    id: "ORD-007",
    customer: "윤서준",
    date: "2023-07-10",
    items: 3,
    total: 157000,
    paymentStatus: "결제 완료",
    deliveryStatus: "배송 중",
  },
]

export async function GET(request: Request) {
  // URL에서 검색어와 상태 파라미터 추출
  const { searchParams } = new URL(request.url)
  const search = searchParams.get("search")?.toLowerCase()
  const status = searchParams.get("status")

  // 검색어와 상태로 필터링
  let filteredOrders = orders

  if (search) {
    filteredOrders = filteredOrders.filter(
      (order) => order.id.toLowerCase().includes(search) || order.customer.toLowerCase().includes(search),
    )
  }

  if (status && status !== "all") {
    filteredOrders = filteredOrders.filter((order) => order.deliveryStatus === status)
  }

  return NextResponse.json(filteredOrders)
}

export async function PUT(request: Request) {
  try {
    const { orderId, deliveryStatus } = await request.json()

    // 실제 구현에서는 데이터베이스에서 해당 주문을 찾아 상태를 업데이트하는 로직이 들어갑니다
    // 여기서는 간단히 성공 응답만 반환합니다

    return NextResponse.json({
      message: `주문 ${orderId}의 배송 상태가 '${deliveryStatus}'(으)로 변경되었습니다.`,
    })
  } catch (error) {
    return NextResponse.json({ error: "배송 상태 업데이트 실패" }, { status: 400 })
  }
}

