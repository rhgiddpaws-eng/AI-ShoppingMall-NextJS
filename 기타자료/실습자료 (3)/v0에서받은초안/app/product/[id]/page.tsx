"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Image from "next/image"
import { ArrowLeft, Heart, ShoppingCart, Star } from "lucide-react"

import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { useShopStore } from "@/lib/store"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function ProductPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const { addToCart, addToWishlist, removeFromWishlist, isInWishlist } = useShopStore()
  const [isWishlisted, setIsWishlisted] = useState(false)

  // 임시 상품 데이터
  const product = {
    id: params.id as string,
    name: "샘플 상품",
    price: 50000,
    description: "이 상품은 샘플 상품입니다. 실제 데이터로 교체해주세요.",
    imageSrc: "/placeholder.svg",
    category: "샘플 카테고리",
    rating: 4.5,
    reviews: 10,
    inStock: true,
  }

  useEffect(() => {
    setIsWishlisted(isInWishlist(product.id))
  }, [product.id, isInWishlist])

  const handleAddToCart = () => {
    addToCart({
      id: product.id,
      name: product.name,
      price: product.price,
      imageSrc: product.imageSrc,
      quantity: 1,
      category: product.category,
    })
    toast({
      title: "장바구니에 추가되었습니다",
      description: `${product.name}이(가) 장바구니에 추가되었습니다.`,
    })
  }

  const handleToggleWishlist = () => {
    if (isWishlisted) {
      removeFromWishlist(product.id)
      setIsWishlisted(false)
      toast({
        title: "위시리스트에서 제거되었습니다",
        description: `${product.name}이(가) 위시리스트에서 제거되었습니다.`,
      })
    } else {
      addToWishlist({
        id: product.id,
        name: product.name,
        price: product.price,
        imageSrc: product.imageSrc,
        category: product.category,
      })
      setIsWishlisted(true)
      toast({
        title: "위시리스트에 추가되었습니다",
        description: `${product.name}이(가) 위시리스트에 추가되었습니다.`,
      })
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Button variant="ghost" size="icon" onClick={() => router.back()} className="mb-4">
        <ArrowLeft className="h-5 w-5" />
        <span className="sr-only">뒤로 가기</span>
      </Button>

      <div className="grid md:grid-cols-2 gap-8">
        <div className="relative aspect-square">
          <Image
            src={product.imageSrc || "/placeholder.svg"}
            alt={product.name}
            fill
            className="object-cover rounded-lg"
          />
        </div>

        <div>
          <h1 className="text-3xl font-bold mb-2">{product.name}</h1>
          <p className="text-2xl font-semibold mb-4">{product.price.toLocaleString()}원</p>

          <div className="flex items-center mb-4">
            {Array.from({ length: 5 }).map((_, index) => (
              <Star
                key={index}
                className={`h-5 w-5 ${
                  index < Math.floor(product.rating) ? "text-yellow-400 fill-current" : "text-gray-300"
                }`}
              />
            ))}
            <span className="ml-2 text-sm text-gray-600">({product.reviews} 리뷰)</span>
          </div>

          <p className="mb-6">{product.description}</p>

          <div className="space-y-4">
            <Button onClick={handleAddToCart} disabled={!product.inStock} className="w-full">
              <ShoppingCart className="mr-2 h-4 w-4" />
              {product.inStock ? "장바구니에 추가" : "품절"}
            </Button>
            <Button variant="outline" onClick={handleToggleWishlist} className="w-full">
              <Heart className={`mr-2 h-4 w-4 ${isWishlisted ? "fill-current text-red-500" : ""}`} />
              {isWishlisted ? "위시리스트에서 제거" : "위시리스트에 추가"}
            </Button>
          </div>
        </div>
      </div>

      <Tabs defaultValue="description" className="mt-12">
        <TabsList>
          <TabsTrigger value="description">상세 설명</TabsTrigger>
          <TabsTrigger value="reviews">리뷰</TabsTrigger>
          <TabsTrigger value="shipping">배송 정보</TabsTrigger>
        </TabsList>
        <TabsContent value="description" className="mt-4">
          <h2 className="text-xl font-semibold mb-2">상품 상세 설명</h2>
          <p>{product.description}</p>
        </TabsContent>
        <TabsContent value="reviews" className="mt-4">
          <h2 className="text-xl font-semibold mb-2">고객 리뷰</h2>
          <p>아직 리뷰가 없습니다. 첫 번째 리뷰를 작성해주세요!</p>
        </TabsContent>
        <TabsContent value="shipping" className="mt-4">
          <h2 className="text-xl font-semibold mb-2">배송 정보</h2>
          <p>일반 배송: 3-5일 소요</p>
          <p>빠른 배송: 1-2일 소요 (추가 요금 발생)</p>
        </TabsContent>
      </Tabs>
    </div>
  )
}

