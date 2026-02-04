'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import {
  ChevronRight,
  Package,
  AlertTriangle,
  CheckCircle,
  Clock,
} from 'lucide-react'
import { useInfiniteQuery, useQuery, InfiniteData } from '@tanstack/react-query'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useIntersection } from '@/hooks/use-intersection'
import { OrderStatus, PaymentStatus } from '@prisma/client'
import {
  OrdersResponse,
  OrdersQueryParams,
  FormattedOrderItem,
  FormattedOrder,
} from '@/app/api/user/orders/route'

// 주문 목록 가져오기 함수
const fetchOrders = async ({
  pageParam = null,
  status = null,
}: OrdersQueryParams): Promise<OrdersResponse> => {
  const params = new URLSearchParams()
  if (pageParam) params.append('cursor', pageParam.toString())
  if (status) params.append('status', status)
  params.append('limit', '5')

  const response = await fetch(`/api/user/orders?${params.toString()}`)
  if (!response.ok) {
    throw new Error('주문 내역을 불러오는데 실패했습니다')
  }
  return response.json()
}

// 주문 상세 정보 가져오기 함수
const fetchOrderDetails = async (orderId: number) => {
  const response = await fetch(`/api/user/orders/${orderId}`)
  if (!response.ok) {
    throw new Error('주문 상세 정보를 불러오는데 실패했습니다')
  }
  return response.json()
}

export function OrderHistory() {
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null)
  const [isOrderDetailsOpen, setIsOrderDetailsOpen] = useState(false)
  const [statusFilter, setStatusFilter] = useState<OrderStatus | null>(null)

  // 무한 스크롤을 위한 IntersectionObserver 설정
  const loadMoreRef = useRef<HTMLDivElement>(null)
  const { isIntersecting } = useIntersection(loadMoreRef)

  // 주문 목록 쿼리
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    error,
  } = useInfiniteQuery<
    OrdersResponse,
    Error,
    InfiniteData<OrdersResponse>,
    [string, OrderStatus | null],
    number | null
  >({
    queryKey: ['orders', statusFilter],
    queryFn: ({ pageParam }) =>
      fetchOrders({ pageParam, status: statusFilter }),
    getNextPageParam: (lastPage: OrdersResponse) => lastPage.nextCursor,
    initialPageParam: null,
  })

  // 주문 상세 정보 쿼리
  const {
    data: selectedOrder,
    isLoading: isLoadingDetails,
    isError: isErrorDetails,
    error: detailsError,
  } = useQuery({
    queryKey: ['orderDetails', selectedOrderId],
    queryFn: () => fetchOrderDetails(selectedOrderId!),
    enabled: !!selectedOrderId,
  })

  // 무한 스크롤 로직
  const handleLoadMore = useCallback(() => {
    if (isIntersecting && hasNextPage && !isFetchingNextPage) {
      fetchNextPage()
    }
  }, [isIntersecting, hasNextPage, isFetchingNextPage, fetchNextPage])

  // 무한 스크롤 효과 적용
  useEffect(() => {
    handleLoadMore()
  }, [handleLoadMore])

  const handleViewOrderDetails = (orderId: number) => {
    setSelectedOrderId(orderId)
    setIsOrderDetailsOpen(true)
  }

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'yyyy년 MM월 dd일', { locale: ko })
  }

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case OrderStatus.PENDING:
        return (
          <Badge variant="outline" className="flex items-center gap-1">
            <Clock className="h-3 w-3" /> 대기중
          </Badge>
        )
      case OrderStatus.PAID:
        return (
          <Badge variant="default" className="flex items-center gap-1">
            <CheckCircle className="h-3 w-3" /> 결제완료
          </Badge>
        )
      case OrderStatus.CANCELED:
        return (
          <Badge variant="destructive" className="flex items-center gap-1 text-white">
            <AlertTriangle className="h-3 w-3" /> 취소됨
          </Badge>
        )
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  // 상태별 필터링 UI
  const renderFilterButtons = () => (
    <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
      <Button
        variant={statusFilter === null ? 'default' : 'outline'}
        size="sm"
        onClick={() => setStatusFilter(null)}
      >
        전체
      </Button>
      <Button
        variant={statusFilter === OrderStatus.PENDING ? 'default' : 'outline'}
        size="sm"
        onClick={() => setStatusFilter(OrderStatus.PENDING)}
      >
        대기중
      </Button>
      <Button
        variant={statusFilter === OrderStatus.PAID ? 'default' : 'outline'}
        size="sm"
        onClick={() => setStatusFilter(OrderStatus.PAID)}
      >
        결제완료
      </Button>
      <Button
        variant={statusFilter === OrderStatus.CANCELED ? 'default' : 'outline'}
        size="sm"
        onClick={() => setStatusFilter(OrderStatus.CANCELED)}
      >
        취소됨
      </Button>
    </div>
  )

  if (isLoading && !isOrderDetailsOpen) {
    return (
      <div className="space-y-4">
        {renderFilterButtons()}
        {[1, 2, 3].map(i => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="flex justify-between items-center">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-6 w-24" />
              </div>
              <div className="mt-4 flex items-center gap-4">
                <Skeleton className="h-16 w-16 rounded" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (isError && !data?.pages?.[0]?.orders?.length) {
    return (
      <div className="text-center py-8">
        <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
        <h3 className="text-lg font-medium">주문 내역을 불러올 수 없습니다</h3>
        <p className="text-muted-foreground mt-2">
          {error instanceof Error ? error.message : '알 수 없는 오류'}
        </p>
      </div>
    )
  }

  const orders = data?.pages.flatMap(page => page.orders) || []

  if (!orders.length && !isLoading) {
    return (
      <div className="text-center py-8">
        {renderFilterButtons()}
        <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium">주문 내역이 없습니다</h3>
        <p className="text-muted-foreground mt-2">
          아직 주문 내역이 없습니다. 쇼핑을 시작해보세요!
        </p>
        <Button asChild className="mt-4">
          <Link href="/">쇼핑하러 가기</Link>
        </Button>
      </div>
    )
  }

  if (isOrderDetailsOpen && selectedOrder) {
    return (
      <div>
        <div className="flex items-center mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsOrderDetailsOpen(false)}
            className="mr-2"
          >
            <ChevronRight className="h-4 w-4 rotate-180" />
            <span className="ml-1">주문 목록으로</span>
          </Button>
          <h3 className="text-lg font-medium">주문 상세 정보</h3>
        </div>

        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h4 className="font-medium">주문번호: #{selectedOrder.id}</h4>
              <p className="text-sm text-muted-foreground">
                {formatDate(selectedOrder.createdAt)}
              </p>
            </div>
            {getStatusBadge(selectedOrder.status)}
          </div>

          <Card>
            <CardContent className="p-4">
              <h4 className="font-medium mb-4">주문 상품</h4>
              <div className="space-y-4">
                {selectedOrder.items.map((item: FormattedOrderItem) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-4 pb-4 border-b last:border-0 last:pb-0"
                  >
                    <div className="relative h-16 w-16 bg-muted rounded overflow-hidden">
                      <Image
                        src={`https://cdn.yes.monster/${item.product.imageSrc}` || '/placeholder.svg'}
                        alt={item.product.name}
                        fill
                        sizes="64px"
                        className="object-cover"
                      />
                    </div>
                    <div className="flex-1">
                      <h5 className="font-medium">{item.product.name}</h5>
                      <p className="text-sm text-muted-foreground">
                        {item.quantity}개 x {item.price.toLocaleString()}원
                      </p>
                    </div>
                    <div className="font-medium">
                      {(item.price * item.quantity).toLocaleString()}원
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <Card>
              <CardContent className="p-4">
                <h4 className="font-medium mb-4">결제 정보</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">결제 방법</span>
                    <span>{selectedOrder.payment.paymentMethod}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">결제 상태</span>
                    <span>
                      {selectedOrder.payment.status === PaymentStatus.PAID ? (
                        <Badge variant="default">결제완료</Badge>
                      ) : selectedOrder.payment.status ===
                        PaymentStatus.WAITING ? (
                        <Badge variant="outline">대기중</Badge>
                      ) : (
                        <Badge variant="destructive">실패</Badge>
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">결제 금액</span>
                    <span className="font-medium">
                      {selectedOrder.payment.amount.toLocaleString()}원
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <h4 className="font-medium mb-4">주문 요약</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">상품 금액</span>
                    <span>
                      {selectedOrder.items
                        .reduce(
                          (sum: number, item: FormattedOrderItem) =>
                            sum + item.price * item.quantity,
                          0,
                        )
                        .toLocaleString()}
                      원
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">배송비</span>
                    <span>무료</span>
                  </div>
                  <div className="flex justify-between font-medium">
                    <span>총 결제 금액</span>
                    <span>{selectedOrder.totalAmount.toLocaleString()}원</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="flex justify-center mt-6">
          <Button variant="outline" size="sm" asChild>
            <Link href="/support">문의하기</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {renderFilterButtons()}

      {orders.map((order: FormattedOrder) => (
        <Card key={order.id} className="hover:bg-muted/50 transition-colors">
          <CardContent className="p-4">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h4 className="font-medium">주문번호: #{order.id}</h4>
                <p className="text-sm text-muted-foreground">
                  {formatDate(order.createdAt.toString())}
                </p>
              </div>
              {getStatusBadge(order.status)}
            </div>

            <div className="flex items-center gap-4">
              <div className="relative h-16 w-16 bg-muted rounded overflow-hidden">
                <Image
                  src={`https://cdn.yes.monster/${order.items[0].product.imageSrc}` || '/placeholder.svg'}
                  alt={order.items[0].product.name}
                  fill
                  sizes="64px"
                  className="object-cover"
                />
              </div>
              <div className="flex-1">
                <h5 className="font-medium">{order.items[0].product.name}</h5>
                <p className="text-sm text-muted-foreground">
                  {order.items.length > 1
                    ? `외 ${order.items.length - 1}개 상품`
                    : ''}
                </p>
              </div>
              <div className="text-right">
                <div className="font-medium">
                  {order.totalAmount.toLocaleString()}원
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-1"
                  onClick={() => handleViewOrderDetails(order.id)}
                >
                  상세보기
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      {/* 무한 스크롤 로딩 표시기 */}
      {hasNextPage && (
        <div ref={loadMoreRef} className="py-4 text-center">
          {isFetchingNextPage ? (
            <div className="flex justify-center items-center gap-2">
              <div className="h-4 w-4 rounded-full border-2 border-primary border-t-transparent animate-spin"></div>
              <span className="text-sm text-muted-foreground">
                더 불러오는 중...
              </span>
            </div>
          ) : (
            <Button variant="outline" size="sm" onClick={() => fetchNextPage()}>
              더 보기
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
