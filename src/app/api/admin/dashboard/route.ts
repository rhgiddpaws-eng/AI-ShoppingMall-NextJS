// =============================================================================
// 관리자 대시보드 API - GET /api/admin/dashboard
// 쿼리: period(week|month|year) 기반 통계, 매출 추이, 주문 상태, 최근 주문, 재고 부족 상품 반환
// =============================================================================

import { NextResponse } from "next/server"
import { requireAdminSession } from "@/lib/requireAdminSession"
import prisma from "@/lib/prismaClient"

// DB가 ap-southeast-2(Sydney)에 있어 함수 실행 리전도 맞춰 왕복 지연을 줄입니다.
export const preferredRegion = "syd1"

type DailySalesRawRow = { day_key: string; total_sales: number | null }
type MonthlySalesRawRow = { month_key: string; total_sales: number | null }
type YearlySalesRawRow = { year_key: string; total_sales: number | null }
type RecentOrderRawRow = {
  id: number
  user_name: string | null
  user_email: string
  created_at: Date
  delivery_status: string | null
  status: string
  total_amount: number
}
type LowStockProductRawRow = {
  id: number
  name: string
  stock: number
  category: string | null
  total_low_stock: bigint | number | string
}
type SalesDataPoint = { name: string; sales: number }
type DashboardPeriod = "week" | "month" | "year"

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

// Raw SQL 집계 결과(BigInt/문자열)를 안전하게 number로 변환합니다.
function toNumber(value: unknown): number {
  if (typeof value === "number") return value
  if (typeof value === "bigint") return Number(value)
  if (typeof value === "string") return Number(value)
  return 0
}

/**
 * 일별 매출 데이터 생성 (최근 30일)
 */
async function getDailySalesData() {
  const now = new Date()
  const salesData: SalesDataPoint[] = []

  // 30일 구간만 DB에서 일(day) 단위로 바로 묶어서 가져와 전송량/연산량을 줄입니다.
  const rangeStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29, 0, 0, 0)
  const rangeEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)
  const orders = await prisma.$queryRaw<DailySalesRawRow[]>`
    WITH paid_like_orders AS (
      SELECT
        o."createdAt",
        o."totalAmount",
        (
          o.status = 'PAID'::"OrderStatus"
          OR p.status = 'PAID'::"PaymentStatus"
          OR p.status = 'WAITING'::"PaymentStatus"
        ) AS paid_like
      FROM "Order" o
      LEFT JOIN "Payment" p ON p."orderId" = o.id
      WHERE o."createdAt" >= ${rangeStart} AND o."createdAt" <= ${rangeEnd}
    )
    SELECT
      TO_CHAR(DATE_TRUNC('day', ("createdAt" AT TIME ZONE 'Asia/Seoul')), 'YYYY-MM-DD') AS day_key,
      COALESCE(SUM("totalAmount"), 0)::double precision AS total_sales
    FROM paid_like_orders
    WHERE paid_like
    GROUP BY 1
  `
  const salesByDay = new Map<string, number>()
  for (const order of orders) {
    salesByDay.set(order.day_key, toNumber(order.total_sales))
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
      sales: Math.round(toNumber(salesByDay.get(key) ?? 0)),
    })
  }

  return salesData
}

/**
 * 월별 매출 데이터 생성 (최근 12개월)
 */
async function getMonthlySalesData() {
  const now = new Date()
  const salesData: SalesDataPoint[] = []

  // 12개월 구간만 DB에서 월(month) 단위로 바로 묶어서 가져와 전송량/연산량을 줄입니다.
  const rangeStart = new Date(now.getFullYear(), now.getMonth() - 11, 1, 0, 0, 0)
  const rangeEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
  const orders = await prisma.$queryRaw<MonthlySalesRawRow[]>`
    WITH paid_like_orders AS (
      SELECT
        o."createdAt",
        o."totalAmount",
        (
          o.status = 'PAID'::"OrderStatus"
          OR p.status = 'PAID'::"PaymentStatus"
          OR p.status = 'WAITING'::"PaymentStatus"
        ) AS paid_like
      FROM "Order" o
      LEFT JOIN "Payment" p ON p."orderId" = o.id
      WHERE o."createdAt" >= ${rangeStart} AND o."createdAt" <= ${rangeEnd}
    )
    SELECT
      TO_CHAR(DATE_TRUNC('month', ("createdAt" AT TIME ZONE 'Asia/Seoul')), 'YYYY-MM') AS month_key,
      COALESCE(SUM("totalAmount"), 0)::double precision AS total_sales
    FROM paid_like_orders
    WHERE paid_like
    GROUP BY 1
  `
  const salesByMonth = new Map<string, number>()
  for (const order of orders) {
    salesByMonth.set(order.month_key, toNumber(order.total_sales))
  }

  for (let i = 11; i >= 0; i -= 1) {
    const targetDate = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const year = targetDate.getFullYear()
    const month = targetDate.getMonth() + 1
    const key = formatMonthKey(targetDate)
    salesData.push({
      name: `${year}.${String(month).padStart(2, "0")}`,
      // 인코딩 이슈를 피하기 위해 매출 값 키를 ASCII(sales)로 고정합니다.
      sales: Math.round(toNumber(salesByMonth.get(key) ?? 0)),
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
  const salesData: SalesDataPoint[] = []

  // 5년 구간만 DB에서 연(year) 단위로 바로 묶어서 가져와 전송량/연산량을 줄입니다.
  const rangeStart = new Date(currentYear - 4, 0, 1, 0, 0, 0)
  const rangeEnd = new Date(currentYear, 11, 31, 23, 59, 59)
  const orders = await prisma.$queryRaw<YearlySalesRawRow[]>`
    WITH paid_like_orders AS (
      SELECT
        o."createdAt",
        o."totalAmount",
        (
          o.status = 'PAID'::"OrderStatus"
          OR p.status = 'PAID'::"PaymentStatus"
          OR p.status = 'WAITING'::"PaymentStatus"
        ) AS paid_like
      FROM "Order" o
      LEFT JOIN "Payment" p ON p."orderId" = o.id
      WHERE o."createdAt" >= ${rangeStart} AND o."createdAt" <= ${rangeEnd}
    )
    SELECT
      TO_CHAR(DATE_TRUNC('year', ("createdAt" AT TIME ZONE 'Asia/Seoul')), 'YYYY') AS year_key,
      COALESCE(SUM("totalAmount"), 0)::double precision AS total_sales
    FROM paid_like_orders
    WHERE paid_like
    GROUP BY 1
  `
  const salesByYear = new Map<number, number>()
  for (const order of orders) {
    const year = Number(order.year_key)
    salesByYear.set(year, toNumber(order.total_sales))
  }

  for (let i = 4; i >= 0; i -= 1) {
    const year = currentYear - i
    salesData.push({
      name: `${year}`,
      // 인코딩 이슈를 피하기 위해 매출 값 키를 ASCII(sales)로 고정합니다.
      sales: Math.round(toNumber(salesByYear.get(year) ?? 0)),
    })
  }

  return salesData
}

/**
 * 대시보드 통계 데이터 생성
 */
async function getDashboardData(period: DashboardPeriod) {
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth()

  // 이번 달 시작/끝
  const thisMonthStart = new Date(currentYear, currentMonth, 1, 0, 0, 0)
  const thisMonthEnd = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59)

  // 지난 달 시작/끝
  const lastMonthStart = new Date(currentYear, currentMonth - 1, 1, 0, 0, 0)
  const lastMonthEnd = new Date(currentYear, currentMonth, 0, 23, 59, 59)

  // period에 따라 필요한 매출 시계열 1개만 조회합니다.
  const salesDataPromise =
    period === "week"
      ? getDailySalesData()
      : period === "month"
        ? getMonthlySalesData()
        : getYearlySalesData()

  const [
    userStatsRows,
    orderStatsRows,
    recentOrders,
    lowStockProductsList,
    salesData,
  ] = await Promise.all([
    // 사용자/주문 집계를 SQL 1회로 합쳐 DB 왕복 횟수를 줄입니다.
    prisma.$queryRaw<
      Array<{
        total_users: bigint | number | string
        new_users_this_month: bigint | number | string
        new_users_last_month: bigint | number | string
      }>
    >`
      SELECT
        COUNT(*) AS total_users,
        COUNT(*) FILTER (
          WHERE "createdAt" >= ${thisMonthStart} AND "createdAt" <= ${thisMonthEnd}
        ) AS new_users_this_month,
        COUNT(*) FILTER (
          WHERE "createdAt" >= ${lastMonthStart} AND "createdAt" <= ${lastMonthEnd}
        ) AS new_users_last_month
      FROM "User"
    `,
    prisma.$queryRaw<
      Array<{
        monthly_revenue: number | null
        last_month_revenue: number | null
        total_orders: bigint | number | string
        orders_this_month: bigint | number | string
        orders_last_month: bigint | number | string
        pending_orders: bigint | number | string
        paid_orders: bigint | number | string
        canceled_orders: bigint | number | string
        preparing_orders: bigint | number | string
        in_delivery_orders: bigint | number | string
        delivered_orders: bigint | number | string
      }>
    >`
      WITH paid_like_orders AS (
        SELECT
          o.id,
          o."totalAmount",
          o.status,
          o."deliveryStatus",
          o."createdAt",
          (
            o.status = 'PAID'::"OrderStatus"
            OR p.status = 'PAID'::"PaymentStatus"
            OR p.status = 'WAITING'::"PaymentStatus"
          ) AS paid_like
        FROM "Order" o
        LEFT JOIN "Payment" p ON p."orderId" = o.id
      )
      SELECT
        COALESCE(SUM("totalAmount") FILTER (
          WHERE paid_like AND "createdAt" >= ${thisMonthStart} AND "createdAt" <= ${thisMonthEnd}
        ), 0)::double precision AS monthly_revenue,
        COALESCE(SUM("totalAmount") FILTER (
          WHERE paid_like AND "createdAt" >= ${lastMonthStart} AND "createdAt" <= ${lastMonthEnd}
        ), 0)::double precision AS last_month_revenue,
        COUNT(*) AS total_orders,
        COUNT(*) FILTER (
          WHERE "createdAt" >= ${thisMonthStart} AND "createdAt" <= ${thisMonthEnd}
        ) AS orders_this_month,
        COUNT(*) FILTER (
          WHERE "createdAt" >= ${lastMonthStart} AND "createdAt" <= ${lastMonthEnd}
        ) AS orders_last_month,
        COUNT(*) FILTER (WHERE status = 'PENDING'::"OrderStatus") AS pending_orders,
        COUNT(*) FILTER (WHERE paid_like) AS paid_orders,
        COUNT(*) FILTER (WHERE status = 'CANCELED'::"OrderStatus") AS canceled_orders,
        COUNT(*) FILTER (
          WHERE paid_like AND "deliveryStatus" = 'PREPARING'::"DeliveryStatus"
        ) AS preparing_orders,
        COUNT(*) FILTER (
          WHERE paid_like AND "deliveryStatus" = 'IN_DELIVERY'::"DeliveryStatus"
        ) AS in_delivery_orders,
        COUNT(*) FILTER (
          WHERE paid_like AND "deliveryStatus" = 'DELIVERED'::"DeliveryStatus"
        ) AS delivered_orders
      FROM paid_like_orders
    `,
    // 최신 주문은 PK(id) 역순 LIMIT으로 가져와 불필요한 정렬 비용을 줄입니다.
    prisma.$queryRaw<RecentOrderRawRow[]>`
      SELECT
        o.id,
        u.name AS user_name,
        u.email AS user_email,
        o."createdAt" AS created_at,
        o."deliveryStatus"::text AS delivery_status,
        o.status::text AS status,
        o."totalAmount" AS total_amount
      FROM "Order" o
      JOIN "User" u ON u.id = o."userId"
      ORDER BY o.id DESC
      LIMIT 5
    `,
    // 재고 부족 카운트와 목록을 한 번에 조회해 왕복 횟수를 줄입니다.
    prisma.$queryRaw<LowStockProductRawRow[]>`
      SELECT
        p.id,
        p.name,
        p.stock,
        p.category::text AS category,
        COUNT(*) OVER() AS total_low_stock
      FROM "Product" p
      WHERE p.stock <= 5
      ORDER BY p.stock ASC, p.id ASC
      LIMIT 30
    `,
    salesDataPromise,
  ])

  const userStats = userStatsRows[0]
  const orderStats = orderStatsRows[0]
  const totalUsers = toNumber(userStats?.total_users)
  const newUsersThisMonth = toNumber(userStats?.new_users_this_month)
  const newUsersLastMonth = toNumber(userStats?.new_users_last_month)

  const monthlyRevenue = toNumber(orderStats?.monthly_revenue ?? 0)
  const lastMonthRevenue = toNumber(orderStats?.last_month_revenue ?? 0)
  const totalOrders = toNumber(orderStats?.total_orders)
  const ordersThisMonth = toNumber(orderStats?.orders_this_month)
  const ordersLastMonth = toNumber(orderStats?.orders_last_month)
  const pendingOrders = toNumber(orderStats?.pending_orders)
  const paidOrders = toNumber(orderStats?.paid_orders)
  const canceledOrders = toNumber(orderStats?.canceled_orders)
  const preparingOrders = toNumber(orderStats?.preparing_orders)
  const inDeliveryOrders = toNumber(orderStats?.in_delivery_orders)
  const deliveredOrders = toNumber(orderStats?.delivered_orders)
  const lowStockProducts = toNumber(lowStockProductsList[0]?.total_low_stock ?? 0)

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
      exchangeRequests: 0, // 교환 요청은 별도 테이블이 없으므로 0으로 고정
    },
    // Raw 조회 결과를 화면 모델로 변환합니다.
    recentOrders: recentOrders.map((order: RecentOrderRawRow) => ({
      id: `ORD-${order.id.toString().padStart(3, "0")}`,
      customer: order.user_name || order.user_email,
      date: order.created_at.toISOString().split("T")[0],
      // 관리자 대시보드에서 사용하는 주문 상태 라벨을 안전한 문자열로 고정한다.
      status:
        order.delivery_status === "DELIVERED"
          ? "배송 완료"
          : order.delivery_status === "IN_DELIVERY"
            ? "배송 중"
          : order.status === "PAID"
              ? "결제 완료"
              : "결제 대기",
      amount: Math.round(order.total_amount),
    })),
    lowStockProducts: lowStockProductsList.map((product: LowStockProductRawRow) => ({
      id: `PRD-${product.id.toString().padStart(3, "0")}`,
      name: product.name,
      stock: product.stock,
      category: product.category || "Uncategorized",
    })),
  }
}

type DashboardResponse = Awaited<ReturnType<typeof getDashboardData>>
const DASHBOARD_CACHE_TTL_MS = 60 * 1000
let dashboardCache:
  | {
      expiresAt: number
      dataByPeriod: Partial<Record<DashboardPeriod, DashboardResponse>>
    }
  | null = null

export async function GET(request: Request) {
  const auth = await requireAdminSession(request)
  if ("error" in auth) return auth.error

  const { searchParams } = new URL(request.url)
  const period = (searchParams.get("period") ?? "month") as DashboardPeriod
  const validPeriod: DashboardPeriod = ["week", "month", "year"].includes(period) ? period : "month"

  const now = Date.now()
  if (!dashboardCache || dashboardCache.expiresAt <= now) {
    // 관리자 대시보드는 초 단위 실시간성이 필요 없어서 60초 캐시로 체감 속도를 개선합니다.
    dashboardCache = { expiresAt: now + DASHBOARD_CACHE_TTL_MS, dataByPeriod: {} }
  }

  const cached = dashboardCache.dataByPeriod[validPeriod]
  if (cached) {
    return NextResponse.json(cached, { headers: { "Cache-Control": "no-store" } })
  }

  const dashboardData = await getDashboardData(validPeriod)
  dashboardCache.dataByPeriod[validPeriod] = dashboardData
  return NextResponse.json(dashboardData)
}


