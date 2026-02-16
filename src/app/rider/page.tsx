"use client"
// =============================================================================
// 라이더 모바일 웹 - /rider
// fallback(internal) 모드에서 배정 주문 조회 + 현재 위치 전송을 수행합니다.
// =============================================================================

import { useCallback, useEffect, useRef, useState } from "react"
import { Navigation, RefreshCw, Smartphone } from "lucide-react"

import { useAuthStore } from "@/lib/store"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface RiderAssignment {
  id: number
  deliveryStatus: string | null
  shippingAddress: string | null
  shippingLat: number | null
  shippingLng: number | null
  riderLat: number | null
  riderLng: number | null
  riderUpdatedAt: string | null
  totalAmount: number
  createdAt: string
}

const SEND_INTERVAL_MS = 5000

/** 라이더 페이지는 한 번에 하나의 주문을 선택해 위치를 주기적으로 전송합니다. */
export default function RiderPage() {
  const { user, token, isHydrated } = useAuthStore()

  const [assignments, setAssignments] = useState<RiderAssignment[]>([])
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null)
  const [isTracking, setIsTracking] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastSentAt, setLastSentAt] = useState<string | null>(null)

  const watchIdRef = useRef<number | null>(null)
  const lastSentMsRef = useRef(0)

  const authHeaders: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {}

  const fetchAssignments = useCallback(async () => {
    if (!user) return
    setIsLoading(true)
    try {
      const response = await fetch("/api/rider/assignments?limit=20", {
        credentials: "include",
        headers: authHeaders,
        cache: "no-store",
      })
      if (!response.ok) throw new Error("배정 목록을 불러오지 못했습니다.")

      const data = (await response.json()) as {
        assignments: RiderAssignment[]
      }

      setAssignments(data.assignments ?? [])
      setError(null)

      if (selectedOrderId == null && data.assignments?.length) {
        setSelectedOrderId(data.assignments[0].id)
      }
    } catch (fetchError) {
      console.error("rider assignments fetch error:", fetchError)
      setError("배정 목록을 불러오지 못했습니다.")
    } finally {
      setIsLoading(false)
    }
  }, [authHeaders, selectedOrderId, user])

  const sendLocation = useCallback(
    async (lat: number, lng: number, accuracy: number | null) => {
      if (!selectedOrderId) return
      const now = Date.now()
      if (now - lastSentMsRef.current < SEND_INTERVAL_MS) return
      lastSentMsRef.current = now

      try {
        const response = await fetch("/api/rider/location", {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            ...authHeaders,
          },
          body: JSON.stringify({
            orderId: selectedOrderId,
            lat,
            lng,
            accuracy,
            source: "RIDER_PWA",
          }),
        })
        if (!response.ok) {
          const body = await response.json().catch(() => ({}))
          throw new Error(body?.error || "위치 전송 실패")
        }
        setLastSentAt(new Date().toLocaleTimeString("ko-KR"))
        setError(null)
      } catch (sendError) {
        console.error("rider location send error:", sendError)
        setError(sendError instanceof Error ? sendError.message : "위치 전송 실패")
      }
    },
    [authHeaders, selectedOrderId],
  )

  const startTracking = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setError("이 브라우저는 위치 기능을 지원하지 않습니다.")
      return
    }
    if (!selectedOrderId) {
      setError("먼저 주문을 선택해 주세요.")
      return
    }
    if (watchIdRef.current != null) return

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        void sendLocation(
          position.coords.latitude,
          position.coords.longitude,
          Number.isFinite(position.coords.accuracy) ? position.coords.accuracy : null,
        )
      },
      (geoError) => {
        setError(`위치 권한/수집 오류: ${geoError.message}`)
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 10000,
      },
    )

    setIsTracking(true)
  }, [selectedOrderId, sendLocation])

  const stopTracking = useCallback(() => {
    if (watchIdRef.current != null) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
    setIsTracking(false)
  }, [])

  useEffect(() => {
    if (!isHydrated || !user) return

    void fetchAssignments()
    const timer = window.setInterval(() => {
      void fetchAssignments()
    }, 15000)

    return () => {
      window.clearInterval(timer)
    }
  }, [fetchAssignments, isHydrated, user])

  useEffect(() => {
    return () => {
      if (watchIdRef.current != null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
      }
    }
  }, [])

  if (!isHydrated) {
    return <div className="p-6 text-sm text-muted-foreground">세션 확인 중...</div>
  }

  if (!user) {
    return <div className="p-6 text-sm text-muted-foreground">로그인 후 이용해 주세요.</div>
  }

  return (
    <div className="container mx-auto max-w-xl px-4 py-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Smartphone className="h-5 w-5" />
            라이더 위치 전송
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <Select
              value={selectedOrderId != null ? String(selectedOrderId) : ""}
              onValueChange={(value) => setSelectedOrderId(Number(value))}
            >
              <SelectTrigger>
                <SelectValue placeholder="주문 선택" />
              </SelectTrigger>
              <SelectContent>
                {assignments.map((assignment) => (
                  <SelectItem key={assignment.id} value={String(assignment.id)}>
                    주문 #{assignment.id} ({assignment.deliveryStatus ?? "-"})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={() => void fetchAssignments()} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button onClick={startTracking} disabled={isTracking || selectedOrderId == null}>
              <Navigation className="mr-2 h-4 w-4" />
              전송 시작
            </Button>
            <Button variant="outline" onClick={stopTracking} disabled={!isTracking}>
              전송 중지
            </Button>
          </div>

          <div className="rounded-lg border p-3 text-sm">
            <p>추적 상태: {isTracking ? "동작 중" : "중지"}</p>
            <p>마지막 전송: {lastSentAt ?? "-"}</p>
            <p>배정 수: {assignments.length}건</p>
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </CardContent>
      </Card>
    </div>
  )
}
