// =============================================================================
// 愿由ъ옄 ??쒕낫??API - GET /api/admin/dashboard
// 荑쇰━: period(week|month|year) ???듦퀎쨌留ㅼ텧 異붿씠쨌二쇰Ц ?곹깭쨌理쒓렐 二쇰Ц쨌?ш퀬 遺議??곹뭹 諛섑솚
// =============================================================================

import { NextResponse } from "next/server"
import { requireAdminSession } from "@/lib/requireAdminSession"
import prisma from "@/lib/prismaClient"

type SalesOrderAmountRow = { totalAmount: number }
type RecentOrderRow = {
  id: number
  user: { name: string | null; email: string }
  createdAt: Date
  deliveryStatus: string | null
  status: string
  totalAmount: number
}
type LowStockProductRow = {
  id: number
  name: string
  stock: number
  category: string | null
}
type SalesDataPoint = { name: string; sales: number }

// 매출 합계 계산을 공통화해 reduce 콜백 파라미터 타입 오류를 방지한다.
function sumTotalAmount(rows: SalesOrderAmountRow[]): number {
  return rows.reduce((sum: number, row: SalesOrderAmountRow) => sum + row.totalAmount, 0)
}

// 과거 결제 라우트 버그로 주문/결제 상태가 PENDING/WAITING으로 남은 데이터도
// 관리자 매출 통계에서 누락되지 않도록 "실결제 완료로 간주할 조건"을 공통화합니다.
function getPaidLikeOrderWhere(dateRange?: { gte: Date; lte: Date }) {
  return {
    ...(dateRange ? { createdAt: dateRange } : {}),
    OR: [
      { status: "PAID" as const },
      { payment: { is: { status: "PAID" as const } } },
      { payment: { is: { status: "WAITING" as const } } },
    ],
  }
}

// 날짜를 로컬 기준 일 단위 키(YYYY-MM-DD)로 맞춰 버킷 합산에 사용합니다.
function formatDateKey(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

// 날짜를 로컬 기준 월 단위 키(YYYY-MM)로 맞춰 버킷 합산에 사용합니다.
function formatMonthKey(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  return `${year}-${month}`
}

/**
 * ?쇰퀎 留ㅼ텧 ?곗씠???앹꽦 (理쒓렐 30??
 */
async function getDailySalesData() {
  const now = new Date()
  const salesData: SalesDataPoint[] = []

  // 30일 구간 전체를 한 번만 조회해 서버에서 날짜별 합계를 계산합니다.
  const rangeStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29, 0, 0, 0)
  const rangeEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)
  const orders = await prisma.order.findMany({
    where: getPaidLikeOrderWhere({
      gte: rangeStart,
      lte: rangeEnd,
    }),
    select: {
      totalAmount: true,
      createdAt: true,
    },
  })
  const salesByDay = new Map<string, number>()
  for (const order of orders) {
    const key = formatDateKey(order.createdAt)
    salesByDay.set(key, (salesByDay.get(key) ?? 0) + order.totalAmount)
  }

  for (let i = 29; i >= 0; i -= 1) {
    const targetDate = new Date(now)
    targetDate.setDate(now.getDate() - i)
    const month = targetDate.getMonth() + 1
    const day = targetDate.getDate()
    const key = formatDateKey(targetDate)
    salesData.push({
      name: `${month}/${day}`,
      // 인코딩 이슈를 피하기 위해 매출 값 키를 ASCII(sales)로 고정합니다.
      sales: Math.round(salesByDay.get(key) ?? 0),
    })
  }

  return salesData
}

/**
 * ?붾퀎 留ㅼ텧 ?곗씠???앹꽦 (理쒓렐 12媛쒖썡)
 */
async function getMonthlySalesData() {
  const now = new Date()
  const salesData: SalesDataPoint[] = []

  // 12개월 구간 전체를 한 번만 조회해 서버에서 월별 합계를 계산합니다.
  const rangeStart = new Date(now.getFullYear(), now.getMonth() - 11, 1, 0, 0, 0)
  const rangeEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
  const orders = await prisma.order.findMany({
    where: getPaidLikeOrderWhere({
      gte: rangeStart,
      lte: rangeEnd,
    }),
    select: {
      totalAmount: true,
      createdAt: true,
    },
  })
  const salesByMonth = new Map<string, number>()
  for (const order of orders) {
    const key = formatMonthKey(order.createdAt)
    salesByMonth.set(key, (salesByMonth.get(key) ?? 0) + order.totalAmount)
  }

  for (let i = 11; i >= 0; i -= 1) {
    const targetDate = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const year = targetDate.getFullYear()
    const month = targetDate.getMonth() + 1
    const key = formatMonthKey(targetDate)
    salesData.push({
      name: `${year}.${String(month).padStart(2, "0")}`,
      // 인코딩 이슈를 피하기 위해 매출 값 키를 ASCII(sales)로 고정합니다.
      sales: Math.round(salesByMonth.get(key) ?? 0),
    })
  }

  return salesData
}

/**
 * ?곕룄蹂?留ㅼ텧 ?곗씠???앹꽦 (理쒓렐 5??
 */
async function getYearlySalesData() {
  const now = new Date()
  const currentYear = now.getFullYear()
  const salesData: SalesDataPoint[] = []

  // 5년 구간 전체를 한 번만 조회해 서버에서 연도별 합계를 계산합니다.
  const rangeStart = new Date(currentYear - 4, 0, 1, 0, 0, 0)
  const rangeEnd = new Date(currentYear, 11, 31, 23, 59, 59)
  const orders = await prisma.order.findMany({
    where: getPaidLikeOrderWhere({
      gte: rangeStart,
      lte: rangeEnd,
    }),
    select: {
      totalAmount: true,
      createdAt: true,
    },
  })
  const salesByYear = new Map<number, number>()
  for (const order of orders) {
    const year = order.createdAt.getFullYear()
    salesByYear.set(year, (salesByYear.get(year) ?? 0) + order.totalAmount)
  }

  for (let i = 4; i >= 0; i -= 1) {
    const year = currentYear - i
    salesData.push({
      name: `${year}`,
      // 인코딩 이슈를 피하기 위해 매출 값 키를 ASCII(sales)로 고정합니다.
      sales: Math.round(salesByYear.get(year) ?? 0),
    })
  }

  return salesData
}

/**
 * ??쒕낫???듦퀎 ?곗씠???앹꽦
 */
async function getDashboardData(period: "week" | "month" | "year") {
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth()

  // ?대쾲 ???쒖옉/??
  const thisMonthStart = new Date(currentYear, currentMonth, 1, 0, 0, 0)
  const thisMonthEnd = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59)

  // 吏?????쒖옉/??
  const lastMonthStart = new Date(currentYear, currentMonth - 1, 1, 0, 0, 0)
  const lastMonthEnd = new Date(currentYear, currentMonth, 0, 23, 59, 59)

  // 서로 독립적인 쿼리는 병렬 실행해 첫 로딩 시간을 줄입니다.
  const salesDataPromise =
    period === "week"
      ? getDailySalesData()
      : period === "month"
        ? getMonthlySalesData()
        : getYearlySalesData()

  const [
    totalUsers,
    newUsersThisMonth,
    newUsersLastMonth,
    thisMonthRevenueAgg,
    lastMonthRevenueAgg,
    totalOrders,
    ordersThisMonth,
    ordersLastMonth,
    lowStockProducts,
    pendingOrders,
    paidOrders,
    canceledOrders,
    preparingOrders,
    inDeliveryOrders,
    deliveredOrders,
    recentOrders,
    lowStockProductsList,
    salesData,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({
      where: {
        createdAt: {
          gte: thisMonthStart,
          lte: thisMonthEnd,
        },
      },
    }),
    prisma.user.count({
      where: {
        createdAt: {
          gte: lastMonthStart,
          lte: lastMonthEnd,
        },
      },
    }),
    prisma.order.aggregate({
      where: getPaidLikeOrderWhere({
        gte: thisMonthStart,
        lte: thisMonthEnd,
      }),
      _sum: {
        totalAmount: true,
      },
    }),
    prisma.order.aggregate({
      where: getPaidLikeOrderWhere({
        gte: lastMonthStart,
        lte: lastMonthEnd,
      }),
      _sum: {
        totalAmount: true,
      },
    }),
    prisma.order.count(),
    prisma.order.count({
      where: {
        createdAt: {
          gte: thisMonthStart,
          lte: thisMonthEnd,
        },
      },
    }),
    prisma.order.count({
      where: {
        createdAt: {
          gte: lastMonthStart,
          lte: lastMonthEnd,
        },
      },
    }),
    prisma.product.count({
      where: {
        stock: {
          lte: 5,
        },
      },
    }),
    prisma.order.count({ where: { status: "PENDING" } }),
    prisma.order.count({ where: getPaidLikeOrderWhere() }),
    prisma.order.count({ where: { status: "CANCELED" } }),
    prisma.order.count({
      where: { ...getPaidLikeOrderWhere(), deliveryStatus: "PREPARING" },
    }),
    prisma.order.count({
      where: { ...getPaidLikeOrderWhere(), deliveryStatus: "IN_DELIVERY" },
    }),
    prisma.order.count({
      where: { ...getPaidLikeOrderWhere(), deliveryStatus: "DELIVERED" },
    }),
    prisma.order.findMany({
      take: 5,
      orderBy: {
        createdAt: "desc",
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    }),
    prisma.product.findMany({
      where: {
        stock: {
          lte: 5,
        },
      },
      // 스크롤 목록에서 충분히 확인할 수 있도록 노출 개수를 늘립니다.
      take: 30,
      orderBy: {
        stock: "asc",
      },
      select: {
        id: true,
        name: true,
        stock: true,
        category: true,
      },
    }),
    salesDataPromise,
  ])
  const monthlyRevenue = thisMonthRevenueAgg._sum.totalAmount ?? 0
  const lastMonthRevenue = lastMonthRevenueAgg._sum.totalAmount ?? 0

  // ?몃젋??怨꾩궛
  const userTrend = newUsersLastMonth > 0
    ? Math.round(((newUsersThisMonth - newUsersLastMonth) / newUsersLastMonth) * 100)
    : 0
  const revenueTrend = lastMonthRevenue > 0
    ? Math.round(((monthlyRevenue - lastMonthRevenue) / lastMonthRevenue) * 100)
    : 0
  const orderTrend = ordersLastMonth > 0
    ? Math.round(((ordersThisMonth - ordersLastMonth) / ordersLastMonth) * 100)
    : 0

  return {
    period,
    stats: {
      totalUsers,
      newUsersThisMonth,
      monthlyRevenue: Math.round(monthlyRevenue),
      totalOrders,
      ordersThisMonth,
      lowStockProducts,
    },
    trends: {
      users: { value: Math.abs(userTrend), isPositive: userTrend >= 0 },
      revenue: { value: Math.abs(revenueTrend), isPositive: revenueTrend >= 0 },
      orders: { value: Math.abs(orderTrend), isPositive: orderTrend >= 0 },
      lowStock: { value: 0, isPositive: false },
    },
    salesData,
    orderStatus: {
      pending: pendingOrders,
      confirmed: paidOrders,
      shipping: inDeliveryOrders,
      delivered: deliveredOrders,
      refundRequests: canceledOrders,
      exchangeRequests: 0, // 援먰솚 ?붿껌? 蹂꾨룄 ?뚯씠釉붿씠 ?꾩슂?섎?濡?0?쇰줈 ?ㅼ젙
    },
    // Vercel 빌드 환경에서 Prisma 타입 추론이 약해져도 안정적으로 컴파일되도록 콜백 타입을 명시한다.
    recentOrders: recentOrders.map((order: RecentOrderRow) => ({
      id: `ORD-${order.id.toString().padStart(3, "0")}`,
      customer: order.user.name || order.user.email,
      date: order.createdAt.toISOString().split("T")[0],
      // 관리자 대시보드에서 사용하는 주문 상태 라벨을 안전한 문자열로 고정한다.
      status:
        order.deliveryStatus === "DELIVERED"
          ? "배송 완료"
          : order.deliveryStatus === "IN_DELIVERY"
            ? "배송 중"
            : order.status === "PAID"
              ? "결제 완료"
              : "결제 대기",
      amount: Math.round(order.totalAmount),
    })),
    // 동일한 이유로 재고 목록 매핑도 콜백 타입을 명시한다.
    lowStockProducts: lowStockProductsList.map((product: LowStockProductRow) => ({
      id: `PRD-${product.id.toString().padStart(3, "0")}`,
      name: product.name,
      stock: product.stock,
      category: product.category || "Uncategorized",
    })),
  }
}

export async function GET(request: Request) {
  const auth = await requireAdminSession(request)
  if ("error" in auth) return auth.error

  const { searchParams } = new URL(request.url)
  const period = (searchParams.get("period") ?? "month") as "week" | "month" | "year"
  const validPeriod = ["week", "month", "year"].includes(period) ? period : "month"

  const dashboardData = await getDashboardData(validPeriod)
  return NextResponse.json(dashboardData)
}


