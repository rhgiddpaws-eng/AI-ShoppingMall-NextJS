import { NextResponse } from "next/server"
import prismaClient from "@/lib/prismaClient"
import { getAuthFromRequest } from "@/lib/authFromRequest"
import { DeliveryStatus, OrderStatus } from "@/lib/orderEnums"
import type { DeliveryStatus as DeliveryStatusType } from "@/lib/orderEnums"
import { geocodeAddress } from "@/lib/naverGeocode"

const ACTIVE_DELIVERY_STATUS: DeliveryStatusType[] = [
  DeliveryStatus.ORDER_COMPLETE,
  DeliveryStatus.PREPARING,
  DeliveryStatus.IN_DELIVERY,
  DeliveryStatus.ARRIVING,
]

const ACTIVE_ORDER_SELECT = {
  id: true,
  status: true,
  deliveryStatus: true,
  shippingAddress: true,
  shippingLat: true,
  shippingLng: true,
  riderLat: true,
  riderLng: true,
  riderUpdatedAt: true,
  externalDeliveryStatus: true,
  externalDeliveryId: true,
  trackingNumber: true,
  trackingUrl: true,
  deliveryProvider: true,
  courierCode: true,
  createdAt: true,
  updatedAt: true,
} as const

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const auth = await getAuthFromRequest(request)
  if (!auth?.id) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 })
  }

  const order = await prismaClient.order.findFirst({
    where: {
      userId: auth.id,
      status: OrderStatus.PAID,
      deliveryStatus: {
        in: ACTIVE_DELIVERY_STATUS,
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    select: ACTIVE_ORDER_SELECT,
  })

  // 좌표가 비어있는 과거 주문은 조회 시 한 번 보정해서 지도 표시를 안정화합니다.
  let resolvedOrder = order
  if (order?.shippingAddress && (order.shippingLat == null || order.shippingLng == null)) {
    const geocoded = await geocodeAddress(order.shippingAddress)
    if (geocoded) {
      resolvedOrder = await prismaClient.order.update({
        where: { id: order.id },
        data: {
          shippingLat: geocoded.lat,
          shippingLng: geocoded.lng,
        },
        select: ACTIVE_ORDER_SELECT,
      })
    }
  }

  const enrichedOrder = resolvedOrder
    ? {
        ...resolvedOrder,
        // 기존 프론트 호환성을 위해 응답 필드 이름을 추가 제공합니다.
        externalTrackingId: resolvedOrder.externalDeliveryId ?? resolvedOrder.trackingNumber ?? null,
        riderLastSeenAt: resolvedOrder.riderUpdatedAt,
      }
    : null

  return NextResponse.json(
    { order: enrichedOrder },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  )
}