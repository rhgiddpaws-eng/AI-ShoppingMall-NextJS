"use client"
// =============================================================================
// 관리자 주문 상세 - /admin/orders/[id]
// 주문 정보·상품·고객·배송지·배달 상태 변경(PUT) + 지도 placeholder
// =============================================================================

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, Printer, Send, MapPin } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import { DELIVERY_STATUS_LABELS, DELIVERY_STATUS_LIST, getDeliveryStatusLabel } from "@/lib/deliveryStatus"
import { useAuthStore } from "@/lib/store"

interface OrderItemType {
  id: number
  quantity: number
  price: number
  product: { id: number; name: string; price: number; imageSrc?: string }
}

interface Order {
  id: number
  createdAt: string
  totalAmount: number
  status: string
  deliveryStatus: string | null
  shippingAddress: string | null
  shippingLat: number | null
  shippingLng: number | null
  user: { id: number; name: string | null; email: string }
  items: OrderItemType[]
  payment: { paymentMethod: string; amount: number } | null
}

/** 주문 상세: ID로 API 조회 후 정보·상품·고객·배송지·배송 상태 변경 폼 표시 */
export default function OrderDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [order, setOrder] = useState<Order | null>(null)
  const [deliveryStatus, setDeliveryStatus] = useState<string>("ORDER_COMPLETE")
  const [isLoading, setIsLoading] = useState(true)
  const [isUpdating, setIsUpdating] = useState(false)
  const token = useAuthStore((s) => s.token)

  const authHeaders: HeadersInit = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }

  useEffect(() => {
    const fetchOrderData = async () => {
      try {
        const response = await fetch(`/api/admin/orders/${id}`, { credentials: "include", headers: authHeaders })
        if (!response.ok) throw new Error("주문 데이터를 불러오는데 실패했습니다")
        const data = await response.json()
        setOrder(data)
        setDeliveryStatus(data.deliveryStatus ?? "ORDER_COMPLETE")
      } catch (error) {
        console.error("주문 데이터 로딩 오류:", error)
        toast.error("주문 정보를 불러올 수 없습니다.")
      } finally {
        setIsLoading(false)
      }
    }
    fetchOrderData()
  }, [id])

  const handleStatusUpdate = async () => {
    if (!order) return
    setIsUpdating(true)
    try {
      const response = await fetch(`/api/admin/orders/${id}`, {
        method: "PUT",
        credentials: "include",
        headers: authHeaders,
        body: JSON.stringify({ deliveryStatus }),
      })
      if (!response.ok) throw new Error("배송 상태 업데이트에 실패했습니다")
      const updatedOrder = await response.json()
      setOrder(updatedOrder)
      toast.success(`주문 #${order.id} 배송 상태가 '${getDeliveryStatusLabel(deliveryStatus)}'(으)로 변경되었습니다.`)
    } catch (error) {
      console.error("배송 상태 업데이트 오류:", error)
      toast.error("배송 상태 업데이트에 실패했습니다.")
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
                  <div>#{order.id}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">주문 일자</div>
                  <div>{new Date(order.createdAt).toLocaleDateString("ko-KR")}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">결제 상태</div>
                  <Badge variant={order.status === "PAID" ? "default" : "secondary"}>{order.status}</Badge>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">배송 상태</div>
                  <Badge variant={order.deliveryStatus === "DELIVERED" ? "default" : "secondary"}>
                    {getDeliveryStatusLabel(order.deliveryStatus)}
                  </Badge>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">결제 방법</div>
                  <div>{order.payment?.paymentMethod ?? "—"}</div>
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
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="w-16 h-16 bg-muted rounded-md flex items-center justify-center shrink-0">
                        {item.product.imageSrc ? (
                          <img src={item.product.imageSrc} alt="" className="w-full h-full object-cover rounded-md" />
                        ) : (
                          <span className="text-xs text-muted-foreground">#{item.product.id}</span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium truncate">{item.product.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {Number(item.price).toLocaleString()}원 x {item.quantity}개
                        </div>
                      </div>
                    </div>
                    <div className="font-medium shrink-0">{(Number(item.price) * item.quantity).toLocaleString()}원</div>
                  </div>
                ))}
              </div>
              <div className="mt-6 space-y-2">
                <Separator className="my-2" />
                <div className="flex justify-between font-medium">
                  <span>총 결제 금액</span>
                  <span>{Number(order.totalAmount).toLocaleString()}원</span>
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
                  <div>{order.user.name ?? "—"}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">이메일</div>
                  <div className="break-all">{order.user.email}</div>
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
                  <div className="break-words">{order.shippingAddress ?? "—"}</div>
                </div>
                {(order.shippingLat != null && order.shippingLng != null) && (
                  <div className="mt-2 rounded-lg border bg-muted/30 p-4 flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4 shrink-0" />
                    <span>위도 {order.shippingLat.toFixed(5)}, 경도 {order.shippingLng.toFixed(5)} (네이버 지도 연동 시 표시)</span>
                  </div>
                )}
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
                    {DELIVERY_STATUS_LIST.map((s) => (
                      <SelectItem key={s} value={s}>
                        {DELIVERY_STATUS_LABELS[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  className="w-full"
                  onClick={handleStatusUpdate}
                  disabled={isUpdating || deliveryStatus === (order.deliveryStatus ?? "ORDER_COMPLETE")}
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

