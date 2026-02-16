"use client"
// =============================================================================
// 관리자 상품 관리 - /admin/products
// 상품 검색·카테고리 필터, 상품 테이블, 신규 등록/수정/상세 링크, 전체 삭제
// =============================================================================

import { useState, useEffect } from "react"
import Link from "next/link"
import { Search, Filter, ChevronDown, MoreHorizontal, Plus, PlusCircle, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  status: string;
}

/** 상품 관리: 검색/카테고리로 목록 조회, 수정·상세는 /admin/products/[id]로 이동 */
export default function ProductsPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [includeDrafts, setIncludeDrafts] = useState(false)
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [wiping, setWiping] = useState(false)
  const [showWipeConfirm, setShowWipeConfirm] = useState(false)

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const url = new URL("/api/admin/products", window.location.origin)
        if (searchTerm) url.searchParams.append("search", searchTerm)
        if (categoryFilter !== "all") url.searchParams.append("category", categoryFilter)
        if (includeDrafts) url.searchParams.append("includeDrafts", "true")

        const response = await fetch(url)
        if (!response.ok) {
          throw new Error("상품 데이터를 불러오는데 실패했습니다")
        }
        const data = await response.json()
        setProducts(Array.isArray(data) ? data : [])
      } catch (error) {
        console.error("상품 데이터 로딩 오류:", error)
      } finally {
        setLoading(false)
      }
    }

    // 검색어 입력 시 디바운스 적용
    const timer = setTimeout(() => {
      fetchProducts()
    }, 300)

    return () => clearTimeout(timer)
  }, [searchTerm, categoryFilter, includeDrafts])

  const handleWipeAll = async () => {
    setWiping(true)
    try {
      const res = await fetch("/api/admin/products/wipe", { method: "POST" })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        alert(data?.error ?? "전체 삭제에 실패했습니다.")
        return
      }
      alert(data?.message ?? "삭제되었습니다.")
      setShowWipeConfirm(false)
      setProducts([])
      const listRes = await fetch("/api/admin/products")
      if (listRes.ok) {
        const list = await listRes.json()
        setProducts(Array.isArray(list) ? list : [])
      }
    } finally {
      setWiping(false)
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">상품 관리</h1>
        <div className="flex gap-2">
          {products.length > 0 && (
            <Button
              variant="destructive"
              onClick={() => setShowWipeConfirm(true)}
              disabled={wiping}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              전체 상품 삭제
            </Button>
          )}
          <Link href="/admin/products/new">
            <Button>
              <PlusCircle className="h-4 w-4 mr-2" />
              신규 상품 등록
            </Button>
          </Link>
        </div>
      </div>

      {showWipeConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-background border rounded-lg p-6 max-w-md mx-4 shadow-lg">
            <h3 className="text-lg font-semibold mb-2">전체 상품 삭제</h3>
            <p className="text-muted-foreground text-sm mb-4">
              S3와 DB에 있는 모든 상품을 삭제합니다. 주문 기록이 있으면 실행할 수 없습니다. 정말 진행할까요?
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowWipeConfirm(false)} disabled={wiping}>
                취소
              </Button>
              <Button variant="destructive" onClick={handleWipeAll} disabled={wiping}>
                {wiping ? "삭제 중..." : "전체 삭제"}
              </Button>
            </div>
          </div>
        </div>
      )}

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>상품 검색</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="상품명 또는 ID로 검색"
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="카테고리" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">모든 카테고리</SelectItem>
                <SelectItem value="MEN">남성</SelectItem>
                <SelectItem value="WOMEN">여성</SelectItem>
                <SelectItem value="ACCESSORIES">액세서리</SelectItem>
                <SelectItem value="SHOES">신발</SelectItem>
                <SelectItem value="SALE">세일</SelectItem>
                <SelectItem value="NEW">신상품</SelectItem>
              </SelectContent>
            </Select>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={includeDrafts}
                onChange={(e) => setIncludeDrafts(e.target.checked)}
              />
              임시저장 포함
            </label>
            <Button variant="outline">
              <Filter className="h-4 w-4 mr-2" />
              필터
              <ChevronDown className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>상품명</TableHead>
                  <TableHead>카테고리</TableHead>
                  <TableHead>가격</TableHead>
                  <TableHead>재고</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead className="text-right">관리</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.length > 0 ? (
                  products.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell className="font-medium">{product.id}</TableCell>
                      <TableCell>{product.name}</TableCell>
                      <TableCell>{product.category}</TableCell>
                      <TableCell>{product.price.toLocaleString()}원</TableCell>
                      <TableCell>
                        <Badge variant={product.stock <= 5 ? "destructive" : "outline"}>{product.stock}개</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={product.status === "판매중" ? "default" : product.status === "임시저장" ? "outline" : "secondary"}>{product.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end items-center space-x-2">
                          <Button variant="outline" size="sm" asChild>
                            <Link href={`/admin/products/${product.id}`}>수정</Link>
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                                <span className="sr-only">메뉴</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem asChild>
                                <Link href={`/admin/products/${product.id}`}>상세 정보</Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem>재고 수정</DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive">판매 중지</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-6">
                      {searchTerm || categoryFilter !== "all" ? "검색 결과가 없습니다." : "상품 데이터가 없습니다."}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

