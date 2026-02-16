import type { DeliveryStatus } from "@/lib/orderEnums"

// 외부 상태 문자열은 대소문자/공백이 섞여 들어올 수 있어 표준형으로 정규화합니다.
export function normalizeExternalStatus(value: string | null | undefined): string | null {
  if (!value) return null
  const normalized = value.trim().toUpperCase().replace(/\s+/g, "_")
  return normalized.length > 0 ? normalized : null
}

// 외부 상태를 내부 DeliveryStatus로 변환해 고객/관리자 화면 상태를 일관되게 맞춥니다.
export function mapExternalStatusToDeliveryStatus(
  value: string | null | undefined,
): DeliveryStatus | null {
  const normalized = normalizeExternalStatus(value)
  if (!normalized) return null

  if (["REQUESTED", "ASSIGNED", "PICKUP_READY", "PICKED_UP"].includes(normalized)) {
    return "PREPARING"
  }
  if (["IN_TRANSIT", "OUT_FOR_DELIVERY", "SHIPPING"].includes(normalized)) {
    return "IN_DELIVERY"
  }
  if (["ARRIVING", "NEAR_DESTINATION"].includes(normalized)) {
    return "ARRIVING"
  }
  if (["DELIVERED", "COMPLETED", "DONE"].includes(normalized)) {
    return "DELIVERED"
  }

  return null
}
