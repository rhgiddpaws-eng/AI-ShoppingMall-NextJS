'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import { ArrowLeft, Heart, ShoppingCart, Star } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { useShopStore } from '@/lib/store'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import { apiRoutes } from '@/lib/apiRoutes'
import { RecommendedProducts } from '@/components/recommended-products'

type ProductType = {
  id: number
  name: string
  description: string | null
  price: number
  stock: number
  discountRate: number
  category: string | null
  images: {
    id: number
    original: string
    thumbnail: string
  }[]
}

export default function ProductPage() {
  const params = useParams()
  const router = useRouter()
  const { addToCart, addToWishlist, removeFromWishlist, isInWishlist } =
    useShopStore()
  const [isWishlisted, setIsWishlisted] = useState(false)
  const [product, setProduct] = useState<ProductType | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setLoading(true)
        const response = await fetch(
          `${apiRoutes.routes.products.path}/${params.id}`,
        )

        if (!response.ok) {
          throw new Error('상품을 불러오는데 실패했습니다')
        }

        const data = await response.json()
        setProduct(data)
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : '상품을 불러오는데 오류가 발생했습니다',
        )
        console.error('상품 조회 오류:', err)
      } finally {
        setLoading(false)
      }
    }

    if (params.id) {
      fetchProduct()
    }
  }, [params.id])

  useEffect(() => {
    if (product) {
      setIsWishlisted(isInWishlist(product.id.toString()))
    }
  }, [product, isInWishlist])

  const handleAddToCart = () => {
    if (!product) return

    addToCart({
      id: product.id.toString(),
      name: product.name,
      price: product.price,
      imageSrc:
        product.images.length > 0
          ? `https://cdn.yes.monster/${product.images[0].original}`
          : '/placeholder.svg',
      quantity: 1,
      category: product.category || '기타',
    })
    toast.success(`${product.name}이(가) 장바구니에 추가되었습니다.`)
  }

  const handleToggleWishlist = () => {
    if (!product) return

    if (isWishlisted) {
      removeFromWishlist(product.id.toString())
      setIsWishlisted(false)
      toast.success(`${product.name}이(가) 위시리스트에서 제거되었습니다.`)
    } else {
      addToWishlist({
        id: product.id.toString(),
        name: product.name,
        price: product.price,
        imageSrc:
          product.images.length > 0
            ? `https://cdn.yes.monster/${product.images[0].original}`
            : '/placeholder.svg',
        category: product.category || '기타',
      })
      setIsWishlisted(true)
      toast.success(`${product.name}이(가) 위시리스트에 추가되었습니다.`)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 flex justify-center items-center min-h-[50vh]">
        <p>상품 정보를 불러오는 중...</p>
      </div>
    )
  }

  if (error || !product) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.back()}
          className="mb-4"
        >
          <ArrowLeft className="h-5 w-5" />
          <span className="sr-only">뒤로 가기</span>
        </Button>
        <div className="text-center py-10">
          <h2 className="text-xl font-semibold">상품을 찾을 수 없습니다</h2>
          <p className="mt-2 text-gray-500">
            {error || '잘못된 접근이거나 상품이 존재하지 않습니다.'}
          </p>
        </div>
      </div>
    )
  }

  const imageUrl =
    product.images.length > 0
      ? `https://cdn.yes.monster/${product.images[0].original}`
      : '/placeholder.svg'

  const finalPrice = product.price * (1 - product.discountRate)

  return (
    <div className="container mx-auto px-4 py-8">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => router.back()}
        className="mb-4"
      >
        <ArrowLeft className="h-5 w-5" />
        <span className="sr-only">뒤로 가기</span>
      </Button>

      <div className="grid md:grid-cols-2 gap-8">
        <div className="relative aspect-square">
          <Image
            src={imageUrl}
            alt={product.name}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-cover rounded-lg"
            priority
          />
        </div>

        <div>
          <h1 className="text-3xl font-bold mb-2">{product.name}</h1>

          {product.discountRate > 0 ? (
            <div className="mb-4">
              <p className="text-lg text-gray-500 line-through">
                {product.price.toLocaleString()}원
              </p>
              <p className="text-2xl font-semibold text-red-600">
                {finalPrice.toLocaleString()}원
                <span className="ml-2 text-sm bg-red-100 text-red-600 px-2 py-1 rounded">
                  {(product.discountRate * 100).toFixed(0)}% 할인
                </span>
              </p>
            </div>
          ) : (
            <p className="text-2xl font-semibold mb-4">
              {product.price.toLocaleString()}원
            </p>
          )}

          <p className="mb-6">
            {product.description || '상품 설명이 없습니다.'}
          </p>

          <div className="mb-4">
            <p className="text-sm text-gray-600">
              재고: {product.stock > 0 ? `${product.stock}개` : '품절'}
            </p>
            <p className="text-sm text-gray-600">
              카테고리: {product.category || '기타'}
            </p>
          </div>

          <div className="space-y-4">
            <Button
              onClick={handleAddToCart}
              disabled={product.stock <= 0}
              className="w-full"
            >
              <ShoppingCart className="mr-2 h-4 w-4" />
              {product.stock > 0 ? '장바구니에 추가' : '품절'}
            </Button>
            <Button
              variant="outline"
              onClick={handleToggleWishlist}
              className="w-full"
            >
              <Heart
                className={`mr-2 h-4 w-4 ${
                  isWishlisted ? 'fill-current text-red-500' : ''
                }`}
              />
              {isWishlisted ? '위시리스트에서 제거' : '위시리스트에 추가'}
            </Button>
          </div>
        </div>
      </div>

      <Tabs defaultValue="description" className="mt-12">
        <TabsList>
          <TabsTrigger value="description">상세 설명</TabsTrigger>
          <TabsTrigger value="shipping">배송 정보</TabsTrigger>
        </TabsList>
        <TabsContent value="description" className="mt-4">
          <h2 className="text-xl font-semibold mb-2">상품 상세 설명</h2>
          <p>{product.description || '상세 설명이 없습니다.'}</p>
        </TabsContent>
        <TabsContent value="shipping" className="mt-4">
          <h2 className="text-xl font-semibold mb-2">배송 정보</h2>
          <p>일반 배송: 3-5일 소요</p>
          <p>빠른 배송: 1-2일 소요 (추가 요금 발생)</p>
        </TabsContent>
      </Tabs>

      <RecommendedProducts currentProductId={product.id.toString()} />
    </div>
  )
}
