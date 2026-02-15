// =============================================================================
// 관리자 주문 목록/상태 변경 API - /api/admin/orders
// GET: 실 DB 주문 목록 조회(검색/필터/페이지네이션)
// PUT: 배송 상태를 간단히 변경
// =============================================================================

import { NextResponse } from "next/server"
import type { DeliveryStatus, Prisma } from "@prisma/client"
import prismaClient from "@/lib/prismaClient"
import { requireAdminSession } from "@/lib/requireAdminSession"

const DELIVERY_STATUS_VALUES: DeliveryStatus[] = [
  "ORDER_COMPLETE",
  "PREPARING",
  "IN_DELIVERY",
  "ARRIVING",
  "DELIVERED",
]

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const auth = await requireAdminSession(request)
  if ("error" in auth) return auth.error

  const { searchParams } = new URL(request.url)
  const search = searchParams.get("search")?.trim() ?? ""
  const deliveryStatus = searchParams.get("deliveryStatus")?.trim() ?? ""
  const cursorRaw = searchParams.get("cursor")
  const limitRaw = Number(searchParams.get("limit") ?? "20")

  // 조회 건수는 과도한 요청을 막기 위해 상한/하한을 고정합니다.
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 100) : 20
  const cursor = cursorRaw && Number.isFinite(Number(cursorRaw)) ? Number(cursorRaw) : null

  const where: Prisma.OrderWhereInput = {}
  if (deliveryStatus && DELIVERY_STATUS_VALUES.includes(deliveryStatus as DeliveryStatus)) {
    where.deliveryStatus = deliveryStatus as DeliveryStatus
  }

  if (search.length > 0) {
    const searchConditions: Prisma.OrderWhereInput[] = [
      { user: { name: { contains: search, mode: "insensitive" } } },
      { user: { email: { contains: search, mode: "insensitive" } } },
      { trackingNumber: { contains: search, mode: "insensitive" } },
      { externalDeliveryId: { contains: search, mode: "insensitive" } },
    ]
    if (Number.isFinite(Number(search))) {
      searchConditions.push({ id: Number(search) })
    }
    where.OR = searchConditions
  }

  const orders = await prismaClient.order.findMany({
    where,
    orderBy: { id: "desc" },
    take: limit,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    include: {
      user: { select: { id: true, name: true, email: true } },
      payment: { select: { status: true, paymentMethod: true } },
      _count: { select: { items: true } },
    },
  })

  const nextCursor = orders.length === limit ? orders[orders.length - 1].id : null

  const formatted = orders.map((order) => ({
    id: order.id,
    createdAt: order.createdAt,
    totalAmount: order.totalAmount,
    status: order.status,
    deliveryStatus: order.deliveryStatus,
    deliveryProvider: order.deliveryProvider,
    externalDeliveryStatus: order.externalDeliveryStatus,
    courierCode: order.courierCode,
    trackingNumber: order.trackingNumber,
    trackingUrl: order.trackingUrl,
    dispatchedAt: order.dispatchedAt,
    deliveredAt: order.deliveredAt,
    itemCount: order._count.items,
    customerName: order.user.name,
    customerEmail: order.user.email,
    paymentStatus: order.payment?.status ?? null,
    paymentMethod: order.payment?.paymentMethod ?? null,
  }))

  return NextResponse.json(
    { orders: formatted, nextCursor },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  )
}

export async function PUT(request: Request) {
  const auth = await requireAdminSession(request)
  if ("error" in auth) return auth.error

  try {
    const { orderId, deliveryStatus } = (await request.json()) as {
      orderId?: number | string
      deliveryStatus?: string
    }

    const parsedOrderId = Number(orderId)
    if (!Number.isInteger(parsedOrderId)) {
      return NextResponse.json({ error: "유효한 주문 ID가 아닙니다." }, { status: 400 })
    }
    if (!deliveryStatus || !DELIVERY_STATUS_VALUES.includes(deliveryStatus as DeliveryStatus)) {
      return NextResponse.json({ error: "유효한 배송 상태가 아닙니다." }, { status: 400 })
    }

    const updated = await prismaClient.order.update({
      where: { id: parsedOrderId },
      data: {
        deliveryStatus: deliveryStatus as DeliveryStatus,
        deliveredAt: deliveryStatus === "DELIVERED" ? new Date() : undefined,
      },
      select: {
        id: true,
        deliveryStatus: true,
        deliveredAt: true,
      },
    })

    return NextResponse.json({
      message: `주문 #${updated.id} 배송 상태를 변경했습니다.`,
      order: updated,
    })
  } catch (error) {
    console.error("관리자 주문 상태 변경 오류:", error)
    return NextResponse.json({ error: "배송 상태 업데이트에 실패했습니다." }, { status: 400 })
  }
}
