# 네이버 지오코딩 실패 폴백 E2E 검증 (2026-02-14)

## 1) 진단 결론
- 기존 호출 도메인 `https://naveropenapi.apigw.ntruss.com`은 현재 키 기준 `401`로 실패했습니다.
- 교정 도메인 `https://maps.apigw.ntruss.com`으로 지오코딩 호출 시 `200` 및 좌표 응답을 확인했습니다.
- Directions 호출은 `200`이더라도 빈 응답이 발생할 수 있어, API 라우트에서 직선 경로 폴백을 반환하도록 보강했습니다.

## 2) 코드 반영
- 지오코딩 도메인 교정 + 다중 주소 후보 재시도 + 실패 원인 로그
  - `src/lib/naverGeocode.ts`
- Directions 도메인 교정 + 실패/빈응답/파싱오류 폴백 경로 반환
  - `src/app/api/naver/directions/route.ts`
- 좌표 미확보 주문에서도 관리자/사용자 주문 상세 지도 유지(UI 폴백)
  - `src/app/admin/orders/[id]/page.tsx`
  - `src/components/order-history.tsx`

## 3) 수동 E2E 시나리오
- 서버: `pnpm dev --port 3100`
- 계정: `test@test.com / test1234`
- 테스트 주문: `orderId=1002` (배송 주소는 있으나 `shippingLat/Lng = null`)

### 실행 순서
1. 관리자 주문 상세(`/admin/orders/1002`) 진입
2. 주문 수정(송장번호 입력 후 저장) 수행
3. `배차 요청` 실행
4. 사용자 계정(`/account`) → 주문 내역 → 주문 상세 진입
5. 배송 지도 폴백(매장 기준)과 배송 상태 반영 확인

### 결과
- 관리자 수정: 성공
- 배차 요청: 성공
- 사용자 주문 상세 지도 반영: 성공
- 좌표 미확보 상태(`shippingLat/Lng = null`)에서도 배송 추적 흐름 유지 확인

## 4) 최종 데이터 확인 (orderId=1002)
- `status`: `PAID`
- `deliveryStatus`: `PREPARING`
- `deliveryProvider`: `MOCK`
- `externalDeliveryStatus`: `REQUESTED`
- `trackingNumber`: `TRK1092776881`
- `shippingLat/Lng`: `null / null` (의도된 폴백 케이스)

## 5) 스크린샷 증적
- `docs/test-artifacts/e2e-fallback-admin-order-1002-before-dispatch.png`
- `docs/test-artifacts/e2e-fallback-admin-order-1002-after-dispatch.png`
- `docs/test-artifacts/e2e-fallback-account-order-1002-map.png`
