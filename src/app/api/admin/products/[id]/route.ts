// =============================================================================
// 관리자 상품 상세 API - GET/PUT/DELETE /api/admin/products/[id]
// GET: 상품 상세. PUT: 수정. DELETE: 삭제
// =============================================================================

import { NextResponse } from "next/server"
import { requireAdminSession } from "@/lib/requireAdminSession"
import prismaClient from "@/lib/prismaClient"
import { getCdnUrl } from "@/lib/cdn"

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminSession(request)
  if ("error" in auth) return auth.error
  const productId = (await params).id

  if (productId === "new") {
    return NextResponse.json({
      id: "",
      name: "",
      description: "",
      category: "",
      price: 0,
      stock: 0,
      status: "판매중",
      images: [],
      options: [],
    })
  }

  const id = parseInt(productId, 10)
  if (isNaN(id)) {
    return NextResponse.json({ error: "상품을 찾을 수 없습니다" }, { status: 404 })
  }

  const p = await prismaClient.product.findUnique({
    where: { id },
    include: { images: { orderBy: { id: "asc" } } },
  })
  if (!p) {
    return NextResponse.json({ error: "상품을 찾을 수 없습니다" }, { status: 404 })
  }

  type ProductImage = (typeof p)["images"][number]
  const statusDisplay =
    (p as { status?: string }).status === "DRAFT" ? "임시저장" : p.stock <= 0 ? "품절" : "판매중"
  return NextResponse.json({
    id: String(p.id),
    name: p.name,
    description: p.description ?? "",
    category: p.category ?? "",
    price: p.price,
    stock: p.stock,
    status: statusDisplay,
    images: p.images.map((img: ProductImage) => getCdnUrl(img.original)),
    options: [],
  })
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminSession(request)
  if ("error" in auth) return auth.error
  const productId = (await params).id
  const id = parseInt(productId, 10)
  if (isNaN(id)) {
    return NextResponse.json({ error: "상품을 찾을 수 없습니다" }, { status: 404 })
  }

  try {
    const body = await request.json()
    const updated = await prismaClient.product.update({
      where: { id },
      data: {
        name: body.name,
        description: body.description,
        category: body.category ?? null,
        price: body.price,
        stock: body.stock,
        discountRate: body.discountRate ?? 0,
      },
    })
    return NextResponse.json(updated)
  } catch (error) {
    console.error("상품 업데이트 실패:", error)
    return NextResponse.json({ error: "상품 정보 업데이트 실패" }, { status: 400 })
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminSession(request)
  if ("error" in auth) return auth.error
  const productId = (await params).id
  const id = parseInt(productId, 10)
  if (isNaN(id)) {
    return NextResponse.json({ error: "상품을 찾을 수 없습니다" }, { status: 404 })
  }

  const withOrders = await prismaClient.orderItem.findFirst({ where: { productId: id } })
  if (withOrders) {
    return NextResponse.json(
      { error: "주문에 포함된 상품은 삭제할 수 없습니다." },
      { status: 400 }
    )
  }

  await prismaClient.image.deleteMany({ where: { productId: id } })
  await prismaClient.product.delete({ where: { id } })
  return NextResponse.json({ message: "상품이 성공적으로 삭제되었습니다" })
}

