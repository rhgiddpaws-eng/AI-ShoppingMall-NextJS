import { NextResponse } from "next/server"

// 주문 상세 모킹 데이터
interface OrderData {
  id: string;
  customer: {
    name: string;
    email: string;
    phone: string;
  };
  date: string;
  paymentStatus: string;
  deliveryStatus: string;
  paymentMethod: string;
  shippingAddress: string;
  items: Array<{
    id: string;
    name: string;
    price: number;
    quantity: number;
  }>;
  subtotal: number;
  shipping: number;
  total: number;
}

const ordersData: { [key: string]: OrderData } = {
  "ORD-001": {
    id: "ORD-001",
    customer: {
      name: "김민준",
      email: "minjun@example.com",
      phone: "010-1234-5678",
    },
    date: "2023-07-15",
    paymentStatus: "결제 완료",
    deliveryStatus: "배송 완료",
    paymentMethod: "신용카드",
    shippingAddress: "서울특별시 강남구 테헤란로 123, 456동 789호",
    items: [
      { id: "PRD-001", name: "프리미엄 코튼 티셔츠", price: 39000, quantity: 1 },
      { id: "PRD-002", name: "슬림핏 데님 청바지", price: 79000, quantity: 1 },
    ],
    subtotal: 118000,
    shipping: 0,
    total: 118000,
  },
  "ORD-002": {
    id: "ORD-002",
    customer: {
      name: "이서연",
      email: "seoyeon@example.com",
      phone: "010-2345-6789",
    },
    date: "2023-07-14",
    paymentStatus: "결제 완료",
    deliveryStatus: "배송 중",
    paymentMethod: "신용카드",
    shippingAddress: "부산광역시 해운대구 해운대로 456, 101동 202호",
    items: [
      { id: "PRD-003", name: "캐주얼 후드 집업", price: 89000, quantity: 1 },
      { id: "PRD-005", name: "미니멀 크로스백", price: 59000, quantity: 1 },
    ],
    subtotal: 148000,
    shipping: 0,
    total: 148000,
  },
  "ORD-003": {
    id: "ORD-003",
    customer: {
      name: "박지훈",
      email: "jihoon@example.com",
      phone: "010-3456-7890",
    },
    date: "2023-07-14",
    paymentStatus: "결제 완료",
    deliveryStatus: "배송 준비 중",
    paymentMethod: "무통장입금",
    shippingAddress: "인천광역시 연수구 송도동 789번지",
    items: [{ id: "PRD-001", name: "프리미엄 코튼 티셔츠", price: 39000, quantity: 1 }],
    subtotal: 39000,
    shipping: 3000,
    total: 42000,
  },
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const orderId = (await params).id

  // 해당 ID의 주문이 있는지 확인
  if (!ordersData[orderId]) {
    return NextResponse.json({ error: "주문을 찾을 수 없습니다" }, { status: 404 })
  }

  return NextResponse.json(ordersData[orderId])
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
  
) {
  const orderId = (await params).id

  // 해당 ID의 주문이 있는지 확인
  if (!ordersData[orderId]) {
    return NextResponse.json({ error: "주문을 찾을 수 없습니다" }, { status: 404 })
  }

  try {
    const { deliveryStatus } = await request.json()

    // 실제 구현에서는 데이터베이스에 업데이트하는 로직이 들어갑니다
    // 여기서는 간단히 성공 응답만 반환합니다

    return NextResponse.json({
      ...ordersData[orderId],
      deliveryStatus,
    })
  } catch (error) {
    return NextResponse.json({ error: "주문 상태 업데이트 실패" }, { status: 400 })
  }
}

