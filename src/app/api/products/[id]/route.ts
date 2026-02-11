// =============================================================================
// 상품 상세 API - GET /api/products/[id]
// 상품 ID로 단일 상품 조회(이미지 포함), 없으면 404
// =============================================================================

import { type NextRequest, NextResponse } from "next/server"
import prismaClient from "@/lib/prismaClient"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  
  try {
    const { id: idString } = await params
    const id = parseInt(idString)

    if (isNaN(id)) {
      return NextResponse.json({ error: "유효하지 않은 상품 ID입니다" }, { status: 400 })
    }

    const product = await prismaClient.product.findFirst({
      where: { id, status: "PUBLISHED" },
      include: {
        images: true,
      }
    })

    if (!product) {
      return NextResponse.json({ error: "상품을 찾을 수 없습니다" }, { status: 404 })
    }

    return NextResponse.json(product)
  } catch (error) {
    console.error("상품 조회 중 오류 발생:", error)
    return NextResponse.json({ error: "상품 조회 중 오류가 발생했습니다" }, { status: 500 })
  }
}

