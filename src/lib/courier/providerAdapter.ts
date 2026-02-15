import type { DeliveryStatus } from "@/lib/orderEnums"

// 택배/배송 공급자 모드를 환경변수로 제어하기 위한 타입입니다.
export type DeliveryProviderMode = "external" | "mock" | "internal"

// 공급자 코드는 DB(Order.deliveryProvider)와 API 응답에서 공통으로 사용합니다.
export type DeliveryProviderName =
  | "MOCK"
  | "KAKAO"
  | "BAROGO"
  | "VROONG"
  | "THINKING"
  | "INTERNAL"

// 배차 요청 시 공급자에게 전달할 최소 주문 정보입니다.
export interface CreateDeliveryInput {
  orderId: number
  orderStatus: string
  deliveryStatus: DeliveryStatus | null
  shippingAddress: string | null
  shippingLat: number | null
  shippingLng: number | null
  // 조회형 택배 연동(SweetTracker)은 택배사 코드가 필수라서 입력값을 함께 받습니다.
  courierCode?: string | null
  // 조회형 택배 연동(SweetTracker)은 송장번호가 필수라서 입력값을 함께 받습니다.
  trackingNumber?: string | null
  receiverName?: string | null
  receiverPhone?: string | null
  totalAmount: number
  itemSummary: string[]
}

// 공급자가 배차 생성 후 반환하는 표준 결과입니다.
export interface CreateDeliveryResult {
  provider: DeliveryProviderName
  externalDeliveryId: string
  externalDeliveryStatus: string
  trackingNumber?: string | null
  trackingUrl?: string | null
  occurredAt?: Date | null
  rawPayload?: unknown
}

// 공급자 조회 API에서 가져오는 배송 상태 스냅샷입니다.
export interface DeliverySnapshot {
  provider: DeliveryProviderName
  externalDeliveryId: string
  externalDeliveryStatus: string
  trackingNumber?: string | null
  trackingUrl?: string | null
  lat?: number | null
  lng?: number | null
  trackedAt?: Date | null
  rawPayload?: unknown
}

// 웹훅 검증용 입력입니다.
export interface VerifyWebhookInput {
  rawBody: string
  headers: Headers
}

// 공급자 웹훅 원본을 내부 이벤트로 표준화한 결과입니다.
export interface NormalizedWebhookEvent {
  provider: DeliveryProviderName
  dedupeKey: string
  eventType: string
  occurredAt?: Date | null
  orderId?: number | null
  externalDeliveryId?: string | null
  externalDeliveryStatus?: string | null
  trackingNumber?: string | null
  trackingUrl?: string | null
  lat?: number | null
  lng?: number | null
  rawPayload: unknown
}

// 모든 공급자 어댑터는 동일한 인터페이스를 구현해 API 계층에서 교체 가능하게 만듭니다.
export interface DeliveryProviderAdapter {
  readonly providerName: DeliveryProviderName
  createDelivery(input: CreateDeliveryInput): Promise<CreateDeliveryResult>
  cancelDelivery(externalDeliveryId: string): Promise<void>
  getDelivery(externalDeliveryId: string): Promise<DeliverySnapshot>
  normalizeWebhook(payload: unknown, input: VerifyWebhookInput): NormalizedWebhookEvent | null
  verifyWebhook(input: VerifyWebhookInput): Promise<boolean>
}
