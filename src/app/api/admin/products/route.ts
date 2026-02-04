import { NextResponse } from "next/server"
import prismaClient from "@/lib/prismaClient"
import OpenAI from "openai"
import pool from "@/lib/pgClient"
import pgvector from "pgvector"

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

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

// 상품 임베딩 생성
async function generateEmbedding(text: string) {
  try {
    const embedding = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: text,
      encoding_format: "float",
    })
    return embedding.data[0].embedding
  } catch (error) {
    console.error("임베딩 생성 중 오류 발생:", error)
    return null
  }
}

// 벡터 업데이트 함수
async function updateProductVector(productId: number, embeddings: number[]) {
  try {
    // 1. 먼저 해당 Product가 존재하는지 확인
    const checkQuery = `
      SELECT id FROM "Product" WHERE id = $1;
    `;
    const checkResult = await pool.query(checkQuery, [productId]);
    console.log("Product 존재 여부:", checkResult.rows[0]);

    if (checkResult.rows.length === 0) {
      console.error("해당 ID의 Product가 존재하지 않음:", productId);
      return false;
    }

    const postEmbedding = pgvector.toSql(embeddings);
    
    // 2. UPDATE 쿼리 수정 및 더 자세한 로깅
    const queryText = `
      UPDATE "Product"
      SET "vector" = $1::vector,
          "updatedAt" = NOW()  -- updatedAt도 함께 업데이트하여 변경 확인
      WHERE id = $2
      RETURNING id, "updatedAt", 
                (SELECT EXISTS (
                  SELECT 1 
                  FROM "Product" 
                  WHERE id = $2 AND vector IS NOT NULL
                )) as vector_updated;
    `;

    const values = [postEmbedding, productId];
    
    console.log("실행할 쿼리:", queryText);
    console.log("쿼리 파라미터:", values);
    
    const result = await pool.query(queryText, values);
    
    console.log("UPDATE 쿼리 결과:", result);
    console.log("영향받은 행 수:", result.rowCount);
    console.log("반환된 데이터:", result.rows[0]);

    // 3. 업데이트 후 벡터 데이터 확인
    const verifyQuery = `
      SELECT id, "updatedAt", 
             (vector IS NOT NULL) as has_vector,
             vector::text as vector_preview
      FROM "Product"
      WHERE id = $1;
    `;
    const verifyResult = await pool.query(verifyQuery, [productId]);
    console.log("업데이트 검증:", verifyResult.rows[0]);

    return (result?.rowCount ?? 0) > 0;
  } catch (error) {
    console.error("벡터 업데이트 중 상세 오류:", error);
    
    // 4. 데이터베이스 연결 상태 및 pgvector 확장 확인
    try {
      const diagnostics = await pool.query(`
        SELECT version() as pg_version,
               EXISTS (
                 SELECT 1 
                 FROM pg_extension 
                 WHERE extname = 'vector'
               ) as has_vector_extension;
      `);
      console.log("DB 진단 정보:", diagnostics.rows[0]);
    } catch (dbError) {
      console.error("DB 진단 실패:", dbError);
    }
    
    return false;
  }
}

// 응답 타입 정의
export interface CreateProductResponse {
  id: number
  name: string
  description: string
  price: number
  stock: number
  discountRate: number
  category: string
  createdAt: string
  updatedAt: string
}

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
    const productData = await request.json()
    
    // 임베딩 먼저 생성 (트랜잭션 외부)
    let embeddings = null
    if (productData.description) {
      embeddings = await generateEmbedding(productData.description)
    }
    
    // 트랜잭션 시작
    const result = await prismaClient.$transaction(async (tx) => {
      // 1. 상품 기본 정보 저장
      const product = await tx.product.create({
        data: {
          name: productData.name,
          description: productData.description,
          price: productData.price,
          stock: productData.stock,
          discountRate: productData.discountRate || 0,
          category: productData.category || null,
        },
      })
      
      // 2. 벡터 업데이트를 트랜잭션 내에서 raw query로 실행
      if (embeddings) {
        const postEmbedding = pgvector.toSql(embeddings)
        await tx.$executeRaw`
          UPDATE "Product"
          SET "vector" = ${postEmbedding}::vector
          WHERE "id" = ${product.id}
        `
      }
      
      // 3. 업데이트된 상품 정보 반환
      return await tx.product.findUnique({
        where: { id: product.id },
      })
    })
    
    // 응답 반환
    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    console.error("상품 생성 실패:", error)
    return NextResponse.json({ error: "상품 생성에 실패했습니다" }, { status: 500 })
  }
}

