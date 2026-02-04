import { NextResponse } from "next/server"

// 대시보드 모킹 데이터
const dashboardData = {
  stats: {
    totalUsers: 1234,
    newUsersThisMonth: 56,
    monthlyRevenue: 34567000,
    totalOrders: 892,
    ordersThisMonth: 123,
    lowStockProducts: 8,
  },
  trends: {
    users: { value: 12, isPositive: true },
    revenue: { value: 8, isPositive: true },
    orders: { value: 5, isPositive: true },
    lowStock: { value: 2, isPositive: false },
  },
  salesData: [
    { name: "1월", 매출: 4000000 },
    { name: "2월", 매출: 3000000 },
    { name: "3월", 매출: 2000000 },
    { name: "4월", 매출: 2780000 },
    { name: "5월", 매출: 1890000 },
    { name: "6월", 매출: 2390000 },
    { name: "7월", 매출: 3490000 },
  ],
  orderStatus: {
    pending: 24,
    confirmed: 42,
    shipping: 18,
    delivered: 67,
    refundRequests: 5,
    exchangeRequests: 3,
  },
  recentOrders: [
    { id: "ORD-001", customer: "김민준", date: "2023-07-15", status: "배송 완료", amount: 89000 },
    { id: "ORD-002", customer: "이서연", date: "2023-07-14", status: "배송 중", amount: 125000 },
    { id: "ORD-003", customer: "박지훈", date: "2023-07-14", status: "결제 완료", amount: 45000 },
    { id: "ORD-004", customer: "최예은", date: "2023-07-13", status: "결제 대기", amount: 67000 },
    { id: "ORD-005", customer: "정도윤", date: "2023-07-12", status: "배송 완료", amount: 112000 },
  ],
  lowStockProducts: [
    { id: "PRD-001", name: "프리미엄 코튼 티셔츠", stock: 3, category: "의류" },
    { id: "PRD-002", name: "슬림핏 데님 청바지", stock: 5, category: "의류" },
    { id: "PRD-003", name: "클래식 가죽 스니커즈", stock: 2, category: "신발" },
  ],
}

export async function GET() {
  // 실제 구현에서는 데이터베이스에서 데이터를 가져오는 로직이 들어갑니다
  return NextResponse.json(dashboardData)
}

