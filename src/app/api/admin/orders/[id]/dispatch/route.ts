// =============================================================================
// 관리자 배차 시작 API - /api/admin/orders/[id]/dispatch
// 외부 배송 연동(SweetTracker 포함) 호출 전 주문/주소/송장 정보를 검증하고 상태를 저장합니다.
// =============================================================================

import { NextResponse } from "next/server"
import prismaClient from "@/lib/prismaClient"
import { requireAdminSession } from "@/lib/requireAdminSession"
import { getDispatchProvider } from "@/lib/courier/providerRegistry"
import { geocodeAddress } from "@/lib/naverGeocode"
import { normalizeExternalStatus } from "@/lib/courier/statusMapper"
import type { Prisma } from "@prisma/client"

type DispatchPayload = {
  courierCode?: string | null
  trackingNumber?: string | null
}

type DispatchOrderItemSummary = {
  product: { name: string }
}

const DEFAULT_STORE_LAT = 37.480783
const DEFAULT_STORE_LNG = 126.89711
const TEST_FALLBACK_SHIPPING_ADDRESS = "테스트 배송지 미입력 - 실제 배송 전에는 주소를 꼭 입력해 주세요."

function shouldResetDeliveryCycle(params: {
  deliveryStatus: string | null
  externalDeliveryStatus: string | null
  deliveredAt: Date | null
}): boolean {
  const { deliveryStatus, externalDeliveryStatus, deliveredAt } = params
  // 배송완료 주문을 다시 배차하면 새 배송 사이클이 시작되도록 상태를 초기화합니다.
  if (deliveryStatus === "DELIVERED") return true
  if (normalizeExternalStatus(externalDeliveryStatus) === "DELIVERED") return true
  return deliveredAt != null
}

function resolveStorePoint() {
  // 환경변수가 비어 있거나 숫자가 아니어도 항상 유효한 기본 좌표를 보장합니다.
  const envLat = Number(process.env.NEXT_PUBLIC_STORE_LAT ?? `${DEFAULT_STORE_LAT}`)
  const envLng = Number(process.env.NEXT_PUBLIC_STORE_LNG ?? `${DEFAULT_STORE_LNG}`)
  return {
    lat: Number.isFinite(envLat) ? envLat : DEFAULT_STORE_LAT,
    lng: Number.isFinite(envLng) ? envLng : DEFAULT_STORE_LNG,
  }
}

function normalizeOptionalString(value: unknown): string | null | undefined {
  if (value === undefined) return undefined
  if (value === null) return null
  if (typeof value !== "string") return undefined
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

async function parseDispatchPayload(request: Request): Promise<DispatchPayload> {
  // 빈 body 요청도 허용해야 하므로 text 기반으로 먼저 안전하게 파싱합니다.
  const rawBody = await request.text()
  if (rawBody.trim().length === 0) return {}

  let parsed: unknown
  try {
    parsed = JSON.parse(rawBody)
  } catch {
    throw new Error("배차 요청 본문 JSON 형식이 올바르지 않습니다.")
  }

  if (!parsed || typeof parsed !== "object") {
    throw new Error("배차 요청 본문 JSON 형식이 올바르지 않습니다.")
  }

  const record = parsed as Record<string, unknown>
  return {
    courierCode: normalizeOptionalString(record.courierCode),
    trackingNumber: normalizeOptionalString(record.trackingNumber),
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminSession(request)
  if ("error" in auth) return auth.error

  let payload: DispatchPayload = {}
  try {
    payload = await parseDispatchPayload(request)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "배차 요청 본문을 확인해 주세요." },
      { status: 400 },
    )
  }

  const orderId = Number((await params).id)
  if (!Number.isInteger(orderId)) {
    return NextResponse.json({ error: "유효하지 않은 주문 ID입니다." }, { status: 400 })
  }

  const order = await prismaClient.order.findUnique({
    where: { id: orderId },
    include: {
      items: { include: { product: { select: { name: true } } } },
      user: { select: { name: true } },
    },
  })

  if (!order) {
    return NextResponse.json({ error: "주문을 찾을 수 없습니다." }, { status: 404 })
  }
  if (order.status !== "PAID") {
    return NextResponse.json({ error: "결제 완료 주문만 배차할 수 있습니다." }, { status: 409 })
  }

  try {
    const storePoint = resolveStorePoint()
    const normalizedShippingAddress = order.shippingAddress?.trim() || null
    const shouldApplyFallbackAddress = !normalizedShippingAddress
    const resolvedShippingAddress = normalizedShippingAddress ?? TEST_FALLBACK_SHIPPING_ADDRESS

    // 좌표가 비어 있으면 주소 지오코딩으로 보강해 지도/추적 화면이 깨지지 않게 만듭니다.
    let resolvedShippingLat = order.shippingLat
    let resolvedShippingLng = order.shippingLng
    if ((resolvedShippingLat == null || resolvedShippingLng == null) && normalizedShippingAddress) {
      const geocoded = await geocodeAddress(normalizedShippingAddress)
      if (geocoded) {
        resolvedShippingLat = geocoded.lat
        resolvedShippingLng = geocoded.lng
      }
    }
    if (resolvedShippingLat == null || resolvedShippingLng == null) {
      // 주소/지오코딩이 모두 실패해도 배차 흐름이 끊기지 않도록 매장 좌표로 폴백합니다.
      resolvedShippingLat = storePoint.lat
      resolvedShippingLng = storePoint.lng
    }

    const resolvedCourierCode = payload.courierCode ?? order.courierCode ?? null
    const resolvedTrackingNumber = payload.trackingNumber ?? order.trackingNumber ?? null

    const provider = getDispatchProvider()
    // KAKAO 슬롯은 현재 SweetTracker 조회형 연동이므로 택배사 코드/송장번호가 필수입니다.
    if (
      provider.providerName === "KAKAO" &&
      (!resolvedCourierCode || !resolvedTrackingNumber)
    ) {
      return NextResponse.json(
        { error: "택배사 코드(courierCode)와 송장번호(trackingNumber)를 입력한 뒤 배차해 주세요." },
        { status: 409 },
      )
    }

    const dispatchResult = await provider.createDelivery({
      orderId: order.id,
      orderStatus: order.status,
      deliveryStatus: order.deliveryStatus,
      shippingAddress: resolvedShippingAddress,
      shippingLat: resolvedShippingLat,
      shippingLng: resolvedShippingLng,
      courierCode: resolvedCourierCode,
      trackingNumber: resolvedTrackingNumber,
      receiverName: order.user.name,
      totalAmount: order.totalAmount,
      // Vercel 빌드 환경에서도 item 콜백 파라미터가 any로 떨어지지 않게 타입을 명시한다.
      itemSummary: order.items.map((item: DispatchOrderItemSummary) => item.product.name),
    })

    const isRedispatchFromDelivered = shouldResetDeliveryCycle({
      deliveryStatus: order.deliveryStatus,
      externalDeliveryStatus: order.externalDeliveryStatus,
      deliveredAt: order.deliveredAt,
    })
    // 재배차에서는 배송완료 고정 현상을 막기 위해 외부 상태도 REQUESTED로 되돌립니다.
    const resolvedExternalStatus = isRedispatchFromDelivered
      ? "REQUESTED"
      : dispatchResult.externalDeliveryStatus

    const dedupeKey = `DISPATCH-${dispatchResult.provider}-${dispatchResult.externalDeliveryId}`

    // Vercel 빌드에서 추론이 흔들려도 tx가 any가 되지 않도록 트랜잭션 타입을 명시한다.
    const updatedOrder = await prismaClient.$transaction(async (tx: Prisma.TransactionClient) => {
      // 같은 주문에 대해 배차 버튼을 다시 눌러도 실패하지 않도록 dedupeKey 기준으로 업서트합니다.
      await tx.deliveryEvent.upsert({
        where: { dedupeKey },
        update: {
          // 최신 응답을 반영해 이후 추적/디버깅 시 최신 상태를 확인할 수 있게 유지합니다.
          payload: (dispatchResult.rawPayload ?? {}) as object,
          occurredAt: dispatchResult.occurredAt ?? new Date(),
        },
        create: {
          orderId: order.id,
          provider: dispatchResult.provider,
          eventType: "DISPATCH_CREATED",
          payload: (dispatchResult.rawPayload ?? {}) as object,
          occurredAt: dispatchResult.occurredAt ?? new Date(),
          dedupeKey,
        },
      })

      return tx.order.update({
        where: { id: order.id },
        data: {
          deliveryProvider: dispatchResult.provider,
          externalDeliveryId: dispatchResult.externalDeliveryId,
          externalDeliveryStatus: resolvedExternalStatus,
          // 주소가 비어 있던 주문은 테스트 기본 문구를 저장해 이후 화면에서 빈칸이 보이지 않게 합니다.
          shippingAddress: resolvedShippingAddress,
          courierCode: resolvedCourierCode ?? order.courierCode,
          trackingNumber:
            dispatchResult.trackingNumber ?? resolvedTrackingNumber ?? order.trackingNumber,
          trackingUrl: dispatchResult.trackingUrl ?? order.trackingUrl,
          shippingLat: resolvedShippingLat,
          shippingLng: resolvedShippingLng,
          dispatchedAt: new Date(),
          // 배차 시점에는 배송 단계를 항상 PREPARING으로 맞춰 재배차 후에도 흐름을 다시 시작할 수 있게 합니다.
          deliveryStatus: "PREPARING",
          // 재배차 시작점은 매장 위치로 리셋해 지도에서 배송 시작 위치가 명확히 보이게 합니다.
          riderLat: storePoint.lat,
          riderLng: storePoint.lng,
          riderUpdatedAt: new Date(),
          // 재배차가 시작되면 기존 배송완료 시각은 지워 새 완료 시각만 기록되게 합니다.
          deliveredAt: null,
        },
        select: {
          id: true,
          deliveryStatus: true,
          deliveryProvider: true,
          externalDeliveryId: true,
          externalDeliveryStatus: true,
          courierCode: true,
          trackingNumber: true,
          trackingUrl: true,
          dispatchedAt: true,
        },
      })
    })

    return NextResponse.json({
      message: (() => {
        const base = `주문 #${order.id} 배차 요청을 전송했습니다.`
        const fallbackMessage = shouldApplyFallbackAddress
          ? " 배송 주소 글자가 없어 테스트 기본 문구를 자동 입력했습니다."
          : ""
        const redispatchMessage = isRedispatchFromDelivered
          ? " 기존 배송완료 상태를 배송준비로 초기화했습니다."
          : ""
        return `${base}${fallbackMessage}${redispatchMessage}`
      })(),
      order: updatedOrder,
    })
  } catch (error) {
    console.error("배차 요청 실패:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "배차 요청에 실패했습니다." },
      { status: 502 },
    )
  }
}
