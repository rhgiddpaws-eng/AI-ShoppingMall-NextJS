"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Script from "next/script"
import { Bike, MapPin, Navigation } from "lucide-react"
import type { DeliveryStatus } from "@/lib/orderEnums"
import { getDeliveryStatusLabel } from "@/lib/deliveryStatus"

type RoutePoint = { lat: number; lng: number }
type OverlayInstance = { setMap: (map: unknown | null) => void }
type MarkerInstance = OverlayInstance & { setPosition: (position: unknown) => void }

// 지도 오버레이 정리 단계에서 공통으로 필요한 최소 메서드만 타입으로 고정합니다.
type InfoWindowInstance = {
  close: () => void
  getMap: () => unknown
  open: (map: unknown, anchor: unknown) => void
  setMap: (map: unknown | null) => void
}
type EventListenerHandle = unknown

declare global {
  interface Window {
    naver?: {
      maps: {
        Map: new (
          el: HTMLElement,
          options: Record<string, unknown>,
        ) => { fitBounds: (bounds: unknown) => void }
        Marker: new (options: Record<string, unknown>) => MarkerInstance
        Polyline: new (options: Record<string, unknown>) => OverlayInstance
        InfoWindow: new (options: Record<string, unknown>) => InfoWindowInstance
        LatLng: new (lat: number, lng: number) => unknown
        LatLngBounds: new () => { extend: (latlng: unknown) => void }
        Event: {
          addListener: (
            target: unknown,
            eventName: string,
            listener: (...args: unknown[]) => void,
          ) => EventListenerHandle
          removeListener?: (listener: EventListenerHandle) => void
        }
      }
    }
  }
}

interface NaverDeliveryMapProps {
  shippingLat: number
  shippingLng: number
  shippingAddress?: string | null
  storeLat?: number
  storeLng?: number
  riderLat?: number | null
  riderLng?: number | null
  deliveryStatus?: DeliveryStatus | null
  storeLabel?: string
  customerLabel?: string
  riderLabel?: string
  heightClassName?: string
}

const DEFAULT_STORE_LAT = 37.480783
const DEFAULT_STORE_LNG = 126.89711
// 준비/배송중/도착중/배송완료 단계까지 물건 마커를 유지해 출발-도착 흐름을 끊기지 않게 보여 줍니다.
const TRACKING_STATUSES: DeliveryStatus[] = ["PREPARING", "IN_DELIVERY", "ARRIVING", "DELIVERED"]

const isFiniteNumber = (value: number | null | undefined): value is number =>
  typeof value === "number" && Number.isFinite(value)

const isSamePoint = (a: RoutePoint, b: RoutePoint) => {
  const epsilon = 0.000001
  return Math.abs(a.lat - b.lat) < epsilon && Math.abs(a.lng - b.lng) < epsilon
}

const getPointDistance = (start: RoutePoint, end: RoutePoint) => {
  const latDiff = end.lat - start.lat
  const lngDiff = end.lng - start.lng
  return Math.sqrt(latDiff * latDiff + lngDiff * lngDiff)
}

function getPointOnPath(path: RoutePoint[], progress: number): RoutePoint {
  if (path.length === 0) return { lat: DEFAULT_STORE_LAT, lng: DEFAULT_STORE_LNG }
  if (path.length === 1) return path[0]
  if (progress <= 0) return path[0]
  if (progress >= 1) return path[path.length - 1]

  const segmentLengths: number[] = []
  let totalLength = 0
  for (let index = 0; index < path.length - 1; index += 1) {
    const segmentLength = getPointDistance(path[index], path[index + 1])
    segmentLengths.push(segmentLength)
    totalLength += segmentLength
  }
  if (totalLength <= 0) return path[path.length - 1]

  const targetLength = totalLength * progress
  let accumulatedLength = 0
  for (let index = 0; index < segmentLengths.length; index += 1) {
    const segmentLength = segmentLengths[index]
    const nextAccumulated = accumulatedLength + segmentLength
    if (targetLength <= nextAccumulated || index === segmentLengths.length - 1) {
      const ratio =
        segmentLength <= 0 ? 1 : (targetLength - accumulatedLength) / segmentLength
      const startPoint = path[index]
      const endPoint = path[index + 1]
      return {
        lat: startPoint.lat + (endPoint.lat - startPoint.lat) * ratio,
        lng: startPoint.lng + (endPoint.lng - startPoint.lng) * ratio,
      }
    }
    accumulatedLength = nextAccumulated
  }

  return path[path.length - 1]
}

async function fetchRoadRoute(start: RoutePoint, goal: RoutePoint): Promise<RoutePoint[] | null> {
  const params = new URLSearchParams({
    startLat: start.lat.toString(),
    startLng: start.lng.toString(),
    goalLat: goal.lat.toString(),
    goalLng: goal.lng.toString(),
  })
  const response = await fetch(`/api/naver/directions?${params.toString()}`, {
    cache: "no-store",
  })

  if (!response.ok) return null
  const data = (await response.json()) as { path?: RoutePoint[] }
  if (!Array.isArray(data.path) || data.path.length < 2) return null

  return data.path
}

export function NaverDeliveryMap({
  shippingLat,
  shippingLng,
  shippingAddress,
  storeLat,
  storeLng,
  riderLat,
  riderLng,
  deliveryStatus,
  storeLabel = "내 위치",
  customerLabel = "상대방 주소",
  riderLabel = "배송 물건",
  heightClassName = "h-64",
}: NaverDeliveryMapProps) {
  const mapRef = useRef<HTMLDivElement | null>(null)
  // 이전 좌표를 기억해 다음 갱신에서 마커 이동 애니메이션 시작점으로 사용합니다.
  const previousRiderPointRef = useRef<RoutePoint | null>(null)
  const [clientId, setClientId] = useState("")
  const [isClientIdLoaded, setIsClientIdLoaded] = useState(false)
  const [isReady, setIsReady] = useState(false)
  const [roadRouteEnabled, setRoadRouteEnabled] = useState(true)

  const hasClientId = clientId.trim().length > 0

  const resolvedStoreLat = Number.isFinite(storeLat) ? Number(storeLat) : DEFAULT_STORE_LAT
  const resolvedStoreLng = Number.isFinite(storeLng) ? Number(storeLng) : DEFAULT_STORE_LNG

  const riderPoint = useMemo<RoutePoint | null>(() => {
    const shouldTrack = !!deliveryStatus && TRACKING_STATUSES.includes(deliveryStatus)
    if (!shouldTrack || !isFiniteNumber(riderLat) || !isFiniteNumber(riderLng)) {
      return null
    }
    return { lat: riderLat, lng: riderLng }
  }, [deliveryStatus, riderLat, riderLng])

  useEffect(() => {
    // 주문 목적지가 바뀌면 이전 주문 좌표가 섞이지 않도록 시작점을 초기화합니다.
    previousRiderPointRef.current = null
  }, [shippingLat, shippingLng])

  // 통합 콘솔에서 발급한 Maps 키는 ncpKeyId 파라미터로 로드해야 인증 실패를 줄일 수 있습니다.
  const scriptSrc = useMemo(
    () => `https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${encodeURIComponent(clientId)}`,
    [clientId],
  )

  useEffect(() => {
    let cancelled = false

    const loadClientId = async () => {
      try {
        const response = await fetch("/api/naver/client-id", { cache: "no-store" })
        if (!response.ok) return

        const data = (await response.json()) as { clientId?: string }
        if (!cancelled && typeof data.clientId === "string") {
          setClientId(data.clientId.trim())
        }
      } catch (error) {
        console.error("map client id load error:", error)
      } finally {
        if (!cancelled) {
          setIsClientIdLoaded(true)
        }
      }
    }

    void loadClientId()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (typeof window !== "undefined" && window.naver?.maps) {
      setIsReady(true)
    }
  }, [])

  useEffect(() => {
    // 재진입 시 스크립트가 이미 로드된 상태여도, 컨테이너가 준비된 뒤 다시 초기화되도록 가드한다.
    if (!hasClientId || !isClientIdLoaded || !isReady || !mapRef.current || !window.naver?.maps) return

    const maps = window.naver.maps
    const storePoint: RoutePoint = { lat: resolvedStoreLat, lng: resolvedStoreLng }
    const destinationPoint: RoutePoint = { lat: shippingLat, lng: shippingLng }
    const previousRiderPoint = previousRiderPointRef.current
    const riderAnimationStartPoint =
      riderPoint != null ? previousRiderPoint ?? storePoint : null
    const shouldAnimateRider =
      riderPoint != null &&
      riderAnimationStartPoint != null &&
      !isSamePoint(riderAnimationStartPoint, riderPoint)

    const pointsForBounds: RoutePoint[] = [storePoint, destinationPoint]
    if (riderPoint) pointsForBounds.push(riderPoint)
    if (shouldAnimateRider && riderAnimationStartPoint) {
      pointsForBounds.push(riderAnimationStartPoint)
    }

    let overlays: OverlayInstance[] = []
    let infoWindows: InfoWindowInstance[] = []
    let eventListeners: EventListenerHandle[] = []
    let animationFrameId: number | null = null
    let isDisposed = false

    const toLatLng = (point: RoutePoint) => new maps.LatLng(point.lat, point.lng)

    const dispose = () => {
      if (animationFrameId != null) {
        window.cancelAnimationFrame(animationFrameId)
      }
      animationFrameId = null

      infoWindows.forEach((infoWindow) => {
        try {
          // 브라우저마다 close 호출 시점 오류가 있어, 열린 경우에만 닫도록 방어합니다.
          if (infoWindow.getMap()) {
            infoWindow.close()
          }
        } catch (error) {
          console.warn("map infoWindow dispose error:", error)
        }
      })
      infoWindows = []

      overlays.forEach((overlay) => {
        try {
          overlay.setMap(null)
        } catch (error) {
          console.warn("map overlay dispose error:", error)
        }
      })
      overlays = []

      eventListeners.forEach((listener) => {
        if (listener == null) return
        try {
          maps.Event.removeListener?.(listener)
        } catch (error) {
          console.warn("map eventListener dispose error:", error)
        }
      })
      eventListeners = []
    }

    const run = async () => {
      const centerPoint = riderPoint ?? destinationPoint
      const map = new maps.Map(mapRef.current as HTMLElement, {
        center: toLatLng(centerPoint),
        zoom: 13,
        mapDataControl: false,
        logoControl: false,
      })

      const bindInfoWindow = (
        marker: OverlayInstance,
        label: string,
        point: RoutePoint,
        isDefaultOpen = false,
      ) => {
        const content = [
          `<div style="padding:8px 10px;min-width:120px;font-size:12px;line-height:1.35;">`,
          `<strong style="display:block;color:#111827;margin-bottom:2px;">${label}</strong>`,
          `<span style="color:#4b5563;">${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}</span>`,
          `</div>`,
        ].join("")

        const infoWindow = new maps.InfoWindow({ content })
        const listener = maps.Event.addListener(marker, "click", () => {
          if (infoWindow.getMap()) {
            infoWindow.close()
          } else {
            infoWindow.open(map, marker)
          }
        })

        if (listener != null) {
          eventListeners.push(listener)
        }
        infoWindows.push(infoWindow)
        if (isDefaultOpen) {
          infoWindow.open(map, marker)
        }
      }

      const storeMarker = new maps.Marker({
        map,
        position: toLatLng(storePoint),
        title: storeLabel,
      })
      overlays.push(storeMarker)
      bindInfoWindow(storeMarker, storeLabel, storePoint, !riderPoint)

      const showDestinationMarker = riderPoint != null || !isSamePoint(storePoint, destinationPoint)
      if (showDestinationMarker) {
        const destinationMarker = new maps.Marker({
          map,
          position: toLatLng(destinationPoint),
          title: customerLabel,
        })
        overlays.push(destinationMarker)
        bindInfoWindow(destinationMarker, customerLabel, destinationPoint)
      }

      let riderMarker: MarkerInstance | null = null
      if (riderPoint) {
        const riderMarkerStartPoint =
          shouldAnimateRider && riderAnimationStartPoint ? riderAnimationStartPoint : riderPoint
        riderMarker = new maps.Marker({
          map,
          position: toLatLng(riderMarkerStartPoint),
          title: riderLabel,
        })
        overlays.push(riderMarker)
        bindInfoWindow(riderMarker, riderLabel, riderPoint, true)
      }

      const shouldRequestPrimaryRoute =
        roadRouteEnabled &&
        (riderPoint
          ? !isSamePoint(storePoint, riderPoint)
          : !isSamePoint(storePoint, destinationPoint))

      const [primaryRoadPath, secondaryRoadPath, riderAnimationRoadPath] = await Promise.all([
        shouldRequestPrimaryRoute && riderPoint
          ? fetchRoadRoute(storePoint, riderPoint).catch(() => null)
          : shouldRequestPrimaryRoute && !riderPoint
            ? fetchRoadRoute(storePoint, destinationPoint).catch(() => null)
            : Promise.resolve(null),
        roadRouteEnabled && riderPoint && !isSamePoint(riderPoint, destinationPoint)
          ? fetchRoadRoute(riderPoint, destinationPoint).catch(() => null)
          : Promise.resolve(null),
        roadRouteEnabled && shouldAnimateRider && riderAnimationStartPoint && riderPoint
          ? fetchRoadRoute(riderAnimationStartPoint, riderPoint).catch(() => null)
          : Promise.resolve(null),
      ])

      if (isDisposed) {
        dispose()
        return
      }

      if (shouldRequestPrimaryRoute && !primaryRoadPath && roadRouteEnabled) {
        setRoadRouteEnabled(false)
      }

      const primaryPath = riderPoint
        ? (primaryRoadPath ?? [storePoint, riderPoint])
        : primaryRoadPath ?? (isSamePoint(storePoint, destinationPoint) ? [] : [storePoint, destinationPoint])

      const secondaryPath =
        riderPoint && !isSamePoint(riderPoint, destinationPoint)
          ? (secondaryRoadPath ?? [riderPoint, destinationPoint])
          : []

      const riderAnimationPath =
        shouldAnimateRider && riderAnimationStartPoint && riderPoint
          ? (riderAnimationRoadPath ?? [riderAnimationStartPoint, riderPoint])
          : []

      const drawPolyline = (path: RoutePoint[], color: string, opacity: number, weight: number) => {
        if (path.length < 2) return
        const polyline = new maps.Polyline({
          map,
          path: path.map(toLatLng),
          strokeColor: color,
          strokeOpacity: opacity,
          strokeWeight: weight,
        })
        overlays.push(polyline)
      }

      drawPolyline(primaryPath, "#0f172a", 0.8, 4)
      drawPolyline(secondaryPath, "#2563eb", 0.55, 3)

      const bounds = new maps.LatLngBounds()
      pointsForBounds.forEach((point) => bounds.extend(toLatLng(point)))
      primaryPath.forEach((point) => bounds.extend(toLatLng(point)))
      secondaryPath.forEach((point) => bounds.extend(toLatLng(point)))
      map.fitBounds(bounds)

      if (riderMarker && riderAnimationPath.length >= 2) {
        // 이전 좌표 -> 현재 좌표를 보간해 마커가 점프하지 않고 이동하는 것처럼 보이게 만듭니다.
        await new Promise<void>((resolve) => {
          const durationMs = 1100
          const animationStartAt = performance.now()
          const step = (now: number) => {
            if (isDisposed) {
              resolve()
              return
            }

            const rawProgress = Math.min(1, (now - animationStartAt) / durationMs)
            // 시작/끝 구간을 완만하게 만들어 이동이 덜 튀게 보이도록 easeInOut을 적용합니다.
            const easedProgress =
              rawProgress < 0.5
                ? 2 * rawProgress * rawProgress
                : 1 - Math.pow(-2 * rawProgress + 2, 2) / 2
            const nextPoint = getPointOnPath(riderAnimationPath, easedProgress)
            riderMarker?.setPosition(toLatLng(nextPoint))

            if (rawProgress < 1) {
              animationFrameId = window.requestAnimationFrame(step)
              return
            }
            animationFrameId = null
            resolve()
          }
          animationFrameId = window.requestAnimationFrame(step)
        })
      }

      // 다음 갱신에서 현재 좌표를 시작점으로 쓰기 위해 최신 좌표를 저장합니다.
      previousRiderPointRef.current = riderPoint
    }

    void run()

    return () => {
      isDisposed = true
      dispose()
    }
  }, [
    customerLabel,
    hasClientId,
    isClientIdLoaded,
    isReady,
    resolvedStoreLat,
    resolvedStoreLng,
    riderPoint,
    riderLabel,
    roadRouteEnabled,
    shippingLat,
    shippingLng,
    storeLabel,
  ])

  if (!isClientIdLoaded) {
    return (
      <div className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
        <div className="mb-1 font-medium text-foreground">지도 설정 확인 중</div>
        <div>네이버 지도 키 설정을 불러오고 있습니다.</div>
      </div>
    )
  }

  if (!hasClientId) {
    return (
      <div className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
        <div className="mb-1 font-medium text-foreground">지도 미설정</div>
        <div>`NAVER_MAPS_CLIENT_ID`를 설정하면 배송 지도를 표시할 수 있습니다.</div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <Script src={scriptSrc} strategy="afterInteractive" onLoad={() => setIsReady(true)} />
      <div className="rounded-xl border bg-background p-3">
        <div className="mb-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Navigation className="h-3.5 w-3.5" />
            {storeLabel}
          </span>
          <span className="inline-flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" />
            {customerLabel}
          </span>
          {riderPoint && (
            <span className="inline-flex items-center gap-1">
              <Bike className="h-3.5 w-3.5" />
              {riderLabel}
            </span>
          )}
          {deliveryStatus ? (
            <span className="font-medium text-foreground">상태: {getDeliveryStatusLabel(deliveryStatus)}</span>
          ) : null}
          <span>
            {riderPoint
              ? `${riderPoint.lat.toFixed(5)}, ${riderPoint.lng.toFixed(5)}`
              : `${shippingLat.toFixed(5)}, ${shippingLng.toFixed(5)}`}
          </span>
        </div>
        <div
          ref={mapRef}
          className={`w-full min-h-[220px] ${heightClassName} rounded-lg border bg-muted`}
        />
      </div>
      {shippingAddress ? <p className="text-xs text-muted-foreground break-words">{shippingAddress}</p> : null}
    </div>
  )
}
