// =============================================================================
// 관리자 대시보드 API - GET /api/admin/dashboard
// 쿼리: period(week|month|year) → 통계·매출 추이·주문 상태·최근 주문·재고 부족 상품 반환
// =============================================================================

import { NextResponse } from "next/server"
import { requireAdminSession } from "@/lib/requireAdminSession"
import prisma from "@/lib/prismaClient"

/**
 * 일별 매출 데이터 생성 (최근 30일)
 */
async function getDailySalesData() {
  const now = new Date()
  const salesData = []

  // 최근 30일 데이터 생성
  for (let i = 29; i >= 0; i--) {
    const targetDate = new Date(now)
    targetDate.setDate(now.getDate() - i)

    const startDate = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 0, 0, 0)
    const endDate = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 23, 59, 59)

    const orders = await prisma.order.findMany({
      where: {
        status: "PAID",
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        totalAmount: true,
      },
    })

    const totalSales = orders.reduce((sum, order) => sum + order.totalAmount, 0)
    const month = targetDate.getMonth() + 1
    const day = targetDate.getDate()
    salesData.push({
      name: `${month}/${day}`,
      매출: Math.round(totalSales),
    })
  }

  return salesData
}

/**
 * 월별 매출 데이터 생성 (최근 12개월)
 */
async function getMonthlySalesData() {
  const now = new Date()
  const salesData = []

  // 최근 12개월 데이터 생성 (현재 월부터 역순으로)
  for (let i = 11; i >= 0; i--) {
    const targetDate = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const year = targetDate.getFullYear()
    const month = targetDate.getMonth()

    const startDate = new Date(year, month, 1, 0, 0, 0)
    const endDate = new Date(year, month + 1, 0, 23, 59, 59)

    const orders = await prisma.order.findMany({
      where: {
        status: "PAID",
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        totalAmount: true,
      },
    })

    const totalSales = orders.reduce((sum, order) => sum + order.totalAmount, 0)
    salesData.push({
      name: `${year}.${String(month + 1).padStart(2, '0')}`,
      매출: Math.round(totalSales),
    })
  }

  return salesData
}

/**
 * 연도별 매출 데이터 생성 (최근 5년)
 */
async function getYearlySalesData() {
  const now = new Date()
  const currentYear = now.getFullYear()
  const salesData = []

  for (let i = 4; i >= 0; i--) {
    const year = currentYear - i
    const startDate = new Date(year, 0, 1, 0, 0, 0)
    const endDate = new Date(year, 11, 31, 23, 59, 59)

    const orders = await prisma.order.findMany({
      where: {
        status: "PAID",
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        totalAmount: true,
      },
    })

    const totalSales = orders.reduce((sum, order) => sum + order.totalAmount, 0)
    salesData.push({
      name: `${year}년`,
      매출: Math.round(totalSales),
    })
  }

  return salesData
}

/**
 * 대시보드 통계 데이터 생성
 */
async function getDashboardData(period: "week" | "month" | "year") {
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth()

  // 이번 달 시작/끝
  const thisMonthStart = new Date(currentYear, currentMonth, 1, 0, 0, 0)
  const thisMonthEnd = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59)

  // 지난 달 시작/끝
  const lastMonthStart = new Date(currentYear, currentMonth - 1, 1, 0, 0, 0)
  const lastMonthEnd = new Date(currentYear, currentMonth, 0, 23, 59, 59)

  // 총 사용자 수
  const totalUsers = await prisma.user.count()

  // 이번 달 신규 가입자
  const newUsersThisMonth = await prisma.user.count({
    where: {
      createdAt: {
        gte: thisMonthStart,
        lte: thisMonthEnd,
      },
    },
  })

  // 지난 달 신규 가입자
  const newUsersLastMonth = await prisma.user.count({
    where: {
      createdAt: {
        gte: lastMonthStart,
        lte: lastMonthEnd,
      },
    },
  })

  // 이번 달 매출
  const thisMonthOrders = await prisma.order.findMany({
    where: {
      status: "PAID",
      createdAt: {
        gte: thisMonthStart,
        lte: thisMonthEnd,
      },
    },
    select: {
      totalAmount: true,
    },
  })
  const monthlyRevenue = thisMonthOrders.reduce((sum, order) => sum + order.totalAmount, 0)

  // 지난 달 매출
  const lastMonthOrders = await prisma.order.findMany({
    where: {
      status: "PAID",
      createdAt: {
        gte: lastMonthStart,
        lte: lastMonthEnd,
      },
    },
    select: {
      totalAmount: true,
    },
  })
  const lastMonthRevenue = lastMonthOrders.reduce((sum, order) => sum + order.totalAmount, 0)

  // 총 주문 건수
  const totalOrders = await prisma.order.count()

  // 이번 달 주문 건수
  const ordersThisMonth = await prisma.order.count({
    where: {
      createdAt: {
        gte: thisMonthStart,
        lte: thisMonthEnd,
      },
    },
  })

  // 지난 달 주문 건수
  const ordersLastMonth = await prisma.order.count({
    where: {
      createdAt: {
        gte: lastMonthStart,
        lte: lastMonthEnd,
      },
    },
  })

  // 재고 부족 상품 (재고 5개 이하)
  const lowStockProducts = await prisma.product.count({
    where: {
      stock: {
        lte: 5,
      },
    },
  })

  // 주문 상태별 건수
  const pendingOrders = await prisma.order.count({ where: { status: "PENDING" } })
  const paidOrders = await prisma.order.count({ where: { status: "PAID" } })
  const canceledOrders = await prisma.order.count({ where: { status: "CANCELED" } })

  // 배송 상태별 건수 (PAID 주문 중)
  const preparingOrders = await prisma.order.count({
    where: { status: "PAID", deliveryStatus: "PREPARING" },
  })
  const inDeliveryOrders = await prisma.order.count({
    where: { status: "PAID", deliveryStatus: "IN_DELIVERY" },
  })
  const deliveredOrders = await prisma.order.count({
    where: { status: "PAID", deliveryStatus: "DELIVERED" },
  })

  // 최근 주문 5개
  const recentOrders = await prisma.order.findMany({
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
  })

  // 재고 부족 상품 목록
  const lowStockProductsList = await prisma.product.findMany({
    where: {
      stock: {
        lte: 5,
      },
    },
    take: 5,
    orderBy: {
      stock: "asc",
    },
    select: {
      id: true,
      name: true,
      stock: true,
      category: true,
    },
  })

  // 기간별 매출 데이터
  let salesData
  if (period === "week") {
    salesData = await getDailySalesData()
  } else if (period === "month") {
    salesData = await getMonthlySalesData()
  } else {
    salesData = await getYearlySalesData()
  }

  // 트렌드 계산
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
      exchangeRequests: 0, // 교환 요청은 별도 테이블이 필요하므로 0으로 설정
    },
    recentOrders: recentOrders.map((order) => ({
      id: `ORD-${order.id.toString().padStart(3, "0")}`,
      customer: order.user.name || order.user.email,
      date: order.createdAt.toISOString().split("T")[0],
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
    lowStockProducts: lowStockProductsList.map((product) => ({
      id: `PRD-${product.id.toString().padStart(3, "0")}`,
      name: product.name,
      stock: product.stock,
      category: product.category || "미분류",
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

