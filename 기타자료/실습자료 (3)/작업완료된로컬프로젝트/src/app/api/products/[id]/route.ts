import { type NextRequest, NextResponse } from "next/server"

interface MockProduct {
  id: number
  title: string
  body: string
}

interface Product {
  id: string
  name: string
  price: number
  description: string
  imageSrc: string
  category: string
  rating: number
  reviews: number
  inStock: boolean
}

const CATEGORIES = ["men", "women", "accessories", "shoes"]

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const parsedId = (await params).id
  console.log("API Route - Product ID:", parsedId) // Add this log

  try {
    const id = Number.parseInt(parsedId)
    if (isNaN(id) || id < 1 || id > 100) {
      console.log("API Route - Invalid ID") // Add this log
      return NextResponse.json({ error: "Product not found" }, { status: 404 })
    }

    const response = await fetch(`https://jsonplaceholder.typicode.com/posts/${id}`)
    if (!response.ok) {
      console.log("API Route - JSONPlaceholder response not OK") // Add this log
      return NextResponse.json({ error: "Product not found" }, { status: 404 })
    }

    const mockProduct: MockProduct = await response.json()

    const product: Product = {
      id: mockProduct.id.toString(),
      name: mockProduct.title.slice(0, 30),
      price: Math.floor(Math.random() * 100000) + 10000,
      description: mockProduct.body,
      imageSrc: `/placeholder.svg?text=Product${mockProduct.id}`,
      category: CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)],
      rating: Math.random() * 2 + 3,
      reviews: Math.floor(Math.random() * 500),
      inStock: Math.random() > 0.2,
    }

    console.log("API Route - Returning product:", product.id) // Add this log
    return NextResponse.json(product)
  } catch (error) {
    console.error("API Route - Failed to fetch product:", error)
    return NextResponse.json({ error: "Failed to fetch product" }, { status: 500 })
  }
}

