// =============================================================================
// 관리자 배송 상태 시뮬레이션 API - /api/admin/orders/[id]/simulate-status
// 외부 배송사 없이도 상태를 한 단계씩 진행해 지도/추적 화면 테스트를 돕습니다.
// =============================================================================

import { NextResponse } from "next/server"
import type { DeliveryProvider, DeliveryStatus, Prisma } from "@prisma/client"
import prismaClient from "@/lib/prismaClient"
import { requireAdminSession } from "@/lib/requireAdminSession"
import { geocodeAddress } from "@/lib/naverGeocode"
import {
  mapExternalStatusToDeliveryStatus,
  normalizeExternalStatus,
} from "@/lib/courier/statusMapper"

const EXTERNAL_STATUS_FLOW = [
  "REQUESTED",
  "IN_TRANSIT",
  "ARRIVING",
  "DELIVERED",
] as const

const DEFAULT_STORE_LAT = 37.480783
const DEFAULT_STORE_LNG = 126.89711
const DEFAULT_PROVIDER: DeliveryProvider = "KAKAO"
const TEST_FALLBACK_SHIPPING_ADDRESS_PREFIX = "테스트 배송지 미입력"
const STORE_POINT_EPSILON = 0.000001

type ExternalStatusValue = (typeof EXTERNAL_STATUS_FLOW)[number]
type DestinationSource = "shipping" | "geocoded" | "fallback"

type DestinationPoint = {
  lat: number
  lng: number
  source: DestinationSource
}

const isFiniteNumber = (value: number | null | undefined): value is number =>
  typeof value === "number" && Number.isFinite(value)

function isNearPoint(a: number, b: number): boolean {
  return Math.abs(a - b) <= STORE_POINT_EPSILON
}

function interpolatePoint(
  startLat: number,
  startLng: number,
  endLat: number,
  endLng: number,
  progress: number,
): { lat: number; lng: number } {
  return {
    lat: startLat + (endLat - startLat) * progress,
    lng: startLng + (endLng - startLng) * progress,
  }
}

function getNextExternalStatus(current: string | null | undefined): ExternalStatusValue {
  const normalized = normalizeExternalStatus(current)
  if (!normalized) return EXTERNAL_STATUS_FLOW[0]

  const currentIndex = EXTERNAL_STATUS_FLOW.findIndex((status) => status === normalized)
  if (currentIndex < 0) return EXTERNAL_STATUS_FLOW[0]
  // 배송완료에서 버튼을 다시 눌렀을 때 테스트 사이클을 재시작해 맵 변화 검증을 반복할 수 있게 합니다.
  if (currentIndex >= EXTERNAL_STATUS_FLOW.length - 1) return EXTERNAL_STATUS_FLOW[0]
  return EXTERNAL_STATUS_FLOW[currentIndex + 1]
}

function getStorePoint() {
  const envLat = Number(process.env.NEXT_PUBLIC_STORE_LAT ?? `${DEFAULT_STORE_LAT}`)
  const envLng = Number(process.env.NEXT_PUBLIC_STORE_LNG ?? `${DEFAULT_STORE_LNG}`)
  const lat = Number.isFinite(envLat) ? envLat : DEFAULT_STORE_LAT
  const lng = Number.isFinite(envLng) ? envLng : DEFAULT_STORE_LNG
  return { lat, lng }
}

// 좌표가 비어 있으면 주소 지오코딩을 우선 시도하고, 끝까지 실패하면 임시 목적지를 만들어 시각 변화를 보장합니다.
async function resolveDestinationPoint(params: {
  orderId: number
  shippingLat: number | null
  shippingLng: number | null
  shippingAddress: string | null
  storeLat: number
  storeLng: number
}): Promise<DestinationPoint> {
  const { orderId, shippingLat, shippingLng, shippingAddress, storeLat, storeLng } = params
  const normalizedShippingAddress = shippingAddress?.trim() ?? ""
  const isTestFallbackAddress = normalizedShippingAddress.startsWith(
    TEST_FALLBACK_SHIPPING_ADDRESS_PREFIX,
  )
  const hasShippingPoint = isFiniteNumber(shippingLat) && isFiniteNumber(shippingLng)
  const isStoreLikeShippingPoint =
    hasShippingPoint &&
    isNearPoint(shippingLat, storeLat) &&
    isNearPoint(shippingLng, storeLng)

  // 매장과 같은 좌표는 실제 배송지로 보기 어려워(지오코딩 실패 폴백) 우선 제외합니다.
  if (hasShippingPoint && !isStoreLikeShippingPoint) {
    return { lat: shippingLat, lng: shippingLng, source: "shipping" }
  }

  // 테스트 기본 주소 문구는 지오코딩 의미가 없어 외부 호출을 생략합니다.
  if (normalizedShippingAddress && !isTestFallbackAddress) {
    const geocoded = await geocodeAddress(normalizedShippingAddress)
    if (geocoded) {
      return { lat: geocoded.lat, lng: geocoded.lng, source: "geocoded" }
    }
  }

  // 주문마다 약간 다른 오프셋을 적용해 여러 주문 테스트 시 마커가 완전히 겹치지 않게 합니다.
  const seed = (orderId % 6) + 1
  const latOffset = 0.0025 * seed
  const lngOffset = 0.002 * seed * (orderId % 2 === 0 ? 1 : -1)
  return {
    lat: storeLat + latOffset,
    lng: storeLng + lngOffset,
    source: "fallback",
  }
}

// 상태별로 라이더 위치를 보간해서, 화면에서 "움직이는 것처럼" 확인할 수 있게 합니다.
function getSimulatedRiderPoint(
  externalStatus: ExternalStatusValue,
  storeLat: number,
  storeLng: number,
  destinationLat: number,
  destinationLng: number,
): { lat: number; lng: number } {
  if (externalStatus === "REQUESTED") {
    return { lat: storeLat, lng: storeLng }
  }

  if (externalStatus === "IN_TRANSIT") {
    return interpolatePoint(storeLat, storeLng, destinationLat, destinationLng, 0.45)
  }
  if (externalStatus === "ARRIVING") {
    return interpolatePoint(storeLat, storeLng, destinationLat, destinationLng, 0.85)
  }
  if (externalStatus === "DELIVERED") {
    return { lat: destinationLat, lng: destinationLng }
  }

  return { lat: storeLat, lng: storeLng }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminSession(request)
  if ("error" in auth) return auth.error

  const orderId = Number((await params).id)
  if (!Number.isInteger(orderId)) {
    return NextResponse.json({ error: "유효하지 않은 주문 ID입니다." }, { status: 400 })
  }

  const order = await prismaClient.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      status: true,
      deliveryStatus: true,
      deliveryProvider: true,
      externalDeliveryId: true,
      externalDeliveryStatus: true,
      trackingNumber: true,
      trackingUrl: true,
      shippingAddress: true,
      shippingLat: true,
      shippingLng: true,
      riderLat: true,
      riderLng: true,
      deliveredAt: true,
    },
  })

  if (!order) {
    return NextResponse.json({ error: "주문을 찾을 수 없습니다." }, { status: 404 })
  }
  if (order.status !== "PAID") {
    return NextResponse.json({ error: "결제 완료 주문만 상태를 진행할 수 있습니다." }, { status: 409 })
  }

  const provider = order.deliveryProvider ?? DEFAULT_PROVIDER
  const nextExternalStatus = getNextExternalStatus(order.externalDeliveryStatus)
  const mappedDeliveryStatus = mapExternalStatusToDeliveryStatus(nextExternalStatus)
  const now = new Date()

  const fallbackExternalId =
    order.externalDeliveryId ??
    (order.trackingNumber ? `${provider}:${order.trackingNumber}` : `SIM-${order.id}`)

  const storePoint = getStorePoint()
  const destinationPoint = await resolveDestinationPoint({
    orderId: order.id,
    shippingLat: order.shippingLat,
    shippingLng: order.shippingLng,
    shippingAddress: order.shippingAddress,
    storeLat: storePoint.lat,
    storeLng: storePoint.lng,
  })
  const riderPoint = getSimulatedRiderPoint(
    nextExternalStatus,
    storePoint.lat,
    storePoint.lng,
    destinationPoint.lat,
    destinationPoint.lng,
  )

  // 클릭할 때마다 고유 키를 만들어, 시뮬레이션 이력을 누적 추적할 수 있게 합니다.
  const dedupeKey = `SIMULATED-STATUS-${order.id}-${nextExternalStatus}-${now.getTime()}`

  // Vercel 빌드에서도 tx 파라미터 타입이 any로 추론되지 않게 명시한다.
  const updatedOrder = await prismaClient.$transaction(async (tx: Prisma.TransactionClient) => {
    await tx.deliveryEvent.create({
      data: {
        orderId: order.id,
        provider,
        eventType: "SIMULATED_STATUS_UPDATED",
        payload: {
          source: "admin-manual-simulation",
          externalDeliveryStatus: nextExternalStatus,
          destinationSource: destinationPoint.source,
          simulatedAt: now.toISOString(),
        },
        occurredAt: now,
        dedupeKey,
      },
    })

    const updateData: {
      externalDeliveryId: string
      externalDeliveryStatus: string
      deliveryProvider: DeliveryProvider
      deliveryStatus?: DeliveryStatus | null
      deliveredAt?: Date | null
      riderLat?: number | null
      riderLng?: number | null
      riderUpdatedAt?: Date | null
      shippingLat?: number | null
      shippingLng?: number | null
    } = {
      externalDeliveryId: fallbackExternalId,
      externalDeliveryStatus: nextExternalStatus,
      deliveryProvider: provider,
      riderLat: riderPoint.lat,
      riderLng: riderPoint.lng,
      riderUpdatedAt: now,
    }

    if (mappedDeliveryStatus) {
      updateData.deliveryStatus = mappedDeliveryStatus as DeliveryStatus
      if (mappedDeliveryStatus === "DELIVERED") {
        updateData.deliveredAt = order.deliveredAt ?? now
      }
    }

    // 지오코딩으로 확보한 좌표는 주문 본문에도 저장해 다음 추적 화면에서 재사용합니다.
    if (
      destinationPoint.source === "geocoded" &&
      (!isFiniteNumber(order.shippingLat) || !isFiniteNumber(order.shippingLng))
    ) {
      updateData.shippingLat = destinationPoint.lat
      updateData.shippingLng = destinationPoint.lng
    }

    const nextOrder = await tx.order.update({
      where: { id: order.id },
      data: updateData,
      select: {
        id: true,
        deliveryStatus: true,
        deliveryProvider: true,
        externalDeliveryId: true,
        externalDeliveryStatus: true,
        trackingNumber: true,
        trackingUrl: true,
        riderLat: true,
        riderLng: true,
        riderUpdatedAt: true,
        dispatchedAt: true,
      },
    })

    await tx.riderLocationLog.create({
      data: {
        orderId: order.id,
        lat: riderPoint.lat,
        lng: riderPoint.lng,
        source: `${provider}_SIMULATION`,
      },
    })

    return nextOrder
  })

  const fallbackHint =
    destinationPoint.source === "fallback"
      ? " (배송지 좌표를 찾지 못해 임시 목적지 기준으로 이동했습니다.)"
      : ""

  return NextResponse.json({
    message: `주문 #${order.id} 외부 상태를 ${nextExternalStatus}로 시뮬레이션했습니다.${fallbackHint}`,
    simulatedExternalStatus: nextExternalStatus,
    destinationSource: destinationPoint.source,
    order: updatedOrder,
  })
}
