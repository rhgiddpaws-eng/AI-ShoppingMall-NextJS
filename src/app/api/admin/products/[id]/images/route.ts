import { NextResponse } from "next/server"
import prismaClient from "@/lib/prismaClient"
import { requireAdminSession } from "@/lib/requireAdminSession"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdminSession()
  if (auth.error) return auth.error
  try {
    const productId = (await params).id
    const { original, thumbnail } = await request.json()
    
    // 이미지 정보 저장
    const image = await prismaClient.image.create({
      data: {
        original: original,
        thumbnail: thumbnail,
        productId: parseInt(productId),
      },
    })
    
    return NextResponse.json(image, { status: 201 })
  } catch (error) {
    console.error("이미지 저장 실패:", error)
    return NextResponse.json(
      { error: "이미지 저장에 실패했습니다" },
      { status: 500 }
    )
  }
} 