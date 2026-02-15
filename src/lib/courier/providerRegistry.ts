import type {
  DeliveryProviderAdapter,
  DeliveryProviderMode,
  DeliveryProviderName,
} from "@/lib/courier/providerAdapter"
import { MockDeliveryProvider } from "@/lib/courier/providers/mockProvider"
import { SweetTrackerDeliveryProvider } from "@/lib/courier/providers/sweetTrackerProvider"

const mockProvider = new MockDeliveryProvider("MOCK")
const internalProvider = new MockDeliveryProvider("INTERNAL")
// Prisma enum 값(KAKAO)을 유지하면서 실제 호출은 SweetTracker로 처리합니다.
const sweetTrackerProvider = new SweetTrackerDeliveryProvider("KAKAO")
const barogoProvider = new MockDeliveryProvider("BAROGO")
const vroongProvider = new MockDeliveryProvider("VROONG")
const thinkingProvider = new MockDeliveryProvider("THINKING")

// DELIVERY_PROVIDER_MODE는 운영 전환 시 즉시 교체할 수 있도록 문자열 기반으로 관리합니다.
export function getDeliveryProviderMode(): DeliveryProviderMode {
  const mode = process.env.DELIVERY_PROVIDER_MODE?.trim().toLowerCase()
  if (mode === "external" || mode === "internal" || mode === "mock") {
    return mode
  }
  return "mock"
}

// 외부 모드일 때 사용할 1순위 공급자를 환경변수로 정합니다.
export function getExternalProviderName(): DeliveryProviderName {
  const provider = process.env.DELIVERY_EXTERNAL_PROVIDER?.trim().toUpperCase()
  if (provider === "SWEETTRACKER") return "KAKAO"
  if (provider === "KAKAO") return "KAKAO"
  if (provider === "BAROGO") return "BAROGO"
  if (provider === "VROONG") return "VROONG"
  if (provider === "THINKING") return "THINKING"
  return "KAKAO"
}

// 공급자 이름으로 어댑터를 직접 가져올 때 사용합니다.
export function getDeliveryProviderByName(provider: DeliveryProviderName): DeliveryProviderAdapter {
  if (provider === "MOCK") return mockProvider
  if (provider === "KAKAO") return sweetTrackerProvider
  if (provider === "BAROGO") return barogoProvider
  if (provider === "VROONG") return vroongProvider
  if (provider === "THINKING") return thinkingProvider
  if (provider === "INTERNAL") return internalProvider

  // 알 수 없는 공급자는 mock으로 안전하게 대체합니다.
  return mockProvider
}

// 배차 요청 시 현재 모드에 맞는 기본 어댑터를 반환합니다.
export function getDispatchProvider(): DeliveryProviderAdapter {
  const mode = getDeliveryProviderMode()
  if (mode === "mock") return mockProvider
  if (mode === "internal") return internalProvider
  return getDeliveryProviderByName(getExternalProviderName())
}
