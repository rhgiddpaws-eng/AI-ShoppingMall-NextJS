'use client'
// =============================================================================
// 관리자 주문 목록 - /admin/orders
// 실DB 목록 API를 사용해 주문/배송/택배 정보를 조회하고 배송 상태를 변경합니다.
// =============================================================================

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Calendar, MoreHorizontal, Search } from 'lucide-react'
import { toast } from 'sonner'

import { useAuthStore } from '@/lib/store'
import { getDeliveryStatusLabel, DELIVERY_STATUS_LIST } from '@/lib/deliveryStatus'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface AdminOrderRow {
  id: number
  createdAt: string
  totalAmount: number
  status: string
  deliveryStatus: string | null
  deliveryProvider: string | null
  externalDeliveryStatus: string | null
  courierCode: string | null
  trackingNumber: string | null
  trackingUrl: string | null
  itemCount: number
  customerName: string | null
  customerEmail: string
  paymentStatus: string | null
}

interface AdminOrdersResponse {
  orders: AdminOrderRow[]
  nextCursor: number | null
}

/** 주문 목록 페이지는 검색/필터 변경 시 첫 페이지부터 다시 조회합니다. */
export default function OrdersPage() {
  const token = useAuthStore((s) => s.token)

  const [searchTerm, setSearchTerm] = useState('')
  const [deliveryStatusFilter, setDeliveryStatusFilter] = useState<string>('all')
  const [orders, setOrders] = useState<AdminOrderRow[]>([])
  const [nextCursor, setNextCursor] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)

  const authHeaders = useMemo(
    () => ({
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    }),
    [token],
  )

  const fetchOrders = async (append: boolean) => {
    try {
      if (append) {
        setLoadingMore(true)
      } else {
        setLoading(true)
      }

      const url = new URL('/api/admin/orders', window.location.origin)
      if (searchTerm.trim()) url.searchParams.set('search', searchTerm.trim())
      if (deliveryStatusFilter !== 'all') url.searchParams.set('deliveryStatus', deliveryStatusFilter)
      url.searchParams.set('limit', '30')
      if (append && nextCursor != null) {
        url.searchParams.set('cursor', String(nextCursor))
      }

      const response = await fetch(url.toString(), {
        credentials: 'include',
        headers: authHeaders,
      })
      if (!response.ok) throw new Error('주문 목록을 불러오지 못했습니다.')

      const data = (await response.json()) as AdminOrdersResponse
      setOrders((prev) => (append ? [...prev, ...data.orders] : data.orders))
      setNextCursor(data.nextCursor)
    } catch (error) {
      console.error('주문 목록 조회 오류:', error)
      toast.error('주문 목록을 불러오지 못했습니다.')
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setNextCursor(null)
      void fetchOrders(false)
    }, 250)
    return () => window.clearTimeout(timer)
  }, [searchTerm, deliveryStatusFilter, authHeaders])

  const handleStatusChange = async (orderId: number, newStatus: string) => {
    try {
      const response = await fetch('/api/admin/orders', {
        method: 'PUT',
        credentials: 'include',
        headers: authHeaders,
        body: JSON.stringify({ orderId, deliveryStatus: newStatus }),
      })

      const result = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(result?.error || '배송 상태 변경에 실패했습니다.')
      }

      setOrders((prev) =>
        prev.map((order) =>
          order.id === orderId ? { ...order, deliveryStatus: newStatus } : order,
        ),
      )
      toast.success(result?.message || `주문 #${orderId} 배송 상태를 변경했습니다.`)
    } catch (error) {
      console.error('배송 상태 변경 오류:', error)
      toast.error(error instanceof Error ? error.message : '배송 상태 변경에 실패했습니다.')
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">주문 관리</h1>
        <Button variant="outline">
          <Calendar className="mr-2 h-4 w-4" />
          최근 주문
        </Button>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>주문 검색</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 md:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="주문번호 / 고객명 / 이메일 / 송장번호"
                className="pl-8"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </div>
            <Select value={deliveryStatusFilter} onValueChange={setDeliveryStatusFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="배송 상태" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">모든 상태</SelectItem>
                {DELIVERY_STATUS_LIST.map((status) => (
                  <SelectItem key={status} value={status}>
                    {getDeliveryStatusLabel(status)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-primary" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>주문번호</TableHead>
                  <TableHead>고객</TableHead>
                  <TableHead>주문일</TableHead>
                  <TableHead>상품수</TableHead>
                  <TableHead>총액</TableHead>
                  <TableHead>결제</TableHead>
                  <TableHead>배송 상태</TableHead>
                  <TableHead>택배 정보</TableHead>
                  <TableHead className="text-right">관리</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.length > 0 ? (
                  orders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">#{order.id}</TableCell>
                      <TableCell>
                        <div className="font-medium">{order.customerName ?? '-'}</div>
                        <div className="text-xs text-muted-foreground">{order.customerEmail}</div>
                      </TableCell>
                      <TableCell>{new Date(order.createdAt).toLocaleDateString('ko-KR')}</TableCell>
                      <TableCell>{order.itemCount}개</TableCell>
                      <TableCell>{order.totalAmount.toLocaleString()}원</TableCell>
                      <TableCell>
                        <Badge variant={order.status === 'PAID' ? 'default' : 'secondary'}>
                          {order.paymentStatus ?? order.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={order.deliveryStatus ?? 'ORDER_COMPLETE'}
                          onValueChange={(value) => void handleStatusChange(order.id, value)}
                        >
                          <SelectTrigger className="h-8 w-[140px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {DELIVERY_STATUS_LIST.map((status) => (
                              <SelectItem key={status} value={status}>
                                {getDeliveryStatusLabel(status)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="max-w-[220px]">
                        <div className="truncate text-xs text-muted-foreground">
                          {order.deliveryProvider ?? '-'} / {order.courierCode ?? '-'}
                        </div>
                        <div className="truncate text-xs">{order.trackingNumber ?? '-'}</div>
                        <div className="truncate text-xs text-muted-foreground">
                          {order.externalDeliveryStatus ?? '-'}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">메뉴</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link href={`/admin/orders/${order.id}`}>상세 정보</Link>
                            </DropdownMenuItem>
                            {order.trackingUrl ? (
                              <DropdownMenuItem asChild>
                                <a href={order.trackingUrl} target="_blank" rel="noreferrer">
                                  배송 조회 링크
                                </a>
                              </DropdownMenuItem>
                            ) : null}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={9} className="py-6 text-center">
                      조회 결과가 없습니다.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {nextCursor != null ? (
        <div className="mt-4 flex justify-center">
          <Button variant="outline" disabled={loadingMore} onClick={() => void fetchOrders(true)}>
            {loadingMore ? '불러오는 중...' : '더 보기'}
          </Button>
        </div>
      ) : null}
    </div>
  )
}
