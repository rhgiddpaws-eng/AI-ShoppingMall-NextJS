'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { useInfiniteQuery } from '@tanstack/react-query'
import { useInView } from 'react-intersection-observer'

import { Button } from '@/components/ui/button'
import ProductCard from '@/components/product-card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import useInputDebounce from '@/hooks/useInputDebounce'
import { apiRoutes } from '@/lib/apiRoutes'

export default function CategoryPage() {
  const { searchTerm, onSearchTermChange } = useInputDebounce()
  const params = useParams()
  const category = params.slug as string
  const [sortBy, setSortBy] = useState('createdAt')
  const [order, setOrder] = useState('desc')
  const { ref, inView } = useInView()

  const fetchProducts = async ({ pageParam = 1 }) => {
    const response = await fetch(
      `${apiRoutes.routes.products.routes.infinite.path}?category=${category}&sort=${sortBy}&order=${order}&term=${searchTerm}&page=${pageParam}&pageSize=12`,
    )
    return response.json()
  }

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useInfiniteQuery({
      queryKey: ['products', category, sortBy, order, searchTerm],
      queryFn: fetchProducts,
      getNextPageParam: (lastPage, pages) => {
        return lastPage.hasMore ? pages.length + 1 : undefined
      },
      initialPageParam: 1,
    })

  console.log('data: ', data)
  useEffect(() => {
    if (inView && hasNextPage) {
      fetchNextPage()
    }
  }, [inView, fetchNextPage, hasNextPage])

  const allProducts = data?.pages.flatMap(page => page.products) ?? []

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
            // value={searchTerm}
            onChange={onSearchTermChange}
          />
        </div>
        <div className="w-full sm:w-1/3">
          <Label htmlFor="sort">정렬</Label>
          <Select
            value={`${sortBy}-${order}`}
            onValueChange={value => {
              const [newSort, newOrder] = value.split('-')
              setSortBy(newSort)
              setOrder(newOrder)
            }}
          >
            <SelectTrigger id="sort">
              <SelectValue placeholder="정렬 기준 선택" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name-asc">이름순 (오름차순)</SelectItem>
              <SelectItem value="name-desc">이름순 (내림차순)</SelectItem>
              <SelectItem value="price-asc">가격 낮은순</SelectItem>
              <SelectItem value="price-desc">가격 높은순</SelectItem>
              <SelectItem value="createdAt-desc">최신순</SelectItem>
              <SelectItem value="createdAt-asc">오래된순</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {allProducts.length === 0 && !isLoading ? (
        <p className="text-center text-muted-foreground">
          해당 카테고리에 상품이 없습니다.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {allProducts.map(product => (
              <ProductCard
                key={product.id}
                id={product.id.toString()}
                name={product.name}
                price={product.price}
                imageSrc={
                  product?.images[0]?.original
                    ? `https://cdn.yes.monster/${product?.images[0]?.original}`
                    : '/placeholder.svg?height=400&width=300'
                }
                category={product.category || '기타'}
              />
            ))}
          </div>

          <div ref={ref} className="mt-8 flex justify-center">
            {isFetchingNextPage ? (
              <p className="text-muted-foreground">로딩 중...</p>
            ) : hasNextPage ? (
              <p className="text-muted-foreground">
                더 많은 상품 불러오는 중...
              </p>
            ) : null}
          </div>
        </>
      )}
    </div>
  )
}
