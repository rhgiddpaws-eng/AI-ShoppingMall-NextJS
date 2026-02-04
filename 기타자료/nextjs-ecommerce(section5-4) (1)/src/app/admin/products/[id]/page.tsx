"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, Save, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "sonner"
interface Product {
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

export default function ProductDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string
  const isNew = id === "new"

  const [product, setProduct] = useState<Product | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    const fetchProductData = async () => {
      try {
        const response = await fetch(`/api/admin/products/${id}`)
        if (!response.ok) {
          throw new Error("상품 데이터를 불러오는데 실패했습니다")
        }
        const data = await response.json()
        setProduct(data)
      } catch (error) {
        console.error('상품 데이터 로딩 오류:', error)
        toast.error('상품 정보를 불러올 수 없습니다.')
      } finally {
        setIsLoading(false)
      }
    }

    fetchProductData()
  }, [id, toast])

  const handleSave = async () => {
    setIsSaving(true)

    try {
      const url = isNew ? "/api/admin/products" : `/api/admin/products/${id}`
      const method = isNew ? "POST" : "PUT"

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(product),
      })

      if (!response.ok) {
        throw new Error("상품 정보 저장에 실패했습니다")
      }

      const savedProduct = await response.json()

      toast.success(`상품이 성공적으로 ${isNew ? '등록' : '수정'}되었습니다.`)

      // 새 상품 등록 후 해당 상품의 상세 페이지로 이동
      if (isNew && savedProduct.id) {
        router.push(`/admin/products/${savedProduct.id}`)
      } else {
        router.push("/admin/products")
      }
    } catch (error) {
      console.error("상품 정보 저장 오류:", error)
      toast.error(`상품 ${isNew ? '등록' : '수정'}에 실패했습니다.`)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm("정말로 이 상품을 삭제하시겠습니까?")) {
      return
    }

    setIsSaving(true)

    try {
      const response = await fetch(`/api/admin/products/${id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("상품 삭제에 실패했습니다")
      }

      toast.success('상품이 성공적으로 삭제되었습니다.')

      router.push("/admin/products")
    } catch (error) {
      console.error('상품 삭제 오류:', error)
      toast.error('상품 삭제에 실패했습니다.')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!product) {
    return (
      <div>
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="mb-4">
          <ArrowLeft className="h-5 w-5" />
          <span className="sr-only">뒤로 가기</span>
        </Button>
        <h1 className="text-2xl font-bold mb-4">상품을 찾을 수 없습니다</h1>
        <p>요청하신 상품 정보를 찾을 수 없습니다.</p>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="mr-2">
            <ArrowLeft className="h-5 w-5" />
            <span className="sr-only">뒤로 가기</span>
          </Button>
          <h1 className="text-2xl font-bold">{isNew ? "신규 상품 등록" : "상품 수정"}</h1>
        </div>
        <div className="flex gap-2">
          {!isNew && (
            <Button variant="destructive" onClick={handleDelete} disabled={isSaving}>
              <Trash2 className="h-4 w-4 mr-2" />
              삭제
            </Button>
          )}
          <Button onClick={handleSave} disabled={isSaving}>
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? "처리 중..." : "저장"}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="basic">
        <TabsList className="mb-4">
          <TabsTrigger value="basic">기본 정보</TabsTrigger>
          <TabsTrigger value="images">이미지</TabsTrigger>
          <TabsTrigger value="options">옵션</TabsTrigger>
        </TabsList>

        <TabsContent value="basic">
          <Card>
            <CardHeader>
              <CardTitle>기본 정보</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">상품명</Label>
                  <Input
                    id="name"
                    value={product.name}
                    onChange={(e) => setProduct({ ...product, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">카테고리</Label>
                  <Select
                    value={product.category}
                    onValueChange={(value) => setProduct({ ...product, category: value })}
                  >
                    <SelectTrigger id="category">
                      <SelectValue placeholder="카테고리 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="의류">의류</SelectItem>
                      <SelectItem value="신발">신발</SelectItem>
                      <SelectItem value="액세서리">액세서리</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">상품 설명</Label>
                <Textarea
                  id="description"
                  rows={5}
                  value={product.description}
                  onChange={(e) => setProduct({ ...product, description: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price">가격</Label>
                  <Input
                    id="price"
                    type="number"
                    value={product.price}
                    onChange={(e) => setProduct({ ...product, price: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="stock">재고</Label>
                  <Input
                    id="stock"
                    type="number"
                    value={product.stock}
                    onChange={(e) => setProduct({ ...product, stock: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">상태</Label>
                  <Select value={product.status} onValueChange={(value) => setProduct({ ...product, status: value })}>
                    <SelectTrigger id="status">
                      <SelectValue placeholder="상태 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="판매중">판매중</SelectItem>
                      <SelectItem value="품절">품절</SelectItem>
                      <SelectItem value="판매중지">판매중지</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="images">
          <Card>
            <CardHeader>
              <CardTitle>상품 이미지</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="border border-dashed rounded-lg p-4 flex flex-col items-center justify-center h-40">
                  <Button variant="ghost">이미지 업로드</Button>
                  <p className="text-sm text-muted-foreground mt-2">JPG, PNG, GIF 파일 (최대 5MB)</p>
                </div>
                {product.images &&
                  product.images.map((image, index) => (
                    <div key={index} className="relative border rounded-lg overflow-hidden h-40">
                      <img
                        src={image || "/placeholder.svg"}
                        alt={`Product ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2 h-6 w-6"
                        onClick={() => {
                          const newImages = [...product.images]
                          newImages.splice(index, 1)
                          setProduct({ ...product, images: newImages })
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="options">
          <Card>
            <CardHeader>
              <CardTitle>상품 옵션</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Input placeholder="새 옵션 추가 (예: 사이즈, 색상 등)" />
                  <Button>추가</Button>
                </div>

                <div className="space-y-2">
                  {product.options && product.options.length > 0 ? (
                    product.options.map((option, index) => (
                      <div key={index} className="flex items-center justify-between p-2 border rounded-md">
                        <span>{option}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            const newOptions = [...product.options]
                            newOptions.splice(index, 1)
                            setProduct({ ...product, options: newOptions })
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))
                  ) : (
                    <p className="text-muted-foreground text-center py-4">등록된 옵션이 없습니다.</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

