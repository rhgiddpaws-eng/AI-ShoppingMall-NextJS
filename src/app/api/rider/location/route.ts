// =============================================================================
// 라이더 위치 수집 API - /api/rider/location
// fallback(internal) 모드에서 모바일 웹이 좌표를 주기적으로 전송할 때 사용합니다.
// =============================================================================

import { NextResponse } from "next/server"
import prismaClient from "@/lib/prismaClient"
import { getAuthFromRequest } from "@/lib/authFromRequest"
import { getDeliveryProviderMode } from "@/lib/courier/providerRegistry"

export async function POST(request: Request) {
  const auth = await getAuthFromRequest(request)
  if (!auth?.id) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 })
  }

  const body = (await request.json()) as {
    orderId?: number
    lat?: number
    lng?: number
    accuracy?: number | null
    source?: string
  }

  if (!Number.isInteger(body.orderId)) {
    return NextResponse.json({ error: "orderId 값이 올바르지 않습니다." }, { status: 400 })
  }
  if (!Number.isFinite(body.lat) || !Number.isFinite(body.lng)) {
    return NextResponse.json({ error: "lat/lng 값이 올바르지 않습니다." }, { status: 400 })
  }

  const mode = getDeliveryProviderMode()
  const source = body.source?.trim() || `RIDER_WEB_${mode.toUpperCase()}`

  const order = await prismaClient.order.findUnique({
    where: { id: body.orderId },
    select: { id: true, status: true, deliveryStatus: true },
  })
  if (!order) {
    return NextResponse.json({ error: "주문을 찾을 수 없습니다." }, { status: 404 })
  }
  if (order.status !== "PAID") {
    return NextResponse.json({ error: "결제 완료 주문만 위치를 갱신할 수 있습니다." }, { status: 409 })
  }

  await prismaClient.$transaction(async (tx) => {
    await tx.order.update({
      where: { id: body.orderId },
      data: {
        riderLat: body.lat!,
        riderLng: body.lng!,
        riderUpdatedAt: new Date(),
        // 라이더 좌표가 들어오면 최소 배송중 상태로 올려 고객 화면에서 추적 가능하게 만듭니다.
        deliveryStatus:
          order.deliveryStatus === "ORDER_COMPLETE" || order.deliveryStatus === "PREPARING"
            ? "IN_DELIVERY"
            : order.deliveryStatus,
      },
    })

    await tx.riderLocationLog.create({
      data: {
        orderId: body.orderId!,
        riderUserId: auth.id,
        lat: body.lat!,
        lng: body.lng!,
        accuracy: body.accuracy ?? null,
        source,
      },
    })
  })

  return NextResponse.json({ ok: true, mode })
}
