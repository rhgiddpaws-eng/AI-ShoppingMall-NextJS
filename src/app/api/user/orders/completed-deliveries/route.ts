// =============================================================================
// 사용자 배송 완료 목록 API - /api/user/orders/completed-deliveries
// 배송 완료된 주문을 별도 목록으로 보여주기 위한 경량 API입니다.
// =============================================================================

import { NextResponse } from "next/server"
import prismaClient from "@/lib/prismaClient"
import { getAuthFromRequest } from "@/lib/authFromRequest"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const auth = await getAuthFromRequest(request)
  if (!auth?.id) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const limitRaw = Number(searchParams.get("limit") ?? "20")
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 100) : 20

  const orders = await prismaClient.order.findMany({
    where: {
      userId: auth.id,
      status: "PAID",
      OR: [{ deliveryStatus: "DELIVERED" }, { deliveredAt: { not: null } }],
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      totalAmount: true,
      deliveryStatus: true,
      deliveryProvider: true,
      externalDeliveryStatus: true,
      courierCode: true,
      trackingNumber: true,
      trackingUrl: true,
      deliveredAt: true,
      shippingAddress: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  return NextResponse.json(
    { orders },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  )
}
