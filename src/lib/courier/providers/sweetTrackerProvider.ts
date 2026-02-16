import type {
  CreateDeliveryInput,
  CreateDeliveryResult,
  DeliveryProviderAdapter,
  DeliveryProviderName,
  DeliverySnapshot,
  NormalizedWebhookEvent,
  VerifyWebhookInput,
} from "@/lib/courier/providerAdapter"

type SweetTrackerStatusLike = {
  status?: boolean
  code?: string
  msg?: string
}

type SweetTrackerTrackingDetail = {
  timeString?: string
  kind?: string
  where?: string
  level?: number
}

type SweetTrackerTrackingInfo = SweetTrackerStatusLike & {
  invoiceNo?: string
  complete?: boolean
  completeYN?: string
  level?: number
  trackingDetails?: SweetTrackerTrackingDetail[]
  lastDetail?: SweetTrackerTrackingDetail
  lastStateDetail?: SweetTrackerTrackingDetail
}

function pad2(value: number): string {
  return String(value).padStart(2, "0")
}

// SweetTracker 응답 시간 포맷("YYYY-MM-DD HH:mm:ss")을 KST 기준으로 맞춥니다.
function formatKstDate(date: Date): string {
  const kst = new Date(date.getTime() + 9 * 60 * 60 * 1000)
  return `${kst.getUTCFullYear()}-${pad2(kst.getUTCMonth() + 1)}-${pad2(kst.getUTCDate())} ${pad2(kst.getUTCHours())}:${pad2(kst.getUTCMinutes())}:${pad2(kst.getUTCSeconds())}`
}

// SweetTracker 응답 시간이 "YYYY-MM-DD HH:mm:ss" 형태라서 파싱 시 KST(+09:00)를 고정합니다.
function parseKstDate(value: string | null | undefined): Date | null {
  if (!value || value.trim().length === 0) return null
  const normalized = value.trim().replace(" ", "T")
  const parsed = new Date(`${normalized}+09:00`)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function toUpperCompact(value: string): string {
  return value.trim().toUpperCase().replace(/\s+/g, "")
}

// 운영에서 자주 쓰는 택배사 문자열 별칭을 SweetTracker 코드로 변환합니다.
const COURIER_ALIAS_TO_CODE: Record<string, string> = {
  "01": "01",
  "04": "04",
  "05": "05",
  "06": "06",
  "08": "08",
  CJ: "04",
  CJGLS: "04",
  CJLOGISTICS: "04",
  CJDAEHAN: "04",
  CJDAEHANTONGWOON: "04",
  HANJIN: "05",
  LOTTE: "08",
  LOGEN: "06",
  POST: "01",
  KOREAPOST: "01",
  POSTOFFICE: "01",
}

function resolveCourierCode(raw: string | null | undefined): string | null {
  if (!raw || raw.trim().length === 0) return null
  const normalized = toUpperCompact(raw)
  if (COURIER_ALIAS_TO_CODE[normalized]) {
    return COURIER_ALIAS_TO_CODE[normalized]
  }
  if (/^\d{1,3}$/.test(normalized)) {
    return normalized.padStart(2, "0")
  }
  return raw.trim()
}

function resolveTrackingNumber(raw: string | null | undefined): string | null {
  if (!raw) return null
  const normalized = raw.trim()
  return normalized.length > 0 ? normalized : null
}

function resolveExternalStatus(info: SweetTrackerTrackingInfo): string {
  const completeYn = typeof info.completeYN === "string" ? info.completeYN.toUpperCase() : null
  if (info.complete === true || completeYn === "Y") return "DELIVERED"

  const level = typeof info.level === "number" ? info.level : null
  if (level != null) {
    if (level >= 6) return "DELIVERED"
    if (level >= 5) return "ARRIVING"
    if (level >= 3) return "IN_TRANSIT"
    return "REQUESTED"
  }

  const lastDetail = info.lastStateDetail ?? info.lastDetail
  const hint = `${lastDetail?.kind ?? ""} ${lastDetail?.where ?? ""}`.toUpperCase()
  if (hint.includes("완료") || hint.includes("DELIVERED")) return "DELIVERED"
  if (hint.includes("출발") || hint.includes("ARRIVING")) return "ARRIVING"
  if (hint.includes("배송") || hint.includes("집화") || hint.includes("TRANSIT")) return "IN_TRANSIT"

  return "REQUESTED"
}

function resolveTrackedAt(info: SweetTrackerTrackingInfo): Date | null {
  const details = Array.isArray(info.trackingDetails) ? info.trackingDetails : []
  for (let i = details.length - 1; i >= 0; i -= 1) {
    const parsed = parseKstDate(details[i]?.timeString)
    if (parsed) return parsed
  }
  return parseKstDate((info.lastStateDetail ?? info.lastDetail)?.timeString)
}

export class SweetTrackerDeliveryProvider implements DeliveryProviderAdapter {
  readonly providerName: DeliveryProviderName

  constructor(providerName: DeliveryProviderName = "KAKAO") {
    this.providerName = providerName
  }

  private isSandboxMode(): boolean {
    const value = process.env.SWEETTRACKER_SANDBOX_MODE?.trim().toLowerCase()
    return value === "1" || value === "true" || value === "yes"
  }

  private async waitSandboxDelay(): Promise<void> {
    const raw = process.env.SWEETTRACKER_SANDBOX_DELAY_MS?.trim() ?? "0"
    const delayMs = Number(raw)
    if (!Number.isFinite(delayMs) || delayMs <= 0) return
    await new Promise((resolve) => setTimeout(resolve, delayMs))
  }

  private getApiKey(): string {
    // 기존 KAKAO 변수명을 이미 쓰는 환경을 깨지 않기 위해 fallback을 유지합니다.
    const key = process.env.SWEETTRACKER_API_KEY ?? process.env.KAKAO_MOBILITY_API_KEY
    if (!key || key.trim().length === 0) {
      throw new Error("SWEETTRACKER_API_KEY가 없어 배송 조회를 실행할 수 없습니다.")
    }
    return key.trim()
  }

  private getBaseUrl(): string {
    return process.env.SWEETTRACKER_BASE_URL?.trim() || "https://info.sweettracker.co.kr"
  }

  private buildSandboxTrackingInfo(
    courierCode: string,
    trackingNumber: string,
  ): SweetTrackerTrackingInfo {
    // 가상 모드는 송장번호 기반 seed로 상태를 고정해 재실행 시에도 같은 결과를 만듭니다.
    const seed = Array.from(trackingNumber).reduce((sum, char) => sum + char.charCodeAt(0), 0)
    const level = (seed % 6) + 1
    const complete = level >= 6
    const now = new Date()

    const details: SweetTrackerTrackingDetail[] = []
    const levelCount = Math.max(2, Math.min(5, level))
    for (let idx = 0; idx < levelCount; idx += 1) {
      const eventTime = new Date(now.getTime() - (levelCount - idx) * 20 * 60 * 1000)
      details.push({
        level: Math.min(6, idx + 1),
        timeString: formatKstDate(eventTime),
        where: idx + 1 >= 5 ? "배송지 인근" : "택배 허브",
        kind: idx + 1 >= 5 ? "배송출발" : "이동중",
      })
    }

    const lastDetail = details[details.length - 1]

    return {
      status: true,
      msg: "SANDBOX_OK",
      code: "200",
      invoiceNo: trackingNumber,
      level,
      complete,
      completeYN: complete ? "Y" : "N",
      lastDetail,
      lastStateDetail: lastDetail,
      trackingDetails: details,
    }
  }

  private async requestTrackingInfo(
    courierCode: string,
    trackingNumber: string,
  ): Promise<SweetTrackerTrackingInfo> {
    if (this.isSandboxMode()) {
      await this.waitSandboxDelay()
      return this.buildSandboxTrackingInfo(courierCode, trackingNumber)
    }

    const url = new URL("/api/v1/trackingInfo", this.getBaseUrl())
    url.searchParams.set("t_key", this.getApiKey())
    url.searchParams.set("t_code", courierCode)
    url.searchParams.set("t_invoice", trackingNumber)

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
    })

    const text = await response.text()
    let payload: unknown = null
    try {
      payload = text.length > 0 ? JSON.parse(text) : {}
    } catch {
      throw new Error(`SweetTracker 응답 파싱에 실패했습니다. status=${response.status}`)
    }

    if (!payload || typeof payload !== "object") {
      throw new Error("SweetTracker 응답 형식이 올바르지 않습니다.")
    }

    const record = payload as Record<string, unknown>
    const statusLike = record as SweetTrackerStatusLike
    if (statusLike.status === false) {
      const code = statusLike.code ? `code=${statusLike.code}` : "code=UNKNOWN"
      const msg = statusLike.msg ?? "배송 정보를 조회할 수 없습니다."
      throw new Error(`SweetTracker 조회 실패(${code}): ${msg}`)
    }

    if (!response.ok) {
      const msg = statusLike.msg ?? "배송 정보를 조회할 수 없습니다."
      throw new Error(`SweetTracker HTTP ${response.status}: ${msg}`)
    }

    const result = record.result
    if (result && typeof result === "object") {
      return { ...statusLike, ...(result as Record<string, unknown>) } as SweetTrackerTrackingInfo
    }

    return record as SweetTrackerTrackingInfo
  }

  async createDelivery(input: CreateDeliveryInput): Promise<CreateDeliveryResult> {
    // SweetTracker는 "배차 생성" API가 아니라 "운송장 조회" API라서 조회 결과로 배송 상태를 시작합니다.
    const courierCode = resolveCourierCode(input.courierCode)
    const trackingNumber = resolveTrackingNumber(input.trackingNumber)

    if (!courierCode || !trackingNumber) {
      throw new Error("택배사 코드(courierCode)와 송장번호(trackingNumber)를 먼저 입력해 주세요.")
    }

    const info = await this.requestTrackingInfo(courierCode, trackingNumber)
    const externalStatus = resolveExternalStatus(info)

    return {
      provider: this.providerName,
      externalDeliveryId: `${courierCode}:${trackingNumber}`,
      externalDeliveryStatus: externalStatus,
      trackingNumber: info.invoiceNo ?? trackingNumber,
      trackingUrl: `https://tracking.sweettracker.co.kr/#type`,
      occurredAt: resolveTrackedAt(info) ?? new Date(),
      rawPayload: info,
    }
  }

  async cancelDelivery(_externalDeliveryId: string): Promise<void> {
    // SweetTracker는 조회 API라서 취소 기능이 없습니다.
    throw new Error("SweetTracker는 배송 조회 전용 API라서 취소(cancel) 기능을 지원하지 않습니다.")
  }

  async getDelivery(externalDeliveryId: string): Promise<DeliverySnapshot> {
    const [savedCourierCode, savedTrackingNumber] = externalDeliveryId.split(":", 2)
    const courierCode =
      resolveCourierCode(savedCourierCode) ??
      resolveCourierCode(process.env.SWEETTRACKER_DEFAULT_COURIER_CODE)
    const trackingNumber = resolveTrackingNumber(savedTrackingNumber)

    if (!courierCode || !trackingNumber) {
      throw new Error("externalDeliveryId 형식이 올바르지 않습니다. expected: {courierCode}:{trackingNumber}")
    }

    const info = await this.requestTrackingInfo(courierCode, trackingNumber)

    return {
      provider: this.providerName,
      externalDeliveryId: `${courierCode}:${trackingNumber}`,
      externalDeliveryStatus: resolveExternalStatus(info),
      trackingNumber: info.invoiceNo ?? trackingNumber,
      trackingUrl: `https://tracking.sweettracker.co.kr/#type`,
      trackedAt: resolveTrackedAt(info) ?? new Date(),
      rawPayload: info,
    }
  }

  normalizeWebhook(payload: unknown, _input: VerifyWebhookInput): NormalizedWebhookEvent | null {
    if (!payload || typeof payload !== "object") return null
    const record = payload as Record<string, unknown>
    const externalDeliveryId =
      typeof record.externalDeliveryId === "string" ? record.externalDeliveryId : null
    const eventType = typeof record.eventType === "string" ? record.eventType : "STATUS_UPDATED"

    return {
      provider: this.providerName,
      dedupeKey: `${this.providerName}-${externalDeliveryId ?? "UNKNOWN"}-${eventType}`,
      eventType,
      orderId: typeof record.orderId === "number" ? record.orderId : null,
      externalDeliveryId,
      externalDeliveryStatus:
        typeof record.externalDeliveryStatus === "string" ? record.externalDeliveryStatus : null,
      trackingNumber: typeof record.trackingNumber === "string" ? record.trackingNumber : null,
      trackingUrl: typeof record.trackingUrl === "string" ? record.trackingUrl : null,
      lat: typeof record.lat === "number" ? record.lat : null,
      lng: typeof record.lng === "number" ? record.lng : null,
      occurredAt: new Date(),
      rawPayload: payload,
    }
  }

  async verifyWebhook(input: VerifyWebhookInput): Promise<boolean> {
    const secret = process.env.SWEETTRACKER_WEBHOOK_SECRET ?? process.env.KAKAO_MOBILITY_WEBHOOK_SECRET
    if (!secret) return true
    const signature = input.headers.get("x-delivery-signature")
    return signature === secret
  }
}
