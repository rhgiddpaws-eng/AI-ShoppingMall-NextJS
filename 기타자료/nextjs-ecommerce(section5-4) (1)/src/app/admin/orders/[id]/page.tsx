"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, Printer, Send } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

interface Customer {
  name: string;
  email: string;
  phone: string;
}

interface Order {
  id: string;
  date: string;
  paymentStatus: string;
  deliveryStatus: string;
  paymentMethod: string;
  shippingAddress: string;
  items: OrderItem[];
  subtotal: number;
  shipping: number;
  total: number;
  customer: Customer;
}

export default function OrderDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [order, setOrder] = useState<Order | null>(null)
  const [deliveryStatus, setDeliveryStatus] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isUpdating, setIsUpdating] = useState(false)

  useEffect(() => {
    const fetchOrderData = async () => {
      try {
        const response = await fetch(`/api/admin/orders/${id}`)
        if (!response.ok) {
          throw new Error("주문 데이터를 불러오는데 실패했습니다")
        }
        const data = await response.json()
        setOrder(data)
        setDeliveryStatus(data.deliveryStatus)
      } catch (error) {
        console.error("주문 데이터 로딩 오류:", error)
        toast.error("주문 정보를 불러올 수 없습니다.")
      } finally {
        setIsLoading(false)
      }
    }

    fetchOrderData()
  }, [id, toast])

  const handleStatusUpdate = async () => {
    if (!order) return;

    setIsUpdating(true)

    try {
      const response = await fetch(`/api/admin/orders/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ deliveryStatus }),
      })

      if (!response.ok) {
        throw new Error("배송 상태 업데이트에 실패했습니다")
      }

      const updatedOrder = await response.json()
      setOrder(updatedOrder)

      toast.success(
        order
          ? `주문 ${order.id}의 배송 상태가 '${deliveryStatus}'(으)로 변경되었습니다.`
          : `배송 상태가 '${deliveryStatus}'(으)로 변경되었습니다.`,
      )
    } catch (error) {
      console.error('배송 상태 업데이트 오류:', error)
      toast.error('배송 상태 업데이트에 실패했습니다.')
    } finally {
      setIsUpdating(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!order) {
    return (
      <div>
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="mb-4">
          <ArrowLeft className="h-5 w-5" />
          <span className="sr-only">뒤로 가기</span>
        </Button>
        <h1 className="text-2xl font-bold mb-4">주문을 찾을 수 없습니다</h1>
        <p>요청하신 주문 정보를 찾을 수 없습니다.</p>
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
          <h1 className="text-2xl font-bold">주문 상세 정보</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Printer className="h-4 w-4 mr-2" />
            인쇄
          </Button>
          <Button variant="outline">
            <Send className="h-4 w-4 mr-2" />
            이메일 발송
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>주문 정보</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">주문 번호</div>
                  <div>{order.id}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">주문 일자</div>
                  <div>{order.date}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">결제 상태</div>
                  <Badge variant={order.paymentStatus === "결제 완료" ? "default" : "destructive"}>
                    {order.paymentStatus}
                  </Badge>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">배송 상태</div>
                  <Badge
                    variant={
                      order.deliveryStatus === "배송 완료"
                        ? "default"
                        : order.deliveryStatus === "배송 중"
                          ? "secondary"
                          : order.deliveryStatus === "배송 준비 중"
                            ? "outline"
                            : "destructive"
                    }
                  >
                    {order.deliveryStatus}
                  </Badge>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">결제 방법</div>
                  <div>{order.paymentMethod}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>주문 상품</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {order.items.map((item) => (
                  <div key={item.id} className="flex justify-between items-center border-b pb-4">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 bg-muted rounded-md flex items-center justify-center">
                        <span className="text-xs text-muted-foreground">{item.id}</span>
                      </div>
                      <div>
                        <div className="font-medium">{item.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {item.price.toLocaleString()}원 x {item.quantity}개
                        </div>
                      </div>
                    </div>
                    <div className="font-medium">{(item.price * item.quantity).toLocaleString()}원</div>
                  </div>
                ))}
              </div>

              <div className="mt-6 space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">소계</span>
                  <span>{order.subtotal.toLocaleString()}원</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">배송비</span>
                  <span>{order.shipping === 0 ? "무료" : `${order.shipping.toLocaleString()}원`}</span>
                </div>
                <Separator className="my-2" />
                <div className="flex justify-between font-medium">
                  <span>총 결제 금액</span>
                  <span>{order.total.toLocaleString()}원</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>고객 정보</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">이름</div>
                  <div>{order.customer.name}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">이메일</div>
                  <div>{order.customer.email}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">전화번호</div>
                  <div>{order.customer.phone}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>배송 정보</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">배송지 주소</div>
                  <div>{order.shippingAddress}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>배송 상태 변경</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Select value={deliveryStatus} onValueChange={setDeliveryStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="배송 상태 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="결제 대기">결제 대기</SelectItem>
                    <SelectItem value="결제 완료">결제 완료</SelectItem>
                    <SelectItem value="배송 준비 중">배송 준비 중</SelectItem>
                    <SelectItem value="배송 중">배송 중</SelectItem>
                    <SelectItem value="배송 완료">배송 완료</SelectItem>
                    <SelectItem value="주문 취소">주문 취소</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  className="w-full"
                  onClick={handleStatusUpdate}
                  disabled={isUpdating || deliveryStatus === order.deliveryStatus}
                >
                  {isUpdating ? "처리 중..." : "상태 업데이트"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

