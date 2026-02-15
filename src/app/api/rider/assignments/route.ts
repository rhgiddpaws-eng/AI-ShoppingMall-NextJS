// =============================================================================
// 라이더 배정 목록 API - /api/rider/assignments
// fallback(internal) 모드에서 라이더 모바일 웹이 수행할 주문 목록을 조회합니다.
// =============================================================================

import { NextResponse } from "next/server"
import prismaClient from "@/lib/prismaClient"
import { getAuthFromRequest } from "@/lib/authFromRequest"
import { getDeliveryProviderMode } from "@/lib/courier/providerRegistry"

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
      status: "PAID",
      deliveryStatus: { in: ["PREPARING", "IN_DELIVERY", "ARRIVING"] },
    },
    orderBy: { createdAt: "asc" },
    take: limit,
    select: {
      id: true,
      deliveryStatus: true,
      shippingAddress: true,
      shippingLat: true,
      shippingLng: true,
      riderLat: true,
      riderLng: true,
      riderUpdatedAt: true,
      totalAmount: true,
      createdAt: true,
    },
  })

  return NextResponse.json({
    mode: getDeliveryProviderMode(),
    riderUserId: auth.id,
    assignments: orders,
  })
}
