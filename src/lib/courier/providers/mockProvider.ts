import type {
  CreateDeliveryInput,
  CreateDeliveryResult,
  DeliveryProviderAdapter,
  DeliveryProviderName,
  DeliverySnapshot,
  NormalizedWebhookEvent,
  VerifyWebhookInput,
} from "@/lib/courier/providerAdapter"

// Mock 공급자는 외부 연동 전에도 전체 흐름을 테스트하기 위한 기본 구현입니다.
export class MockDeliveryProvider implements DeliveryProviderAdapter {
  readonly providerName: DeliveryProviderName

  constructor(providerName: DeliveryProviderName = "MOCK") {
    this.providerName = providerName
  }

  async createDelivery(input: CreateDeliveryInput): Promise<CreateDeliveryResult> {
    const timestamp = Date.now()
    const externalDeliveryId = `${this.providerName}-${input.orderId}-${timestamp}`
    const trackingNumber = `TRK${String(timestamp).slice(-10)}`

    return {
      provider: this.providerName,
      externalDeliveryId,
      externalDeliveryStatus: "REQUESTED",
      trackingNumber,
      trackingUrl: `https://tracking.mock.local/${trackingNumber}`,
      occurredAt: new Date(),
      rawPayload: {
        mode: "mock",
        orderId: input.orderId,
        shippingAddress: input.shippingAddress,
      },
    }
  }

  async cancelDelivery(_externalDeliveryId: string): Promise<void> {
    // Mock 취소는 외부 부작용 없이 성공으로 처리합니다.
    return
  }

  async getDelivery(externalDeliveryId: string): Promise<DeliverySnapshot> {
    const tokens = externalDeliveryId.split("-")
    const lastToken = tokens[tokens.length - 1]
    const createdAtMs = Number(lastToken)
    const elapsedMs = Number.isFinite(createdAtMs) ? Date.now() - createdAtMs : 0

    let externalDeliveryStatus = "REQUESTED"
    if (elapsedMs > 2 * 60 * 1000) externalDeliveryStatus = "IN_TRANSIT"
    if (elapsedMs > 5 * 60 * 1000) externalDeliveryStatus = "ARRIVING"
    if (elapsedMs > 8 * 60 * 1000) externalDeliveryStatus = "DELIVERED"

    return {
      provider: this.providerName,
      externalDeliveryId,
      externalDeliveryStatus,
      trackedAt: new Date(),
      rawPayload: {
        mode: "mock",
        elapsedMs,
      },
    }
  }

  normalizeWebhook(payload: unknown, _input: VerifyWebhookInput): NormalizedWebhookEvent | null {
    if (!payload || typeof payload !== "object") return null
    const record = payload as Record<string, unknown>

    const externalDeliveryId =
      typeof record.externalDeliveryId === "string" ? record.externalDeliveryId : null
    const eventType = typeof record.eventType === "string" ? record.eventType : "STATUS_UPDATED"
    const dedupeKey =
      typeof record.dedupeKey === "string"
        ? record.dedupeKey
        : `${this.providerName}-${externalDeliveryId ?? "UNKNOWN"}-${eventType}`

    return {
      provider: this.providerName,
      dedupeKey,
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

  async verifyWebhook(_input: VerifyWebhookInput): Promise<boolean> {
    // Mock 웹훅은 테스트 편의를 위해 항상 검증 성공 처리합니다.
    return true
  }
}
