'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Search,
  Filter,
  ChevronDown,
  MoreHorizontal,
  Calendar,
} from 'lucide-react'

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
import { toast } from 'sonner'
interface Order {
  id: string
  customer: string
  date: string
  items: number
  total: number
  paymentStatus: string
  deliveryStatus: string
}

export default function OrdersPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const url = new URL('/api/admin/orders', window.location.origin)
        if (searchTerm) url.searchParams.append('search', searchTerm)
        if (statusFilter !== 'all')
          url.searchParams.append('status', statusFilter)

        const response = await fetch(url)
        if (!response.ok) {
          throw new Error('주문 데이터를 불러오는데 실패했습니다')
        }
        const data = await response.json()
        setOrders(data)
      } catch (error) {
        console.error('주문 데이터 로딩 오류:', error)
      } finally {
        setLoading(false)
      }
    }

    // 검색어 입력 시 디바운스 적용
    const timer = setTimeout(() => {
      fetchOrders()
    }, 300)

    return () => clearTimeout(timer)
  }, [searchTerm, statusFilter])

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    try {
      const response = await fetch('/api/admin/orders', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ orderId, deliveryStatus: newStatus }),
      })

      if (!response.ok) {
        throw new Error('배송 상태 업데이트에 실패했습니다')
      }

      const result = await response.json()

      // 상태 업데이트 성공 시 주문 목록 갱신
      setOrders(
        orders.map(order =>
          order.id === orderId
            ? { ...order, deliveryStatus: newStatus }
            : order,
        ),
      )

      toast.success(result.message)
    } catch (error) {
      console.error('배송 상태 업데이트 오류:', error)
      toast.error('배송 상태 변경에 실패했습니다.')
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">주문 관리</h1>
        <Button variant="outline">
          <Calendar className="h-4 w-4 mr-2" />
          기간 설정
        </Button>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>주문 검색</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="주문번호 또는 고객명으로 검색"
                className="pl-8"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="배송 상태" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">모든 상태</SelectItem>
                <SelectItem value="결제 대기">결제 대기</SelectItem>
                <SelectItem value="배송 준비 중">배송 준비 중</SelectItem>
                <SelectItem value="배송 중">배송 중</SelectItem>
                <SelectItem value="배송 완료">배송 완료</SelectItem>
              </SelectContent>
            </Select>
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
                  <TableHead>주문번호</TableHead>
                  <TableHead>고객명</TableHead>
                  <TableHead>주문일자</TableHead>
                  <TableHead>상품수</TableHead>
                  <TableHead>총액</TableHead>
                  <TableHead>결제상태</TableHead>
                  <TableHead>배송상태</TableHead>
                  <TableHead className="text-right">관리</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.length > 0 ? (
                  orders.map(order => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">{order.id}</TableCell>
                      <TableCell>{order.customer}</TableCell>
                      <TableCell>{order.date}</TableCell>
                      <TableCell>{order.items}개</TableCell>
                      <TableCell>{order.total.toLocaleString()}원</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            order.paymentStatus === '결제 완료'
                              ? 'default'
                              : 'destructive'
                          }
                        >
                          {order.paymentStatus}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Select
                          defaultValue={order.deliveryStatus}
                          onValueChange={value =>
                            handleStatusChange(order.id, value)
                          }
                        >
                          <SelectTrigger className="h-8 w-[140px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="결제 대기">결제 대기</SelectItem>
                            <SelectItem value="배송 준비 중">
                              배송 준비 중
                            </SelectItem>
                            <SelectItem value="배송 중">배송 중</SelectItem>
                            <SelectItem value="배송 완료">배송 완료</SelectItem>
                          </SelectContent>
                        </Select>
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
                              <Link href={`/admin/orders/${order.id}`}>
                                상세 정보
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem>배송 상태 변경</DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive">
                              주문 취소
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-6">
                      {searchTerm || statusFilter !== 'all'
                        ? '검색 결과가 없습니다.'
                        : '주문 데이터가 없습니다.'}
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
