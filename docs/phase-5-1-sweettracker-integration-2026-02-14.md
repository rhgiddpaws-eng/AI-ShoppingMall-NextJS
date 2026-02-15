# Phase 5-1 SweetTracker 연동 작업 로그 (2026-02-14)

## 1) 변경 목적
- 기존 `kakaoProvider` 스텁을 실제 택배 조회 API로 교체
- 사용자 요청 URL 기준을 `https://tracking.sweettracker.co.kr/#type`로 통일

## 2) 적용 내용
- `src/lib/courier/providers/sweetTrackerProvider.ts` 추가
  - `GET /api/v1/trackingInfo` 호출(`t_key`, `t_code`, `t_invoice`)
  - 조회형 API 결과를 내부 배송 상태(`REQUESTED`, `IN_TRANSIT`, `ARRIVING`, `DELIVERED`)로 변환
- `src/lib/courier/providers/kakaoProvider.ts`는 레거시 경로 호환 래퍼로 변경
- `src/lib/courier/providerRegistry.ts`
  - KAKAO 슬롯 내부 구현을 SweetTracker provider로 교체
  - `DELIVERY_EXTERNAL_PROVIDER=SWEETTRACKER` 별칭 지원
- `src/app/api/admin/orders/[id]/dispatch/route.ts`
  - 배차 요청 JSON에서 `courierCode`, `trackingNumber` 파싱
  - KAKAO 슬롯(현재 SweetTracker)에서 코드/송장 누락 시 409 반환
- `src/app/admin/orders/[id]/page.tsx`
  - 배차 버튼에서 `courierCode/trackingNumber` 즉시 전송

## 3) 환경 변수
- `DELIVERY_PROVIDER_MODE=external`
- `DELIVERY_EXTERNAL_PROVIDER=SWEETTRACKER` (또는 KAKAO)
- `SWEETTRACKER_API_KEY=<발급받은 키>`
- `SWEETTRACKER_BASE_URL=https://info.sweettracker.co.kr`
- `SWEETTRACKER_WEBHOOK_SECRET=<선택>`
- `SWEETTRACKER_DEFAULT_COURIER_CODE=<선택, getDelivery fallback용>`
- `SWEETTRACKER_SANDBOX_MODE=true|false` (키가 없을 때 가상 응답 테스트)
- `SWEETTRACKER_SANDBOX_DELAY_MS=150` (샌드박스 지연시간, 선택)

## 4) 키 발급 경로
- 스마트택배 API 페이지: https://tracking.sweettracker.co.kr/#type
- API 문서: http://info.sweettracker.co.kr/apidoc/
- OpenAPI 문서(JSON): https://info.sweettracker.co.kr/v2/api-docs

## 5) 테스트 결과
- 타입체크: `pnpm exec tsc --noEmit` 통과
- 스모크: provider 매핑/요청 파라미터/오류 핸들링 테스트 통과
- 샌드박스 E2E: 운영 키 없이도 배차/상태 반영 흐름 검증 가능
- 실제 운영 키 E2E: 키 미제공으로 미실행(차단)
