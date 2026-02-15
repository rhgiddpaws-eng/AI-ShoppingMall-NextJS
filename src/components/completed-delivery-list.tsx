"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { CheckCircle2, Truck } from "lucide-react"

import { useAuthStore } from "@/lib/store"
import { getDeliveryStatusLabel } from "@/lib/deliveryStatus"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

interface CompletedDeliveryOrder {
  id: number
  totalAmount: number
  deliveryStatus: string | null
  deliveryProvider: string | null
  externalDeliveryStatus: string | null
  courierCode: string | null
  trackingNumber: string | null
  trackingUrl: string | null
  deliveredAt: string | null
  shippingAddress: string | null
  createdAt: string
}

/** 배송 완료 목록을 별도 섹션으로 분리해 진행중 배송과 구분해서 보여줍니다. */
export function CompletedDeliveryList() {
  const { user, token, isHydrated } = useAuthStore()
  const [orders, setOrders] = useState<CompletedDeliveryOrder[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isHydrated || !user) return

    let mounted = true
    const run = async () => {
      setIsLoading(true)
      try {
        const response = await fetch("/api/user/orders/completed-deliveries?limit=12", {
          credentials: "include",
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          cache: "no-store",
        })
        if (!response.ok) throw new Error("배송 완료 목록을 불러오지 못했습니다.")
        const data = (await response.json()) as { orders: CompletedDeliveryOrder[] }
        if (mounted) {
          setOrders(data.orders ?? [])
          setError(null)
        }
      } catch (fetchError) {
        console.error("completed-deliveries fetch error:", fetchError)
        if (mounted) setError("배송 완료 목록을 불러오지 못했습니다.")
      } finally {
        if (mounted) setIsLoading(false)
      }
    }

    void run()
    return () => {
      mounted = false
    }
  }, [isHydrated, token, user])

  if (!isHydrated || !user) return null

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          배송 완료 목록
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? <p className="text-sm text-muted-foreground">불러오는 중...</p> : null}
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        {!isLoading && !error && orders.length === 0 ? (
          <p className="text-sm text-muted-foreground">배송 완료된 주문이 아직 없습니다.</p>
        ) : null}
        {orders.map((order) => (
          <div key={order.id} className="rounded-lg border p-3">
            <div className="mb-2 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">주문 #{order.id}</p>
                <p className="text-xs text-muted-foreground">
                  완료 시각: {order.deliveredAt ? new Date(order.deliveredAt).toLocaleString("ko-KR") : "-"}
                </p>
              </div>
              <Badge variant="secondary">{getDeliveryStatusLabel(order.deliveryStatus)}</Badge>
            </div>
            <div className="space-y-1 text-xs text-muted-foreground">
              <p>
                <Truck className="mr-1 inline h-3.5 w-3.5" />
                {order.deliveryProvider ?? "-"} / {order.courierCode ?? "-"}
              </p>
              <p>송장번호: {order.trackingNumber ?? "-"}</p>
              <p className="break-words">주소: {order.shippingAddress ?? "-"}</p>
              <p>결제금액: {order.totalAmount.toLocaleString()}원</p>
            </div>
            {order.trackingUrl ? (
              <Button variant="outline" size="sm" className="mt-3" asChild>
                <Link href={order.trackingUrl} target="_blank">
                  배송 조회
                </Link>
              </Button>
            ) : null}
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
