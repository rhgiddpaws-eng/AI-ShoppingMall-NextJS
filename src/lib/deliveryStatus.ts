/**
 * 배달 상태( DeliveryStatus ) 한글 라벨 및 순서
 * 클라이언트에서도 사용하므로 @prisma/client 대신 orderEnums 사용
 */
import type { DeliveryStatus } from '@/lib/orderEnums'

export const DELIVERY_STATUS_LABELS: Record<DeliveryStatus, string> = {
  ORDER_COMPLETE: "주문완료",
  PREPARING: "배송준비",
  IN_DELIVERY: "배달중",
  ARRIVING: "도착중",
  DELIVERED: "배달완료",
}

export const DELIVERY_STATUS_LIST: DeliveryStatus[] = [
  "ORDER_COMPLETE",
  "PREPARING",
  "IN_DELIVERY",
  "ARRIVING",
  "DELIVERED",
]

export function getDeliveryStatusLabel(status: string | null | undefined): string {
  if (!status) return "—"
  return DELIVERY_STATUS_LABELS[status as DeliveryStatus] ?? status
}
