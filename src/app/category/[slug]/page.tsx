"use client"

// =============================================================================
// 카테고리 상품 목록 - /category/[slug]
// slug + 검색어(term) + 정렬값으로 무한 스크롤 목록을 조회합니다.
// =============================================================================

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useParams, useSearchParams } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { useInfiniteQuery } from "@tanstack/react-query"
import { useInView } from "react-intersection-observer"

import ProductCard from "@/components/product-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import useInputDebounce from "@/hooks/useInputDebounce"
import { apiRoutes } from "@/lib/apiRoutes"
import { getCdnUrl } from "@/lib/cdn"

type InfiniteProductsResponse = {
  products: Array<{
    id: number
    name: string
    price: number
    category: string | null
    images: Array<{
      id: number
      original: string
      thumbnail: string
    }>
  }>
  hasMore: boolean
  page: number
  pageSize: number
}

const CATEGORY_LABEL_MAP: Record<string, string> = {
  men: "남성",
  women: "여성",
  accessories: "액세서리",
  shoes: "신발",
  sale: "세일",
  new: "신상품",
}

export default function CategoryPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const category = String(params.slug ?? "new").toLowerCase()

  // URL의 term 값을 검색 초기값으로 사용합니다.
  const initialTerm = useMemo(() => searchParams.get("term") ?? "", [searchParams])
  const { inputValue, searchTerm, onSearchTermChange, setImmediateSearchTerm } =
    useInputDebounce(initialTerm)

  const [sortBy, setSortBy] = useState("createdAt")
  const [order, setOrder] = useState("desc")
  const { ref, inView } = useInView()

  useEffect(() => {
    // URL term이 바뀌면 입력창 검색어를 즉시 동기화합니다.
    setImmediateSearchTerm(initialTerm)
  }, [initialTerm, setImmediateSearchTerm])

  const fetchProducts = async ({
    pageParam = 1,
  }: {
    pageParam: number
  }): Promise<InfiniteProductsResponse> => {
    // 첫 페이지는 가벼운 목록 API를 사용해 진입 체감 속도를 높입니다.
    if (Number(pageParam) === 1) {
      const firstQuery = new URLSearchParams({
        category,
        sort: sortBy,
        order,
        term: searchTerm,
        limit: "13", // hasMore 판단을 위해 1개 더 조회합니다.
      })

      const firstResponse = await fetch(
        `${apiRoutes.routes.products.path}?${firstQuery.toString()}`,
      )

      if (!firstResponse.ok) {
        return {
          products: [],
          hasMore: false,
          page: 1,
          pageSize: 12,
        }
      }

      const firstRows = (await firstResponse.json()) as InfiniteProductsResponse["products"]
      const hasMore = firstRows.length > 12

      return {
        products: hasMore ? firstRows.slice(0, 12) : firstRows,
        hasMore,
        page: 1,
        pageSize: 12,
      }
    }

    const query = new URLSearchParams({
      category,
      sort: sortBy,
      order,
      term: searchTerm,
      page: String(pageParam),
      pageSize: "12",
    })

    const response = await fetch(
      `${apiRoutes.routes.products.routes.infinite.path}?${query.toString()}`,
    )

    if (!response.ok) {
      return {
        products: [],
        hasMore: false,
        page: Number(pageParam),
        pageSize: 12,
      }
    }

    return response.json() as Promise<InfiniteProductsResponse>
  }

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteQuery({
    queryKey: ["products", "category", category, sortBy, order, searchTerm],
    queryFn: fetchProducts,
    getNextPageParam: lastPage => (lastPage?.hasMore ? lastPage.page + 1 : undefined),
    initialPageParam: 1,
    // 카테고리 재진입 시 매번 재요청하지 않도록 기본 캐시 시간을 지정합니다.
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    retry: 1,
  })

  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage()
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage])

  const allProducts = data?.pages.flatMap(page => page?.products ?? []) ?? []
  const titleLabel = CATEGORY_LABEL_MAP[category] ?? `${category} 카테고리`

  // 상세 페이지와 동일한 진입 경험을 위해 첫 로딩 때 스피너를 먼저 보여줍니다.
  if (isLoading && allProducts.length === 0) {
    return (
      <div className="container mx-auto flex min-h-[50vh] items-center justify-center px-4 py-8">
        <LoadingSpinner size={28} label="카테고리 상품을 불러오는 중" />
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex items-center">
        <Button variant="ghost" size="icon" asChild className="mr-2">
          <Link href="/">
            <ArrowLeft className="h-5 w-5" />
            <span className="sr-only">뒤로 가기</span>
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">{titleLabel}</h1>
      </div>

      <div className="mb-8 flex flex-col gap-4 sm:flex-row">
        <div className="w-full sm:w-1/3">
          <Label htmlFor="search">검색</Label>
          <Input
            id="search"
            placeholder="상품 검색..."
            value={inputValue}
            onChange={onSearchTermChange}
          />
        </div>

        <div className="w-full sm:w-1/3">
          <Label htmlFor="sort">정렬</Label>
          <Select
            value={`${sortBy}-${order}`}
            onValueChange={value => {
              const [newSort, newOrder] = value.split("-")
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
              <SelectItem value="price-asc">가격순 (낮은순)</SelectItem>
              <SelectItem value="price-desc">가격순 (높은순)</SelectItem>
              <SelectItem value="createdAt-desc">최신순</SelectItem>
              <SelectItem value="createdAt-asc">오래된순</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {allProducts.length === 0 ? (
        <p className="text-center text-muted-foreground">
          해당 조건에 맞는 상품이 없습니다.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {allProducts.map(product => (
              <ProductCard
                key={product.id}
                id={product.id.toString()}
                name={product.name}
                price={product.price}
                imageSrc={
                  // 목록에서는 썸네일을 우선 사용해 초기 렌더 속도를 높입니다.
                  product?.images[0]?.thumbnail
                    ? getCdnUrl(product.images[0].thumbnail)
                    : product?.images[0]?.original
                      ? getCdnUrl(product.images[0].original)
                      : "/placeholder.svg?height=400&width=300"
                }
                category={product.category || "기타"}
              />
            ))}
          </div>

          <div ref={ref} className="mt-8 flex justify-center">
            {isFetchingNextPage ? (
              <LoadingSpinner size={22} label="상품을 추가로 불러오는 중" />
            ) : hasNextPage ? (
              <p className="text-muted-foreground">더 많은 상품을 불러올 수 있습니다.</p>
            ) : null}
          </div>
        </>
      )}
    </div>
  )
}
