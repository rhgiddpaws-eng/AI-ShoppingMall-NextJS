/**
 * 배송 상태(DeliveryStatus) 라벨/목록 공통 유틸입니다.
 * 클라이언트 번들에서 @prisma/client를 직접 가져오지 않기 위해 별도 파일로 관리합니다.
 */
import type { DeliveryStatus } from '@/lib/orderEnums'

export const DELIVERY_STATUS_LABELS: Record<DeliveryStatus, string> = {
  ORDER_COMPLETE: '주문완료',
  PREPARING: '배송준비',
  IN_DELIVERY: '배송중',
  ARRIVING: '도착중',
  DELIVERED: '배송완료',
}

export const DELIVERY_STATUS_LIST: DeliveryStatus[] = [
  'ORDER_COMPLETE',
  'PREPARING',
  'IN_DELIVERY',
  'ARRIVING',
  'DELIVERED',
]

export function getDeliveryStatusLabel(status: string | null | undefined): string {
  if (!status) return '-'
  return DELIVERY_STATUS_LABELS[status as DeliveryStatus] ?? status
}
