import { NextResponse } from "next/server"

// 상품 모킹 데이터
const products = [
  {
    id: "PRD-001",
    name: "프리미엄 코튼 티셔츠",
    category: "의류",
    price: 39000,
    stock: 45,
    status: "판매중",
  },
  {
    id: "PRD-002",
    name: "슬림핏 데님 청바지",
    category: "의류",
    price: 79000,
    stock: 32,
    status: "판매중",
  },
  {
    id: "PRD-003",
    name: "캐주얼 후드 집업",
    category: "의류",
    price: 89000,
    stock: 18,
    status: "판매중",
  },
  {
    id: "PRD-004",
    name: "클래식 가죽 스니커즈",
    category: "신발",
    price: 129000,
    stock: 7,
    status: "판매중",
  },
  {
    id: "PRD-005",
    name: "미니멀 크로스백",
    category: "액세서리",
    price: 59000,
    stock: 12,
    status: "판매중",
  },
  {
    id: "PRD-006",
    name: "오버사이즈 니트 스웨터",
    category: "의류",
    price: 69000,
    stock: 0,
    status: "품절",
  },
  {
    id: "PRD-007",
    name: "빈티지 데님 자켓",
    category: "의류",
    price: 119000,
    stock: 5,
    status: "판매중",
  },
]

export async function GET(request: Request) {
  // URL에서 검색어와 카테고리 파라미터 추출
  const { searchParams } = new URL(request.url)
  const search = searchParams.get("search")?.toLowerCase()
  const category = searchParams.get("category")

  // 검색어와 카테고리로 필터링
  let filteredProducts = products

  if (search) {
    filteredProducts = filteredProducts.filter(
      (product) => product.name.toLowerCase().includes(search) || product.id.toLowerCase().includes(search),
    )
  }

  if (category && category !== "all") {
    filteredProducts = filteredProducts.filter((product) => product.category === category)
  }

  return NextResponse.json(filteredProducts)
}

export async function POST(request: Request) {
  try {
    const newProduct = await request.json()

    // 실제 구현에서는 데이터베이스에 저장하는 로직이 들어갑니다
    // 여기서는 간단히 ID만 생성해서 반환합니다
    const productId = `PRD-${Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, "0")}`

    return NextResponse.json(
      {
        ...newProduct,
        id: productId,
      },
      { status: 201 },
    )
  } catch (error) {
    return NextResponse.json({ error: "상품 생성 실패" }, { status: 400 })
  }
}

