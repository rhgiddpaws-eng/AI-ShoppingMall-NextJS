// =============================================================================
// 관리자 상품 롤백 API - POST /api/admin/products/rollback
// 취소 시 생성된 Product 삭제 및 업로드된 CDN(S3) 객체 삭제
// =============================================================================

import { NextRequest, NextResponse } from "next/server"
import prismaClient from "@/lib/prismaClient"
import { requireAdminSession } from "@/lib/requireAdminSession"
import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3"

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
})

const BUCKET = process.env.AWS_BUCKET_NAME!

export async function POST(request: NextRequest) {
  const auth = await requireAdminSession()
  if ("error" in auth) return auth.error

  try {
    const body = await request.json()
    const productIds: number[] = Array.isArray(body.productIds) ? body.productIds : []
    const cdnKeys: string[] = Array.isArray(body.cdnKeys) ? body.cdnKeys : []

    if (productIds.length === 0 && cdnKeys.length === 0) {
      return NextResponse.json({ ok: true, message: "Nothing to rollback" })
    }

    if (productIds.length > 0) {
      const withOrders = await prismaClient.orderItem.findMany({
        where: { productId: { in: productIds } },
        select: { productId: true },
        distinct: ["productId"],
      })
      if (withOrders.length > 0) {
        return NextResponse.json(
          { error: "주문에 포함된 상품은 롤백할 수 없습니다.", productIds: withOrders.map((o) => o.productId) },
          { status: 400 }
        )
      }

      await prismaClient.image.deleteMany({ where: { productId: { in: productIds } } })
      await prismaClient.product.deleteMany({ where: { id: { in: productIds } } })
    }

    if (cdnKeys.length > 0 && BUCKET) {
      await Promise.all(
        cdnKeys.map((key) =>
          s3Client.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }))
        )
      )
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("Rollback failed:", error)
    return NextResponse.json({ error: "롤백 처리에 실패했습니다." }, { status: 500 })
  }
}
