import { NextResponse } from "next/server"

// 상품 상세 모킹 데이터
interface ProductData {
  id: string;
  name: string;
  description: string;
  category: string;
  price: number;
  stock: number;
  status: string;
  images: string[];
  options: string[];
}

const productsData: { [key: string]: ProductData } = {
  "PRD-001": {
    id: "PRD-001",
    name: "프리미엄 코튼 티셔츠",
    description: "고급 코튼 소재로 제작된 편안한 티셔츠입니다. 다양한 색상과 사이즈로 제공됩니다.",
    category: "의류",
    price: 39000,
    stock: 45,
    status: "판매중",
    images: ["/placeholder.svg?height=400&width=300"],
    options: ["S", "M", "L", "XL"],
  },
  "PRD-002": {
    id: "PRD-002",
    name: "슬림핏 데님 청바지",
    description: "편안한 착용감과 세련된 디자인의 슬림핏 데님 청바지입니다.",
    category: "의류",
    price: 79000,
    stock: 32,
    status: "판매중",
    images: ["/placeholder.svg?height=400&width=300"],
    options: ["28", "30", "32", "34"],
  },
  "PRD-003": {
    id: "PRD-003",
    name: "캐주얼 후드 집업",
    description: "일상에서 편하게 입을 수 있는 캐주얼한 후드 집업입니다.",
    category: "의류",
    price: 89000,
    stock: 18,
    status: "판매중",
    images: ["/placeholder.svg?height=400&width=300"],
    options: ["M", "L", "XL"],
  },
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const productId = (await params).id

  // 새 상품 등록 페이지인 경우 빈 템플릿 반환
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

  // 해당 ID의 상품이 있는지 확인
  if (!productsData[productId]) {
    return NextResponse.json({ error: "상품을 찾을 수 없습니다" }, { status: 404 })
  }

  return NextResponse.json(productsData[productId])
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const productId = (await params).id

  // 해당 ID의 상품이 있는지 확인
  if (!productsData[productId]) {
    return NextResponse.json({ error: "상품을 찾을 수 없습니다" }, { status: 404 })
  }

  try {
    const updatedProduct = await request.json()

    // 실제 구현에서는 데이터베이스에 업데이트하는 로직이 들어갑니다
    // 여기서는 간단히 성공 응답만 반환합니다

    return NextResponse.json({
      ...productsData[productId],
      ...updatedProduct,
      id: productId, // ID는 변경 불가
    })
  } catch (error) {
    return NextResponse.json({ error: "상품 정보 업데이트 실패" }, { status: 400 })
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const productId = (await params).id

  // 해당 ID의 상품이 있는지 확인
  if (!productsData[productId]) {
    return NextResponse.json({ error: "상품을 찾을 수 없습니다" }, { status: 404 })
  }

  // 실제 구현에서는 데이터베이스에서 삭제하는 로직이 들어갑니다
  // 여기서는 간단히 성공 응답만 반환합니다

  return NextResponse.json({ message: "상품이 성공적으로 삭제되었습니다" })
}

