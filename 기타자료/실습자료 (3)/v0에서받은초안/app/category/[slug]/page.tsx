"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

import { Button } from "@/components/ui/button"
import ProductCard from "@/components/product-card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface Product {
  id: string
  name: string
  price: number
  imageSrc: string
  category: string
}

export default function CategoryPage() {
  const params = useParams()
  const category = params.slug as string
  const [products, setProducts] = useState<Product[]>([])
  const [sortBy, setSortBy] = useState("name")
  const [searchTerm, setSearchTerm] = useState("")
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchProducts = async () => {
      setIsLoading(true)
      try {
        const response = await fetch("/api/products")
        const allProducts = await response.json()
        const filteredProducts =
          category === "all" ? allProducts : allProducts.filter((product: Product) => product.category === category)
        setProducts(filteredProducts)
      } catch (error) {
        console.error("Failed to fetch products:", error)
      }
      setIsLoading(false)
    }

    fetchProducts()
  }, [category])

  const sortedAndFilteredProducts = products
    .filter((product) => product.name.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === "name") {
        return a.name.localeCompare(b.name)
      } else if (sortBy === "priceLow") {
        return a.price - b.price
      } else {
        return b.price - a.price
      }
    })

  if (isLoading) {
    return <div className="container mx-auto px-4 py-8">Loading...</div>
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center mb-8">
        <Button variant="ghost" size="icon" asChild className="mr-2">
          <Link href="/">
            <ArrowLeft className="h-5 w-5" />
            <span className="sr-only">홈으로</span>
          </Link>
        </Button>
        <h1 className="text-2xl font-bold capitalize">{category} 카테고리</h1>
      </div>

      <div className="mb-8 flex flex-col sm:flex-row gap-4">
        <div className="w-full sm:w-1/3">
          <Label htmlFor="search">검색</Label>
          <Input
            id="search"
            placeholder="상품 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="w-full sm:w-1/3">
          <Label htmlFor="sort">정렬</Label>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger id="sort">
              <SelectValue placeholder="정렬 기준 선택" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">이름순</SelectItem>
              <SelectItem value="priceLow">가격 낮은순</SelectItem>
              <SelectItem value="priceHigh">가격 높은순</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {sortedAndFilteredProducts.length === 0 ? (
        <p className="text-center text-muted-foreground">해당 카테고리에 상품이 없습니다.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {sortedAndFilteredProducts.map((product) => (
            <ProductCard
              key={product.id}
              id={product.id}
              name={product.name}
              price={product.price}
              imageSrc={product.imageSrc}
              category={product.category}
            />
          ))}
        </div>
      )}
    </div>
  )
}

