// =============================================================================
// 관리자 전체 상품 삭제 API - POST /api/admin/products/wipe
// DB의 모든 상품·이미지 삭제 및 S3 객체 삭제. 주문에 포함된 상품이 있으면 실패.
// =============================================================================

import { NextResponse } from "next/server"
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

export async function POST() {
  const auth = await requireAdminSession()
  if ("error" in auth) return auth.error

  try {
    const productIds = await prismaClient.product.findMany({
      select: { id: true },
    }).then((rows) => rows.map((r) => r.id))

    if (productIds.length === 0) {
      return NextResponse.json({ ok: true, deleted: 0, message: "삭제할 상품이 없습니다." })
    }

    const withOrders = await prismaClient.orderItem.findMany({
      where: { productId: { in: productIds } },
      select: { productId: true },
      distinct: ["productId"],
    })
    if (withOrders.length > 0) {
      return NextResponse.json(
        {
          error: "주문에 포함된 상품이 있어 전체 삭제할 수 없습니다. 주문이 없는 상태에서만 가능합니다.",
          productIds: withOrders.map((o) => o.productId),
        },
        { status: 400 }
      )
    }

    const images = await prismaClient.image.findMany({
      where: { productId: { in: productIds } },
      select: { original: true, thumbnail: true },
    })
    const cdnKeys: string[] = []
    for (const img of images) {
      cdnKeys.push(img.original)
      if (img.thumbnail && img.thumbnail !== img.original) cdnKeys.push(img.thumbnail)
    }

    if (BUCKET && cdnKeys.length > 0) {
      await Promise.all(
        cdnKeys.map((key) =>
          s3Client.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }))
        )
      )
    }

    await prismaClient.image.deleteMany({ where: { productId: { in: productIds } } })
    const deleted = await prismaClient.product.deleteMany({})

    return NextResponse.json({
      ok: true,
      deleted: deleted.count,
      message: `${deleted.count}개 상품이 삭제되었습니다.`,
    })
  } catch (error) {
    console.error("Wipe products failed:", error)
    return NextResponse.json(
      { error: "전체 상품 삭제에 실패했습니다." },
      { status: 500 }
    )
  }
}
