type GeocodeResult = {
  lat: number
  lng: number
}

type GeocodeAttempt = {
  query: string
  reason: string
}

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value)

const NAVER_GEOCODE_ENDPOINT =
  "https://maps.apigw.ntruss.com/map-geocode/v2/geocode"

// 상세주소/괄호/쉼표가 섞인 주소는 실패 확률이 높아 후보 쿼리를 만들어 순차 재시도합니다.
const buildGeocodeCandidates = (address: string): string[] => {
  const normalized = address.trim().replace(/\s+/g, " ")
  if (!normalized) return []

  const withoutCommaTail = normalized.split(",")[0]?.trim() ?? normalized
  const withoutParen = withoutCommaTail
    .replace(/\([^)]*\)/g, " ")
    .replace(/\s+/g, " ")
    .trim()
  const broadArea = withoutParen
    .split(" ")
    .slice(0, 4)
    .join(" ")
    .trim()

  return Array.from(
    new Set(
      [normalized, withoutCommaTail, withoutParen, broadArea].filter(
        (candidate) => candidate.length > 0,
      ),
    ),
  )
}

async function requestGeocode(
  query: string,
  keyId: string,
  key: string,
): Promise<{ result: GeocodeResult | null; reason: string | null }> {
  const geocodeUrl = new URL(NAVER_GEOCODE_ENDPOINT)
  geocodeUrl.searchParams.set("query", query)

  const response = await fetch(geocodeUrl.toString(), {
    method: "GET",
    headers: {
      "x-ncp-apigw-api-key-id": keyId,
      "x-ncp-apigw-api-key": key,
    },
    cache: "no-store",
  })

  if (!response.ok) {
    const details = (await response.text()).slice(0, 200)
    return {
      result: null,
      reason: `HTTP_${response.status} ${details}`,
    }
  }

  const data = (await response.json()) as {
    addresses?: Array<{ x?: string; y?: string }>
    errorMessage?: string
  }
  const first = data.addresses?.[0]
  if (!first?.x || !first?.y) {
    return {
      result: null,
      reason: data.errorMessage ?? "NO_ADDRESS_RESULT",
    }
  }

  const lng = Number(first.x)
  const lat = Number(first.y)
  if (!isFiniteNumber(lat) || !isFiniteNumber(lng)) {
    return {
      result: null,
      reason: "INVALID_COORDINATE_VALUE",
    }
  }

  return { result: { lat, lng }, reason: null }
}

export async function geocodeAddress(address: string): Promise<GeocodeResult | null> {
  const query = address.trim().replace(/\s+/g, " ")
  if (!query) return null

  const keyId = process.env.NAVER_MAPS_CLIENT_ID
  const key = process.env.NAVER_MAPS_CLIENT_SECRET
  if (!keyId || !key) return null

  const attempts: GeocodeAttempt[] = []

  try {
    const candidates = buildGeocodeCandidates(query)
    for (const candidate of candidates) {
      const { result, reason } = await requestGeocode(candidate, keyId, key)
      if (result) return result
      if (reason) {
        attempts.push({ query: candidate, reason })
      }
    }

    // 권한/호출 조건 진단이 필요할 때 즉시 확인할 수 있도록 시도별 실패 원인을 남깁니다.
    if (attempts.length > 0) {
      console.warn("[NaverGeocode] 주소 좌표 변환 실패", {
        endpoint: NAVER_GEOCODE_ENDPOINT,
        attempts,
      })
    }
    return null
  } catch (error) {
    console.error("geocodeAddress error:", error)
    return null
  }
}
