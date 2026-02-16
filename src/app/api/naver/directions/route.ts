import { NextResponse } from "next/server"

type RoutePoint = { lat: number; lng: number }
type RouteCandidate = { path?: unknown }

const PREFERRED_ROUTE_KEYS = [
  "trafast",
  "traoptimal",
  "tracomfort",
  "traavoidtoll",
  "traavoidcaronly",
] as const

const NAVER_DIRECTIONS_ENDPOINT =
  "https://maps.apigw.ntruss.com/map-direction/v1/driving"

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value)

const buildFallbackPath = (
  startLat: number,
  startLng: number,
  goalLat: number,
  goalLng: number,
): RoutePoint[] => [
  { lat: startLat, lng: startLng },
  { lat: goalLat, lng: goalLng },
]

function parseRoutePath(payload: unknown): RoutePoint[] | null {
  if (!payload || typeof payload !== "object") return null
  const route = (payload as { route?: unknown }).route
  if (!route || typeof route !== "object") return null

  const routeMap = route as Record<string, unknown>
  const routeKeys = Array.from(
    new Set([...PREFERRED_ROUTE_KEYS, ...Object.keys(routeMap)]),
  )

  for (const key of routeKeys) {
    const candidates = routeMap[key]
    if (!Array.isArray(candidates) || candidates.length === 0) continue
    const firstCandidate = candidates[0] as RouteCandidate
    if (!Array.isArray(firstCandidate.path)) continue

    const path = firstCandidate.path
      // 외부 API 응답 path 배열은 스키마가 고정되지 않아 unknown으로 먼저 받고 검증합니다.
      .map((point: unknown) => {
        if (!Array.isArray(point) || point.length < 2) return null
        const lng = point[0]
        const lat = point[1]
        if (!isFiniteNumber(lat) || !isFiniteNumber(lng)) return null
        return { lat, lng }
      })
      .filter((point): point is RoutePoint => point !== null)

    if (path.length >= 2) return path
  }

  return null
}

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const startLat = Number(searchParams.get("startLat"))
  const startLng = Number(searchParams.get("startLng"))
  const goalLat = Number(searchParams.get("goalLat"))
  const goalLng = Number(searchParams.get("goalLng"))

  if (![startLat, startLng, goalLat, goalLng].every(Number.isFinite)) {
    return NextResponse.json(
      { error: "잘못된 좌표 파라미터입니다." },
      { status: 400 },
    )
  }

  const keyId = process.env.NAVER_MAPS_CLIENT_ID
  const key = process.env.NAVER_MAPS_CLIENT_SECRET
  if (!keyId || !key) {
    return NextResponse.json(
      { error: "NAVER Directions API 키가 설정되지 않았습니다. (NAVER_MAPS_CLIENT_ID/SECRET)" },
      { status: 503 },
    )
  }

  const fallbackPath = buildFallbackPath(startLat, startLng, goalLat, goalLng)
  const directionUrl = new URL(NAVER_DIRECTIONS_ENDPOINT)
  directionUrl.searchParams.set("start", `${startLng},${startLat}`)
  directionUrl.searchParams.set("goal", `${goalLng},${goalLat}`)
  directionUrl.searchParams.set("option", "trafast")

  try {
    const response = await fetch(directionUrl.toString(), {
      method: "GET",
      headers: {
        "x-ncp-apigw-api-key-id": keyId,
        "x-ncp-apigw-api-key": key,
      },
      cache: "no-store",
    })

    if (!response.ok) {
      const details = (await response.text()).slice(0, 200)
      // 외부 경로 API 실패 시에도 배송 지도 흐름이 끊기지 않도록 직선 경로를 즉시 반환합니다.
      return NextResponse.json(
        {
          path: fallbackPath,
          isFallback: true,
          reason: "DIRECTIONS_HTTP_ERROR",
          details,
        },
        {
          headers: {
            "Cache-Control": "no-store",
          },
        },
      )
    }

    const payloadText = await response.text()
    if (!payloadText.trim()) {
      return NextResponse.json(
        {
          path: fallbackPath,
          isFallback: true,
          reason: "DIRECTIONS_EMPTY_RESPONSE",
        },
        {
          headers: {
            "Cache-Control": "no-store",
          },
        },
      )
    }

    let payload: unknown
    try {
      payload = JSON.parse(payloadText)
    } catch {
      return NextResponse.json(
        {
          path: fallbackPath,
          isFallback: true,
          reason: "DIRECTIONS_INVALID_JSON",
          details: payloadText.slice(0, 200),
        },
        {
          headers: {
            "Cache-Control": "no-store",
          },
        },
      )
    }

    const path = parseRoutePath(payload)
    if (!path) {
      // 응답 포맷이 바뀌거나 경로가 비어도 최소 경로를 내려 프런트 맵 렌더를 유지합니다.
      return NextResponse.json(
        {
          path: fallbackPath,
          isFallback: true,
          reason: "DIRECTIONS_EMPTY_PATH",
        },
        {
          headers: {
            "Cache-Control": "no-store",
          },
        },
      )
    }

    return NextResponse.json(
      { path },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    )
  } catch (error) {
    console.error("Directions API route error:", error)
    // 네트워크 예외가 나도 지도 폴백 경로는 유지해 E2E 흐름을 보장합니다.
    return NextResponse.json(
      {
        path: fallbackPath,
        isFallback: true,
        reason: "DIRECTIONS_EXCEPTION",
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    )
  }
}
