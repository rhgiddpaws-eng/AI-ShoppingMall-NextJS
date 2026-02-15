// =============================================================================
// 愿由ъ옄 ??쒕낫??API - GET /api/admin/dashboard
// 荑쇰━: period(week|month|year) ???듦퀎쨌留ㅼ텧 異붿씠쨌二쇰Ц ?곹깭쨌理쒓렐 二쇰Ц쨌?ш퀬 遺議??곹뭹 諛섑솚
// =============================================================================

import { NextResponse } from "next/server"
import { requireAdminSession } from "@/lib/requireAdminSession"
import prisma from "@/lib/prismaClient"

type SalesOrderAmountRow = { totalAmount: number }

// 매출 합계 계산을 공통화해 reduce 콜백 파라미터 타입 오류를 방지한다.
function sumTotalAmount(rows: SalesOrderAmountRow[]): number {
  return rows.reduce((sum: number, row: SalesOrderAmountRow) => sum + row.totalAmount, 0)
}

/**
 * ?쇰퀎 留ㅼ텧 ?곗씠???앹꽦 (理쒓렐 30??
 */
async function getDailySalesData() {
  const now = new Date()
  const salesData = []

  // 理쒓렐 30???곗씠???앹꽦
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

    const totalSales = sumTotalAmount(orders)
    const month = targetDate.getMonth() + 1
    const day = targetDate.getDate()
    salesData.push({
      name: `${month}/${day}`,
      留ㅼ텧: Math.round(totalSales),
    })
  }

  return salesData
}

/**
 * ?붾퀎 留ㅼ텧 ?곗씠???앹꽦 (理쒓렐 12媛쒖썡)
 */
async function getMonthlySalesData() {
  const now = new Date()
  const salesData = []

  // 理쒓렐 12媛쒖썡 ?곗씠???앹꽦 (?꾩옱 ?붾?????닚?쇰줈)
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

    const totalSales = sumTotalAmount(orders)
    salesData.push({
      name: `${year}.${String(month + 1).padStart(2, '0')}`,
      留ㅼ텧: Math.round(totalSales),
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

    const totalSales = sumTotalAmount(orders)
    salesData.push({
      name: `${year}`,
      留ㅼ텧: Math.round(totalSales),
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

  // 珥??ъ슜????
  const totalUsers = await prisma.user.count()

  // ?대쾲 ???좉퇋 媛?낆옄
  const newUsersThisMonth = await prisma.user.count({
    where: {
      createdAt: {
        gte: thisMonthStart,
        lte: thisMonthEnd,
      },
    },
  })

  // 吏?????좉퇋 媛?낆옄
  const newUsersLastMonth = await prisma.user.count({
    where: {
      createdAt: {
        gte: lastMonthStart,
        lte: lastMonthEnd,
      },
    },
  })

  // ?대쾲 ??留ㅼ텧
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
  const monthlyRevenue = sumTotalAmount(thisMonthOrders)

  // 吏????留ㅼ텧
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
  const lastMonthRevenue = sumTotalAmount(lastMonthOrders)

  // 珥?二쇰Ц 嫄댁닔
  const totalOrders = await prisma.order.count()

  // ?대쾲 ??二쇰Ц 嫄댁닔
  const ordersThisMonth = await prisma.order.count({
    where: {
      createdAt: {
        gte: thisMonthStart,
        lte: thisMonthEnd,
      },
    },
  })

  // 吏????二쇰Ц 嫄댁닔
  const ordersLastMonth = await prisma.order.count({
    where: {
      createdAt: {
        gte: lastMonthStart,
        lte: lastMonthEnd,
      },
    },
  })

  // ?ш퀬 遺議??곹뭹 (?ш퀬 5媛??댄븯)
  const lowStockProducts = await prisma.product.count({
    where: {
      stock: {
        lte: 5,
      },
    },
  })

  // 二쇰Ц ?곹깭蹂?嫄댁닔
  const pendingOrders = await prisma.order.count({ where: { status: "PENDING" } })
  const paidOrders = await prisma.order.count({ where: { status: "PAID" } })
  const canceledOrders = await prisma.order.count({ where: { status: "CANCELED" } })

  // 諛곗넚 ?곹깭蹂?嫄댁닔 (PAID 二쇰Ц 以?
  const preparingOrders = await prisma.order.count({
    where: { status: "PAID", deliveryStatus: "PREPARING" },
  })
  const inDeliveryOrders = await prisma.order.count({
    where: { status: "PAID", deliveryStatus: "IN_DELIVERY" },
  })
  const deliveredOrders = await prisma.order.count({
    where: { status: "PAID", deliveryStatus: "DELIVERED" },
  })

  // 理쒓렐 二쇰Ц 5媛?
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

  // ?ш퀬 遺議??곹뭹 紐⑸줉
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

  // 湲곌컙蹂?留ㅼ텧 ?곗씠??
  let salesData
  if (period === "week") {
    salesData = await getDailySalesData()
  } else if (period === "month") {
    salesData = await getMonthlySalesData()
  } else {
    salesData = await getYearlySalesData()
  }

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
    recentOrders: recentOrders.map((order) => ({
      id: `ORD-${order.id.toString().padStart(3, "0")}`,
      customer: order.user.name || order.user.email,
      date: order.createdAt.toISOString().split("T")[0],
      // 관리자 대시보드에서 사용하는 주문 상태 라벨을 안전한 문자열로 고정한다.
      status:
        order.deliveryStatus === "DELIVERED"
          ? "Delivered"
          : order.deliveryStatus === "IN_DELIVERY"
            ? "In delivery"
            : order.status === "PAID"
              ? "Paid"
              : "Pending",
      amount: Math.round(order.totalAmount),
    })),
    lowStockProducts: lowStockProductsList.map((product) => ({
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


