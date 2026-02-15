// =============================================================================
// 배송 웹훅 수신 API - /api/webhooks/delivery/[provider]
// 공급자 웹훅을 표준 이벤트로 바꿔 저장하고 주문 상태를 동기화합니다.
// =============================================================================

import { NextResponse } from "next/server"
import prismaClient from "@/lib/prismaClient"
import { getDeliveryProviderByName } from "@/lib/courier/providerRegistry"
import type { DeliveryProviderName } from "@/lib/courier/providerAdapter"
import { mapExternalStatusToDeliveryStatus } from "@/lib/courier/statusMapper"
import type { PrismaTransactionClient } from "@/lib/prismaTransactionClient"

// Prisma 네임스페이스 import 없이도 JSON payload 타입을 안전하게 맞추기 위한 추출 타입입니다.
type DeliveryEventCreateArgs = Parameters<typeof prismaClient.deliveryEvent.create>[0]
type DeliveryEventPayload = DeliveryEventCreateArgs["data"]["payload"]

function isUniqueDedupeError(error: unknown): boolean {
  // Prisma 오류 클래스 import 없이 code 값만 확인해 중복 웹훅(P2002)을 안전하게 처리합니다.
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "P2002"
  )
}

function parseProviderName(value: string): DeliveryProviderName | null {
  const normalized = value.trim().toUpperCase()
  if (normalized === "MOCK") return "MOCK"
  if (normalized === "KAKAO") return "KAKAO"
  if (normalized === "BAROGO") return "BAROGO"
  if (normalized === "VROONG") return "VROONG"
  if (normalized === "THINKING") return "THINKING"
  if (normalized === "INTERNAL") return "INTERNAL"
  return null
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ provider: string }> },
) {
  const provider = parseProviderName((await params).provider)
  if (!provider) {
    return NextResponse.json({ error: "지원하지 않는 provider 입니다." }, { status: 400 })
  }

  const adapter = getDeliveryProviderByName(provider)
  const rawBody = await request.text()
  let payload: unknown = null
  try {
    payload = rawBody.length > 0 ? JSON.parse(rawBody) : {}
  } catch {
    return NextResponse.json({ error: "JSON 본문 파싱에 실패했습니다." }, { status: 400 })
  }

  const verifyInput = { rawBody, headers: request.headers }
  const isVerified = await adapter.verifyWebhook(verifyInput)
  if (!isVerified) {
    return NextResponse.json({ error: "웹훅 서명 검증에 실패했습니다." }, { status: 401 })
  }

  const event = adapter.normalizeWebhook(payload, verifyInput)
  if (!event) {
    return NextResponse.json({ error: "웹훅 포맷이 올바르지 않습니다." }, { status: 400 })
  }

  let order = null as { id: number } | null
  if (event.orderId != null) {
    order = await prismaClient.order.findUnique({
      where: { id: event.orderId },
      select: { id: true },
    })
  }
  if (!order && event.externalDeliveryId) {
    order = await prismaClient.order.findFirst({
      where: { externalDeliveryId: event.externalDeliveryId },
      select: { id: true },
    })
  }
  if (!order && event.trackingNumber) {
    order = await prismaClient.order.findFirst({
      where: { trackingNumber: event.trackingNumber },
      select: { id: true },
    })
  }

  if (!order) {
    // 공급자 이벤트가 먼저 와도 서버가 죽지 않도록 202로 안전 종료합니다.
    return NextResponse.json({ ok: true, accepted: true, reason: "order_not_found" }, { status: 202 })
  }

  try {
    // Vercel 빌드에서도 tx 파라미터가 implicit any로 처리되지 않도록 타입을 고정한다.
    // Prisma 네임스페이스 import 없이도 tx 타입을 고정해 빌드 환경 차이를 줄입니다.
    await prismaClient.$transaction(async (tx: PrismaTransactionClient) => {
      await tx.deliveryEvent.create({
        data: {
          orderId: order.id,
          provider: event.provider,
          eventType: event.eventType,
          payload: (event.rawPayload ?? {}) as DeliveryEventPayload,
          occurredAt: event.occurredAt ?? new Date(),
          dedupeKey: event.dedupeKey,
        },
      })

      const mappedDeliveryStatus = mapExternalStatusToDeliveryStatus(event.externalDeliveryStatus)

      const updateData: {
        externalDeliveryStatus?: string
        externalDeliveryId?: string
        trackingNumber?: string
        trackingUrl?: string
        deliveryStatus?: "ORDER_COMPLETE" | "PREPARING" | "IN_DELIVERY" | "ARRIVING" | "DELIVERED"
        deliveredAt?: Date | null
        riderLat?: number
        riderLng?: number
        riderUpdatedAt?: Date
      } = {}

      if (event.externalDeliveryStatus) updateData.externalDeliveryStatus = event.externalDeliveryStatus
      if (event.externalDeliveryId) updateData.externalDeliveryId = event.externalDeliveryId
      if (event.trackingNumber) updateData.trackingNumber = event.trackingNumber
      if (event.trackingUrl) updateData.trackingUrl = event.trackingUrl
      if (mappedDeliveryStatus) {
        updateData.deliveryStatus = mappedDeliveryStatus
        if (mappedDeliveryStatus === "DELIVERED") {
          updateData.deliveredAt = new Date()
        }
      }
      if (typeof event.lat === "number" && typeof event.lng === "number") {
        updateData.riderLat = event.lat
        updateData.riderLng = event.lng
        updateData.riderUpdatedAt = new Date()
      }

      await tx.order.update({
        where: { id: order.id },
        data: updateData,
      })

      if (typeof event.lat === "number" && typeof event.lng === "number") {
        await tx.riderLocationLog.create({
          data: {
            orderId: order.id,
            lat: event.lat,
            lng: event.lng,
            source: event.provider,
          },
        })
      }
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    // dedupeKey가 이미 있으면 중복 웹훅으로 판단하고 성공 처리합니다.
    if (isUniqueDedupeError(error)) {
      return NextResponse.json({ ok: true, duplicated: true })
    }
    console.error("배송 웹훅 처리 실패:", error)
    return NextResponse.json({ error: "배송 웹훅 처리 실패" }, { status: 500 })
  }
}
