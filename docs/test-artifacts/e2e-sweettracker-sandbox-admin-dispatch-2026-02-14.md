# SweetTracker 샌드박스 관리자 배차 E2E 검증 (2026-02-14)

## 1) 검증 대상(task)
- `DOCUMENT/tasks.md` 5-1 섹션 완료 항목 재검증
- 핵심 시나리오: "실제 키 없이 관리자 주문 상세에서 `courierCode`/`trackingNumber` 입력 후 배차 버튼 클릭"

## 2) 테스트 환경
- 실행 서버: `pnpm dev --port 3100`
- 계정: `test@test.com / test1234`
- 테스트 주문: `orderId=1002` (`status=PAID`)
- 연동 모드: `.env` 기준 `DELIVERY_PROVIDER_MODE=external`, `DELIVERY_EXTERNAL_PROVIDER=SWEETTRACKER`, `SWEETTRACKER_SANDBOX_MODE=true`

## 3) 수행 절차
1. `/login` 로그인 후 `/admin/orders/1002` 진입
2. `택배사 코드`에 `CJ` 입력
3. `송장번호`에 `555566667777` 입력
4. `배차 요청` 버튼 클릭

## 4) 결과
- UI 토스트: "주문 #1002 배차 요청을 전송했습니다." 확인
- 주문 상세 반영:
  - `외부 배송 ID`: `04:555566667777`
  - `공급자`: `KAKAO`(레거시 슬롯, 내부 구현은 SweetTracker)
  - `배송 조회 URL`: `https://tracking.sweettracker.co.kr/#type`
- DB 반영 확인:
  - `Order.externalDeliveryId = 04:555566667777`
  - `Order.trackingNumber = 555566667777`
  - `Order.trackingUrl = https://tracking.sweettracker.co.kr/#type`
  - `DeliveryEvent(eventType=DISPATCH_CREATED)` 최신 레코드 생성 확인

## 5) 증적 파일
- `docs/test-artifacts/e2e-sweettracker-sandbox-before-dispatch-2026-02-14.png`
- `docs/test-artifacts/e2e-sweettracker-sandbox-after-dispatch-2026-02-14.png`

## 6) 결론
- 실제 API 키 없이도(샌드박스 모드) 관리자 화면의 배차 버튼 플로우가 정상 동작함.
- 본 시나리오는 추가 수정 없이 재현 가능.
