"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Search } from "lucide-react"
import { NavBar } from "@/components/NavBar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export default function SearchPage() {
  const [query, setQuery] = useState("")
  const router = useRouter()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim()) {
      router.push(`/?search=${encodeURIComponent(query.trim())}`)
    }
  }

  return (
    <div className="flex flex-col min-h-screen">
      <NavBar />
      <main className="container mx-auto px-4 py-8 flex-1">
        <h1 className="text-2xl font-bold mb-6">상품 검색</h1>
        <form onSubmit={handleSubmit} className="flex gap-2 max-w-md">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="상품명 검색..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button type="submit">검색</Button>
        </form>
        <div className="mt-8">
          <p className="text-muted-foreground mb-4">카테고리로 찾기</p>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/category/men">남성</Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/category/women">여성</Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/category/accessories">액세서리</Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/category/shoes">신발</Link>
            </Button>
          </div>
        </div>
      </main>
    </div>
  )
}
