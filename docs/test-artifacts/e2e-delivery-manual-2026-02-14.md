# 배달 연동 수동 E2E 검증 (2026-02-14)

## 대상
- 요청 시나리오: 관리자 주문 상세 수정 -> 배차 요청 -> 사용자 배송지도 반영
- 기준 주문: `orderId=179` (`userId=1`, `test@test.com`)

## 실행 절차
1. 관리자 로그인 (`test@test.com` / `test1234`)
2. 관리자 주문 상세(`/admin/orders/179`)에서 배송 상태 수정 후 저장
3. 관리자 주문 상세에서 `배차 요청` 실행
4. 사용자 홈(`/`) Delivery Live 섹션에서 배송 추적 반영 확인
5. 사용자 계정(`/account`) 주문 상세에서 배송 지도 반영 확인

## 결과 요약
- 관리자 주문 상세 수정: 성공
- 배차 요청: 성공
- 사용자 홈 배송지도 반영: 성공 (주문 #179 추적 노출)
- 사용자 주문상세 배송지도 반영: 성공

## 확인된 데이터 (최종)
- `status`: `PAID`
- `deliveryStatus`: `PREPARING`
- `deliveryProvider`: `MOCK`
- `externalDeliveryStatus`: `REQUESTED`
- `trackingNumber`: `TRK1091438474`
- `shippingLat/Lng`: `37.501276 / 127.039583`

## 증적 파일
- `docs/test-artifacts/e2e-admin-order-179-before.png`
- `docs/test-artifacts/e2e-admin-order-179-after-dispatch.png`
- `docs/test-artifacts/e2e-home-delivery-reflection.png`
- `docs/test-artifacts/e2e-account-order-179-map.png`

## 이슈/리스크
- 네이버 Directions API 호출은 브라우저 콘솔에서 `502`가 발생했습니다.
- 지도 자체/마커/상태 노출은 정상이며, 경로선은 fallback 동작으로 보입니다.
- 주소 기반 자동 지오코딩(`geocodeAddress`)은 현재 `.env` 값 기준 `null`을 반환해 자동 좌표 보정이 실패했습니다.

## 비고
- 본 E2E는 주문 데이터 실사용 흐름으로 검증했고, 좌표 보정 실패 케이스는 별도로 확인했습니다.
- 사용자 지도 반영까지 끝내기 위해 좌표가 없는 주문은 테스트 중 좌표를 주입해 최종 화면 반영을 검증했습니다.