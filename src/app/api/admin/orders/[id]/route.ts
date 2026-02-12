// =============================================================================
// 관리자 주문 상세 API - GET/PUT /api/admin/orders/[id]
// GET: 주문 상세(Prisma). PUT: deliveryStatus, shippingAddress 등 업데이트
// =============================================================================

import { NextResponse } from "next/server"
import { requireAdminSession } from "@/lib/requireAdminSession"
import prismaClient from "@/lib/prismaClient"
import { getCdnUrl } from "@/lib/cdn"
import type { DeliveryStatus } from "@prisma/client"

const DELIVERY_STATUS_VALUES: DeliveryStatus[] = [
  "ORDER_COMPLETE",
  "PREPARING",
  "IN_DELIVERY",
  "ARRIVING",
  "DELIVERED",
]

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdminSession(request)
  if ("error" in auth) return auth.error
  const id = Number((await params).id)
  if (!Number.isInteger(id)) {
    return NextResponse.json({ error: "유효하지 않은 주문 ID" }, { status: 400 })
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
    return NextResponse.json({ error: "주문을 찾을 수 없습니다" }, { status: 404 })
  }

  type OrderItemWithProduct = (typeof order)["items"][number]
  const formatted = {
    ...order,
    items: order.items.map((item: OrderItemWithProduct) => ({
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
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdminSession(request)
  if ("error" in auth) return auth.error
  const id = Number((await params).id)
  if (!Number.isInteger(id)) {
    return NextResponse.json({ error: "유효하지 않은 주문 ID" }, { status: 400 })
  }

  try {
    const body = await request.json()
    const { deliveryStatus, shippingAddress, shippingLat, shippingLng } = body as {
      deliveryStatus?: string
      shippingAddress?: string
      shippingLat?: number
      shippingLng?: number
    }

    const updateData: {
      deliveryStatus?: DeliveryStatus
      shippingAddress?: string
      shippingLat?: number
      shippingLng?: number
    } = {}
    if (deliveryStatus && DELIVERY_STATUS_VALUES.includes(deliveryStatus as DeliveryStatus)) {
      updateData.deliveryStatus = deliveryStatus as DeliveryStatus
    }
    if (shippingAddress !== undefined) updateData.shippingAddress = shippingAddress
    if (shippingLat !== undefined) updateData.shippingLat = shippingLat
    if (shippingLng !== undefined) updateData.shippingLng = shippingLng

    const order = await prismaClient.order.update({
      where: { id },
      data: updateData,
      include: {
        user: { select: { id: true, email: true, name: true } },
        items: { include: { product: { select: { id: true, name: true, price: true } } } },
        payment: true,
      },
    })
    return NextResponse.json(order)
  } catch (error) {
    console.error("주문 상태 업데이트 실패:", error)
    return NextResponse.json({ error: "주문 상태 업데이트 실패" }, { status: 400 })
  }
}

