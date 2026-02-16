"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { Bike, Store } from "lucide-react"

import { NaverDeliveryMap } from "@/components/naver-delivery-map"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getDeliveryStatusLabel } from "@/lib/deliveryStatus"
import type { DeliveryStatus } from "@/lib/orderEnums"
import { useAuthStore } from "@/lib/store"

interface ActiveDeliveryOrder {
  id: number
  status: string
  deliveryStatus: DeliveryStatus | null
  deliveryProvider: string | null
  courierCode: string | null
  trackingNumber: string | null
  trackingUrl: string | null
  externalDeliveryStatus: string | null
  externalTrackingId: string | null
  riderLastSeenAt: string | null
  shippingAddress: string | null
  shippingLat: number | null
  shippingLng: number | null
  riderLat: number | null
  riderLng: number | null
  riderUpdatedAt: string | null
}

const POLLING_INTERVAL_MS = 15000

/**
 * 메인 화면 배송 섹션입니다.
 * 로그인 사용자의 진행 중 주문 1건을 주기적으로 갱신해서 지도에 보여줍니다.
 */
export function HomeDeliveryMapSection() {
  const { user, token, isHydrated } = useAuthStore()
  const [activeOrder, setActiveOrder] = useState<ActiveDeliveryOrder | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const storeLat = Number(process.env.NEXT_PUBLIC_STORE_LAT ?? "37.480783")
  const storeLng = Number(process.env.NEXT_PUBLIC_STORE_LNG ?? "126.897110")

  const hasTrackableOrder =
    activeOrder?.shippingLat != null && activeOrder?.shippingLng != null
  const shippingLat = hasTrackableOrder
    ? (activeOrder?.shippingLat ?? storeLat)
    : storeLat
  const shippingLng = hasTrackableOrder
    ? (activeOrder?.shippingLng ?? storeLng)
    : storeLng

  const fetchActiveOrder = useCallback(async () => {
    if (!user) {
      setActiveOrder(null)
      setError(null)
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch("/api/user/orders/active-delivery", {
        method: "GET",
        credentials: "include",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        cache: "no-store",
      })

      if (response.status === 401) {
        setActiveOrder(null)
        setError(null)
        return
      }
      if (!response.ok) {
        throw new Error("진행 중 배송 정보를 불러오지 못했습니다.")
      }

      const data = (await response.json()) as { order: ActiveDeliveryOrder | null }
      setActiveOrder(data.order ?? null)
      setError(null)
    } catch (fetchError) {
      console.error("active-delivery fetch error:", fetchError)
      setError("실시간 배송 정보를 갱신하지 못했습니다.")
    } finally {
      setIsLoading(false)
    }
  }, [token, user])

  useEffect(() => {
    if (!isHydrated) return
    if (!user) {
      setActiveOrder(null)
      setError(null)
      return
    }

    void fetchActiveOrder()
    const timer = window.setInterval(() => {
      void fetchActiveOrder()
    }, POLLING_INTERVAL_MS)

    return () => window.clearInterval(timer)
  }, [fetchActiveOrder, isHydrated, user])

  return (
    <section className="border-y bg-gradient-to-b from-background to-muted/30 py-10">
      <div className="container mx-auto px-4">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Delivery Live
            </p>
            <h2 className="mt-1 text-2xl font-bold md:text-3xl">매장 및 배송 현황</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              진행 중인 배송 주문이 있으면 지도와 추적 정보를 함께 표시합니다.
            </p>
          </div>

          <Button variant="outline" asChild>
            <Link href={user ? "/account" : "/login"}>
              {user ? "내 주문 보기" : "로그인"}
            </Link>
          </Button>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Store className="h-4 w-4" />
                매장 중심 지도
              </CardTitle>

              {activeOrder?.deliveryStatus ? (
                <Badge variant="secondary" className="inline-flex items-center gap-1">
                  <Bike className="h-3.5 w-3.5" />
                  {getDeliveryStatusLabel(activeOrder.deliveryStatus)}
                </Badge>
              ) : (
                <Badge variant="outline">일반 지도</Badge>
              )}
            </div>
          </CardHeader>

          <CardContent className="space-y-3">
            <NaverDeliveryMap
              shippingLat={shippingLat}
              shippingLng={shippingLng}
              shippingAddress={
                hasTrackableOrder
                  ? activeOrder?.shippingAddress
                  : "진행 중인 주문이 없으면 매장 위치만 표시됩니다."
              }
              storeLat={storeLat}
              storeLng={storeLng}
              storeLabel="매장"
              customerLabel={hasTrackableOrder ? "배송지" : "매장 기준"}
              riderLat={hasTrackableOrder ? activeOrder?.riderLat : null}
              riderLng={hasTrackableOrder ? activeOrder?.riderLng : null}
              deliveryStatus={activeOrder?.deliveryStatus ?? null}
              riderLabel="라이더"
              heightClassName="h-[280px] md:h-[320px]"
            />

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              {!user ? (
                <span>로그인하면 진행 중인 주문의 배송 상태를 확인할 수 있습니다.</span>
              ) : hasTrackableOrder ? (
                <span>주문 #{activeOrder?.id} 배송 추적 중</span>
              ) : (
                <span>현재 진행 중인 배송 주문이 없습니다.</span>
              )}

              {activeOrder?.trackingNumber ? (
                <span>운송장: {activeOrder.trackingNumber}</span>
              ) : null}
              {activeOrder?.externalDeliveryStatus ? (
                <span>외부 상태: {activeOrder.externalDeliveryStatus}</span>
              ) : null}
              {activeOrder?.riderLastSeenAt ? (
                <span>
                  라이더 갱신: {new Date(activeOrder.riderLastSeenAt).toLocaleTimeString("ko-KR")}
                </span>
              ) : null}
              {isLoading ? <span>업데이트 중...</span> : null}
              {error ? <span className="text-destructive">{error}</span> : null}
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  )
}
