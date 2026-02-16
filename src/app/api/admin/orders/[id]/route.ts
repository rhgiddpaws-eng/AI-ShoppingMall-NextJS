// =============================================================================
// 관리자 주문 상세 API - /api/admin/orders/[id]
// GET: 주문 상세 조회(택배 필드 포함)
// PUT: 배송 상태/송장/공급자/라이더 좌표 수동 갱신
// =============================================================================

import { NextResponse } from "next/server"
import prismaClient from "@/lib/prismaClient"
import { requireAdminSession } from "@/lib/requireAdminSession"
import { getCdnUrl } from "@/lib/cdn"
import { geocodeAddress } from "@/lib/naverGeocode"
// 배포 환경에서 Prisma enum export 차이로 빌드가 깨지는 일을 막기 위해 로컬 enum 타입을 사용합니다.
import type { DeliveryProvider, DeliveryStatus } from "@/lib/orderEnums"

const DELIVERY_STATUS_VALUES: DeliveryStatus[] = [
  "ORDER_COMPLETE",
  "PREPARING",
  "IN_DELIVERY",
  "ARRIVING",
  "DELIVERED",
]

const DELIVERY_PROVIDER_VALUES: DeliveryProvider[] = [
  "MOCK",
  "KAKAO",
  "BAROGO",
  "VROONG",
  "THINKING",
  "INTERNAL",
]

const isValidLatitude = (value: number) => Number.isFinite(value) && value >= -90 && value <= 90
const isValidLongitude = (value: number) => Number.isFinite(value) && value >= -180 && value <= 180
// Vercel 타입체크에서 map 콜백 파라미터가 any로 떨어지지 않도록 주문 아이템 최소 타입을 고정합니다.
type OrderItemWithProductThumbnail = {
  product: {
    images?: Array<{ thumbnail: string | null }>
    [key: string]: unknown
  }
  [key: string]: unknown
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminSession(request)
  if ("error" in auth) return auth.error

  const id = Number((await params).id)
  if (!Number.isInteger(id)) {
    return NextResponse.json({ error: "유효하지 않은 주문 ID입니다." }, { status: 400 })
  }

  const order = await prismaClient.order.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, email: true, name: true } },
      items: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
              price: true,
              images: { select: { thumbnail: true }, take: 1 },
            },
          },
        },
      },
      payment: true,
    },
  })

  if (!order) {
    return NextResponse.json({ error: "주문을 찾을 수 없습니다." }, { status: 404 })
  }

  const formatted = {
    ...order,
    items: order.items.map((item: OrderItemWithProductThumbnail) => ({
      ...item,
      product: {
        ...item.product,
        imageSrc: getCdnUrl(item.product.images?.[0]?.thumbnail) || "/placeholder.svg",
      },
    })),
  }
  return NextResponse.json(formatted)
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminSession(request)
  if ("error" in auth) return auth.error

  const id = Number((await params).id)
  if (!Number.isInteger(id)) {
    return NextResponse.json({ error: "유효하지 않은 주문 ID입니다." }, { status: 400 })
  }

  try {
    const body = await request.json()
    const {
      deliveryStatus,
      deliveryProvider,
      shippingAddress,
      shippingLat,
      shippingLng,
      riderLat,
      riderLng,
      courierCode,
      trackingNumber,
      trackingUrl,
      externalDeliveryId,
      externalDeliveryStatus,
    } = body as {
      deliveryStatus?: string
      deliveryProvider?: string | null
      shippingAddress?: string
      shippingLat?: number | null
      shippingLng?: number | null
      riderLat?: number | null
      riderLng?: number | null
      courierCode?: string | null
      trackingNumber?: string | null
      trackingUrl?: string | null
      externalDeliveryId?: string | null
      externalDeliveryStatus?: string | null
    }

    const updateData: {
      deliveryStatus?: DeliveryStatus
      deliveryProvider?: DeliveryProvider | null
      shippingAddress?: string
      shippingLat?: number | null
      shippingLng?: number | null
      riderLat?: number | null
      riderLng?: number | null
      riderUpdatedAt?: Date | null
      courierCode?: string | null
      trackingNumber?: string | null
      trackingUrl?: string | null
      externalDeliveryId?: string | null
      externalDeliveryStatus?: string | null
      deliveredAt?: Date | null
    } = {}

    if (deliveryStatus && DELIVERY_STATUS_VALUES.includes(deliveryStatus as DeliveryStatus)) {
      updateData.deliveryStatus = deliveryStatus as DeliveryStatus
      updateData.deliveredAt = deliveryStatus === "DELIVERED" ? new Date() : null
    }

    if (deliveryProvider !== undefined) {
      if (deliveryProvider === null || deliveryProvider === "") {
        updateData.deliveryProvider = null
      } else if (DELIVERY_PROVIDER_VALUES.includes(deliveryProvider as DeliveryProvider)) {
        updateData.deliveryProvider = deliveryProvider as DeliveryProvider
      } else {
        return NextResponse.json({ error: "deliveryProvider 값이 올바르지 않습니다." }, { status: 400 })
      }
    }

    if (shippingAddress !== undefined) {
      const normalizedAddress = shippingAddress.trim()
      updateData.shippingAddress = normalizedAddress
    }

    // 배송지 좌표는 위/경도를 항상 쌍으로 받아 지도 표시 오류를 줄입니다.
    const hasShippingLatInput = shippingLat !== undefined
    const hasShippingLngInput = shippingLng !== undefined
    if (hasShippingLatInput !== hasShippingLngInput) {
      return NextResponse.json({ error: "shippingLat/shippingLng는 함께 전달해야 합니다." }, { status: 400 })
    }
    if (hasShippingLatInput && hasShippingLngInput) {
      if (shippingLat !== null && !isValidLatitude(shippingLat)) {
        return NextResponse.json({ error: "shippingLat는 -90~90 범위의 숫자여야 합니다." }, { status: 400 })
      }
      if (shippingLng !== null && !isValidLongitude(shippingLng)) {
        return NextResponse.json({ error: "shippingLng는 -180~180 범위의 숫자여야 합니다." }, { status: 400 })
      }
      updateData.shippingLat = shippingLat
      updateData.shippingLng = shippingLng
    }

    // 주소만 수정된 경우에는 좌표를 자동 보정해 지도 연동이 끊기지 않게 합니다.
    if (shippingAddress !== undefined && !hasShippingLatInput && !hasShippingLngInput) {
      const normalizedAddress = shippingAddress.trim()
      if (!normalizedAddress) {
        updateData.shippingLat = null
        updateData.shippingLng = null
      } else {
        const geocoded = await geocodeAddress(normalizedAddress)
        if (geocoded) {
          updateData.shippingLat = geocoded.lat
          updateData.shippingLng = geocoded.lng
        }
      }
    }

    // 라이더 좌표도 동일하게 쌍 검증과 범위 검증을 적용합니다.
    const hasRiderLatInput = riderLat !== undefined
    const hasRiderLngInput = riderLng !== undefined
    if (hasRiderLatInput !== hasRiderLngInput) {
      return NextResponse.json({ error: "riderLat/riderLng는 함께 전달해야 합니다." }, { status: 400 })
    }
    if (hasRiderLatInput && hasRiderLngInput) {
      if (riderLat !== null && !isValidLatitude(riderLat)) {
        return NextResponse.json({ error: "riderLat는 -90~90 범위의 숫자여야 합니다." }, { status: 400 })
      }
      if (riderLng !== null && !isValidLongitude(riderLng)) {
        return NextResponse.json({ error: "riderLng는 -180~180 범위의 숫자여야 합니다." }, { status: 400 })
      }
      updateData.riderLat = riderLat
      updateData.riderLng = riderLng
    }

    if (hasRiderLatInput && hasRiderLngInput) {
      const shouldClear = riderLat === null || riderLng === null
      updateData.riderUpdatedAt = shouldClear ? null : new Date()
    }

    if (courierCode !== undefined) updateData.courierCode = courierCode
    if (trackingNumber !== undefined) updateData.trackingNumber = trackingNumber
    if (trackingUrl !== undefined) updateData.trackingUrl = trackingUrl
    if (externalDeliveryId !== undefined) updateData.externalDeliveryId = externalDeliveryId
    if (externalDeliveryStatus !== undefined) updateData.externalDeliveryStatus = externalDeliveryStatus

    const order = await prismaClient.order.update({
      where: { id },
      data: updateData,
      include: {
        user: { select: { id: true, email: true, name: true } },
        items: {
          include: {
            product: { select: { id: true, name: true, price: true, images: { select: { thumbnail: true }, take: 1 } } },
          },
        },
        payment: true,
      },
    })

    const formatted = {
      ...order,
      items: order.items.map((item: OrderItemWithProductThumbnail) => ({
        ...item,
        product: {
          ...item.product,
          imageSrc: getCdnUrl(item.product.images?.[0]?.thumbnail) || "/placeholder.svg",
        },
      })),
    }

    return NextResponse.json(formatted)
  } catch (error) {
    console.error("관리자 주문 업데이트 실패:", error)
    return NextResponse.json({ error: "주문 업데이트에 실패했습니다." }, { status: 400 })
  }
}
