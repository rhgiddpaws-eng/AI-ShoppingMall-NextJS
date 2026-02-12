/**
 * 주문/결제/배송 상태 상수 (Prisma enum과 동일한 값)
 * 클라이언트 컴포넌트에서 @prisma/client를 import하면 번들에 Prisma가 포함되어
 * "Can't resolve '.prisma/client'" 오류가 나므로, 클라이언트용은 이 파일 사용.
 */

export const OrderStatus = {
  PENDING: 'PENDING',
  PAID: 'PAID',
  CANCELED: 'CANCELED',
} as const
export type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus]

export const PaymentStatus = {
  WAITING: 'WAITING',
  PAID: 'PAID',
  FAILED: 'FAILED',
} as const
export type PaymentStatus = (typeof PaymentStatus)[keyof typeof PaymentStatus]

export const DeliveryStatus = {
  ORDER_COMPLETE: 'ORDER_COMPLETE',
  PREPARING: 'PREPARING',
  IN_DELIVERY: 'IN_DELIVERY',
  ARRIVING: 'ARRIVING',
  DELIVERED: 'DELIVERED',
} as const
export type DeliveryStatus = (typeof DeliveryStatus)[keyof typeof DeliveryStatus]

export const Category = {
  MEN: 'MEN',
  WOMEN: 'WOMEN',
  ACCESSORIES: 'ACCESSORIES',
  SHOES: 'SHOES',
  SALE: 'SALE',
  NEW: 'NEW',
} as const
export type Category = (typeof Category)[keyof typeof Category]
