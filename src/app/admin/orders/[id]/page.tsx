"use client"
// =============================================================================
// 관리자 주문 상세 - /admin/orders/[id]
// 배차 요청/상태 시뮬레이션/수동 좌표 입력을 한 화면에서 관리합니다.
// =============================================================================

import { useCallback, useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, RefreshCw, Send } from "lucide-react"
import { toast } from "sonner"

import { useAuthStore } from "@/lib/store"
import { DELIVERY_STATUS_LIST, getDeliveryStatusLabel } from "@/lib/deliveryStatus"
import { DeliveryProvider, type DeliveryStatus } from "@/lib/orderEnums"
import { NaverDeliveryMap } from "@/components/naver-delivery-map"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface OrderItemType {
  id: number
  quantity: number
  price: number
  product: { id: number; name: string; price: number; imageSrc?: string }
}

interface AdminOrderDetail {
  id: number
  createdAt: string
  totalAmount: number
  status: string
  deliveryStatus: string | null
  deliveryProvider: string | null
  externalDeliveryId: string | null
  externalDeliveryStatus: string | null
  courierCode: string | null
  trackingNumber: string | null
  trackingUrl: string | null
  dispatchedAt: string | null
  deliveredAt: string | null
  shippingAddress: string | null
  shippingLat: number | null
  shippingLng: number | null
  riderLat: number | null
  riderLng: number | null
  riderUpdatedAt: string | null
  user: { id: number; name: string | null; email: string }
  items: OrderItemType[]
  payment: { paymentMethod: string; amount: number; status: string } | null
}

const PROVIDER_OPTIONS = [
  DeliveryProvider.MOCK,
  DeliveryProvider.KAKAO,
  DeliveryProvider.BAROGO,
  DeliveryProvider.VROONG,
  DeliveryProvider.THINKING,
  DeliveryProvider.INTERNAL,
] as const

const TEST_DEFAULT_COURIER_CODE = "04"
const TEST_TRACKING_PREFIX = "TEST"

/** 상세 페이지는 주문 필드를 하나의 상태로 받아 폼 입력과 동기화합니다. */
export default function OrderDetailPage() {
  const params = useParams()
  const router = useRouter()
  const token = useAuthStore((s) => s.token)
  const id = Number(params.id as string)

  const [order, setOrder] = useState<AdminOrderDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isDispatching, setIsDispatching] = useState(false)
  const [isSimulatingStatus, setIsSimulatingStatus] = useState(false)

  const [deliveryStatus, setDeliveryStatus] = useState<string>("ORDER_COMPLETE")
  const [deliveryProvider, setDeliveryProvider] = useState<string>(DeliveryProvider.MOCK)
  const [courierCode, setCourierCode] = useState("")
  const [trackingNumber, setTrackingNumber] = useState("")
  const [trackingUrl, setTrackingUrl] = useState("")
  const [riderLatInput, setRiderLatInput] = useState("")
  const [riderLngInput, setRiderLngInput] = useState("")

  const storeLat = Number(process.env.NEXT_PUBLIC_STORE_LAT ?? "37.480783")
  const storeLng = Number(process.env.NEXT_PUBLIC_STORE_LNG ?? "126.897110")

  const authHeaders: HeadersInit = useMemo(
    () => ({
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    }),
    [token],
  )

  const hydrateForm = (data: AdminOrderDetail) => {
    setDeliveryStatus(data.deliveryStatus ?? "ORDER_COMPLETE")
    setDeliveryProvider(data.deliveryProvider ?? DeliveryProvider.MOCK)
    setCourierCode(data.courierCode ?? "")
    setTrackingNumber(data.trackingNumber ?? "")
    setTrackingUrl(data.trackingUrl ?? "")
    setRiderLatInput(data.riderLat != null ? String(data.riderLat) : "")
    setRiderLngInput(data.riderLng != null ? String(data.riderLng) : "")
  }

  // 모든 갱신 경로에서 같은 조회 로직을 재사용해 상태 불일치를 줄입니다.
  const fetchOrderDetail = useCallback(
    async (showLoading = false): Promise<AdminOrderDetail | null> => {
      if (!Number.isInteger(id)) return null
      if (showLoading) setIsLoading(true)

      try {
        const response = await fetch(`/api/admin/orders/${id}`, {
          credentials: "include",
          headers: authHeaders,
          cache: "no-store",
        })
        if (!response.ok) throw new Error("주문 정보를 불러오지 못했습니다.")

        const data = (await response.json()) as AdminOrderDetail
        setOrder(data)
        hydrateForm(data)
        return data
      } catch (error) {
        console.error("주문 상세 조회 실패:", error)
        toast.error("주문 정보를 불러오지 못했습니다.")
        return null
      } finally {
        if (showLoading) setIsLoading(false)
      }
    },
    [authHeaders, id],
  )

  useEffect(() => {
    if (!Number.isInteger(id)) {
      setIsLoading(false)
      return
    }
    void fetchOrderDetail(true)
  }, [fetchOrderDetail, id])

  const handleSave = async () => {
    if (!order) return

    const riderLat = riderLatInput.trim() ? Number(riderLatInput.trim()) : null
    const riderLng = riderLngInput.trim() ? Number(riderLngInput.trim()) : null

    if ((riderLat !== null && !Number.isFinite(riderLat)) || (riderLng !== null && !Number.isFinite(riderLng))) {
      toast.error("라이더 좌표는 숫자로 입력해 주세요.")
      return
    }

    setIsSaving(true)
    try {
      const response = await fetch(`/api/admin/orders/${id}`, {
        method: "PUT",
        credentials: "include",
        headers: authHeaders,
        body: JSON.stringify({
          deliveryStatus,
          deliveryProvider,
          courierCode: courierCode.trim() || null,
          trackingNumber: trackingNumber.trim() || null,
          trackingUrl: trackingUrl.trim() || null,
          riderLat,
          riderLng,
        }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(data?.error || "주문 저장에 실패했습니다.")
      }

      setOrder(data as AdminOrderDetail)
      hydrateForm(data as AdminOrderDetail)
      toast.success(`주문 #${id} 정보를 저장했습니다.`)
    } catch (error) {
      console.error("주문 저장 실패:", error)
      toast.error(error instanceof Error ? error.message : "주문 저장에 실패했습니다.")
    } finally {
      setIsSaving(false)
    }
  }

  const handleDispatch = async () => {
    if (!order) return
    setIsDispatching(true)

    try {
      // 테스트 중 입력칸이 비어 있어도 바로 배차를 확인할 수 있게 기본 문자열을 자동 채웁니다.
      const resolvedCourierCode = courierCode.trim() || TEST_DEFAULT_COURIER_CODE
      const resolvedTrackingNumber =
        trackingNumber.trim() || `${TEST_TRACKING_PREFIX}-${id}-${Date.now().toString().slice(-6)}`
      const hasAutoFilledText = !courierCode.trim() || !trackingNumber.trim()
      if (hasAutoFilledText) {
        setCourierCode(resolvedCourierCode)
        setTrackingNumber(resolvedTrackingNumber)
        toast.info("입력 글자가 비어 있어 테스트 기본값을 자동으로 채워 배차합니다.")
      }

      const response = await fetch(`/api/admin/orders/${id}/dispatch`, {
        method: "POST",
        credentials: "include",
        headers: authHeaders,
        // 배차 시점의 입력값을 함께 보내 즉시 최신 값으로 처리되게 합니다.
        body: JSON.stringify({
          courierCode: resolvedCourierCode,
          trackingNumber: resolvedTrackingNumber,
        }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(data?.error || "배차 요청에 실패했습니다.")
      }

      await fetchOrderDetail()
      toast.success(data?.message ?? `주문 #${id} 배차 요청을 전송했습니다.`)
    } catch (error) {
      console.error("배차 요청 실패:", error)
      toast.error(error instanceof Error ? error.message : "배차 요청에 실패했습니다.")
    } finally {
      setIsDispatching(false)
    }
  }

  const handleSimulateStatus = async () => {
    if (!order) return
    setIsSimulatingStatus(true)

    try {
      const response = await fetch(`/api/admin/orders/${id}/simulate-status`, {
        method: "POST",
        credentials: "include",
        headers: authHeaders,
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(data?.error || "상태 시뮬레이션에 실패했습니다.")
      }

      // 시뮬레이션 직후 다시 조회해 지도 좌표/상태를 최신값으로 맞춥니다.
      await fetchOrderDetail()
      toast.success(data?.message ?? `주문 #${id} 상태를 시뮬레이션으로 갱신했습니다.`)
    } catch (error) {
      console.error("상태 시뮬레이션 실패:", error)
      toast.error(error instanceof Error ? error.message : "상태 시뮬레이션에 실패했습니다.")
    } finally {
      setIsSimulatingStatus(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-primary" />
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
        <h1 className="mb-4 text-2xl font-bold">주문을 찾을 수 없습니다.</h1>
      </div>
    )
  }

  const hasShippingCoordinates = order.shippingLat != null && order.shippingLng != null
  const resolvedShippingLat = order.shippingLat ?? storeLat
  const resolvedShippingLng = order.shippingLng ?? storeLng

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="mr-2">
            <ArrowLeft className="h-5 w-5" />
            <span className="sr-only">뒤로 가기</span>
          </Button>
          <h1 className="text-2xl font-bold">주문 상세 #{order.id}</h1>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleDispatch} disabled={isDispatching}>
            <Send className="mr-2 h-4 w-4" />
            {isDispatching ? "배차 요청 중..." : "배차 요청"}
          </Button>
          {/* 실배송 없이 외부 상태 이벤트를 만든 뒤 내부 상태를 한 단계씩 진행하는 테스트 버튼입니다. */}
          <Button variant="secondary" onClick={handleSimulateStatus} disabled={isSimulatingStatus}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isSimulatingStatus ? "animate-spin" : ""}`} />
            {isSimulatingStatus ? "상태 갱신 중..." : "상태 새로 고침(시뮬레이션)"}
          </Button>
          <Button variant="outline" onClick={handleSave} disabled={isSaving}>
            {isSaving ? "저장 중..." : "저장"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="space-y-6 md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>주문 정보</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="mb-1 text-sm font-medium text-muted-foreground">주문일</div>
                  <div>{new Date(order.createdAt).toLocaleString("ko-KR")}</div>
                </div>
                <div>
                  <div className="mb-1 text-sm font-medium text-muted-foreground">결제 상태</div>
                  <Badge variant={order.status === "PAID" ? "default" : "secondary"}>{order.status}</Badge>
                </div>
                <div>
                  <div className="mb-1 text-sm font-medium text-muted-foreground">배송 상태</div>
                  <Badge variant={order.deliveryStatus === "DELIVERED" ? "default" : "secondary"}>
                    {getDeliveryStatusLabel(order.deliveryStatus)}
                  </Badge>
                </div>
                <div>
                  <div className="mb-1 text-sm font-medium text-muted-foreground">결제 수단</div>
                  <div>{order.payment?.paymentMethod ?? "-"}</div>
                </div>
                <div>
                  <div className="mb-1 text-sm font-medium text-muted-foreground">외부 상태</div>
                  <div>{order.externalDeliveryStatus ?? "-"}</div>
                </div>
                <div>
                  <div className="mb-1 text-sm font-medium text-muted-foreground">외부 배송 ID</div>
                  <div className="break-all text-sm">{order.externalDeliveryId ?? "-"}</div>
                </div>
                <div>
                  <div className="mb-1 text-sm font-medium text-muted-foreground">배차 시각</div>
                  <div>{order.dispatchedAt ? new Date(order.dispatchedAt).toLocaleString("ko-KR") : "-"}</div>
                </div>
                <div>
                  <div className="mb-1 text-sm font-medium text-muted-foreground">배송 완료 시각</div>
                  <div>{order.deliveredAt ? new Date(order.deliveredAt).toLocaleString("ko-KR") : "-"}</div>
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
                  <div key={item.id} className="flex items-center justify-between border-b pb-4">
                    <div className="min-w-0">
                      <div className="truncate font-medium">{item.product.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {Number(item.price).toLocaleString()}원 x {item.quantity}개
                      </div>
                    </div>
                    <div className="shrink-0 font-medium">
                      {(Number(item.price) * item.quantity).toLocaleString()}원
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-6 space-y-2">
                <Separator />
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
            <CardContent className="space-y-4">
              <div>
                <div className="mb-1 text-sm font-medium text-muted-foreground">이름</div>
                <div>{order.user.name ?? "-"}</div>
              </div>
              <div>
                <div className="mb-1 text-sm font-medium text-muted-foreground">이메일</div>
                <div className="break-all">{order.user.email}</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>배송 정보</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="mb-1 text-sm font-medium text-muted-foreground">배송 주소</div>
                <div className="break-words">{order.shippingAddress ?? "-"}</div>
              </div>
              {!hasShippingCoordinates ? (
                // 좌표가 비어도 관리자 화면에서 추적 흐름이 끊기지 않도록 폴백 안내를 보여 줍니다.
                <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                  배송지 좌표를 아직 확보하지 못해 매장 기준 폴백 지도를 표시합니다.
                </p>
              ) : null}
              <NaverDeliveryMap
                shippingLat={resolvedShippingLat}
                shippingLng={resolvedShippingLng}
                shippingAddress={order.shippingAddress}
                storeLat={storeLat}
                storeLng={storeLng}
                // 요청 의도에 맞춰 출발/도착 지점을 내 위치/상대방 주소로 명확히 표시합니다.
                storeLabel="내 위치"
                customerLabel={hasShippingCoordinates ? "상대방 주소" : "상대방 좌표 확인중"}
                riderLat={order.riderLat}
                riderLng={order.riderLng}
                deliveryStatus={order.deliveryStatus as DeliveryStatus | null}
                riderLabel="배송 물건"
                heightClassName="h-72"
              />
              {order.riderUpdatedAt ? (
                <p className="text-xs text-muted-foreground">
                  라이더 좌표 갱신: {new Date(order.riderUpdatedAt).toLocaleString("ko-KR")}
                </p>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>배송/배달 설정</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>배송 상태</Label>
                <Select value={deliveryStatus} onValueChange={setDeliveryStatus}>
                  <SelectTrigger>
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
              </div>

              <div className="space-y-2">
                <Label>공급자</Label>
                <Select value={deliveryProvider} onValueChange={setDeliveryProvider}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PROVIDER_OPTIONS.map((provider) => (
                      <SelectItem key={provider} value={provider}>
                        {provider}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="courier-code">택배사 코드</Label>
                <Input
                  id="courier-code"
                  placeholder="예: CJ, HANJIN"
                  value={courierCode}
                  onChange={(event) => setCourierCode(event.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tracking-number">송장번호</Label>
                <Input
                  id="tracking-number"
                  placeholder="송장번호 입력"
                  value={trackingNumber}
                  onChange={(event) => setTrackingNumber(event.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tracking-url">배송 조회 URL</Label>
                <Input
                  id="tracking-url"
                  placeholder="https://..."
                  value={trackingUrl}
                  onChange={(event) => setTrackingUrl(event.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="rider-lat">라이더 위도</Label>
                  <Input
                    id="rider-lat"
                    inputMode="decimal"
                    placeholder="37.480783"
                    value={riderLatInput}
                    onChange={(event) => setRiderLatInput(event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rider-lng">라이더 경도</Label>
                  <Input
                    id="rider-lng"
                    inputMode="decimal"
                    placeholder="126.897110"
                    value={riderLngInput}
                    onChange={(event) => setRiderLngInput(event.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
