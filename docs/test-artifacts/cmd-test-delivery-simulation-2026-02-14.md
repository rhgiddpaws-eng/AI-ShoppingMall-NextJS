# cmd-test 배송추적 맵 시뮬레이션 검증 (2026-02-14)

## 대상
- `DOCUMENT/tasks.md` 5번(배달 연동), 5-1번(택배사 연동) 중 완료 항목의 실제 흐름 재검증
- 요청 범위: 관리자 주문 상세의 `상태 새로 고침(시뮬레이션)` 동작, 지도 상태/좌표 변화 확인

## 환경
- 앱 URL: `http://localhost:3000`
- 관리자 계정: `test@test.com` (ADMIN)
- 검증 주문: `#1001`, `#2`

## 자동 점검
1. `npx tsc --noEmit`
- 결과: 성공 (Exit code 0)

2. `npm run lint`
- 결과: 실패 (Exit code 1)
- 사유: Next.js ESLint 초기 설정 인터랙티브 프롬프트가 떠서 CI 방식으로 바로 실행 불가

## 브라우저 E2E 검증 결과

### 주문 #1001 (관리자 상세)
- Step0: `상태: 배송중`, `37.48078, 126.89711`
- Step1: `상태: 배송중`, `37.48078, 126.89711`
- Step2: `상태: 배송중`, `37.48753, 126.89171`
- Step3: `상태: 도착중`, `37.49353, 126.88691`
- Step4: `상태: 배송완료`, `37.49578, 126.88511`

### 주문 #2 (관리자 상세)
- Step0: `상태: 배송중`, `37.48078, 126.89711`
- Step1: `상태: 배송준비`, `37.48078, 126.89711`
- Step2: `상태: 배송중`, `37.48416, 126.89981`
- Step3: `상태: 도착중`, `37.48716, 126.90221`
- Step4: `상태: 배송완료`, `37.48828, 126.90311`

## DB 반영 확인 (주문 #2)
- `deliveryStatus`: `DELIVERED`
- `externalDeliveryStatus`: `DELIVERED`
- `deliveryProvider`: `KAKAO`
- `externalDeliveryId`: `SIM-2`
- `riderLat/riderLng`: `37.488283 / 126.90311`
- 최근 `RiderLocationLog` 4건이 `KAKAO_SIMULATION` 소스로 순차 저장됨

## 증적 파일
- `docs/test-artifacts/admin-order-2-step0-before.png`
- `docs/test-artifacts/admin-order-2-step1-after-click.png`
- `docs/test-artifacts/admin-order-2-step2-after-click.png`
- `docs/test-artifacts/admin-order-2-step3-after-click.png`
- `docs/test-artifacts/admin-order-2-step4-after-click.png`
- `docs/test-artifacts/admin-order-1001-abs-test.png`

## 판정
- 배송추적 맵 시뮬레이션: **PASS**
- 관리자 화면 한글 텍스트: 본 검증 세션에서는 깨짐 재현 안 됨 (페이지 내 한국어 정상 노출 확인)
