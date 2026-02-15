# cmd-test 배송추적 맵 회귀 검증 (2026-02-14)

## 대상 완료 태스크
- `DOCUMENT/tasks.md` 5번(배달 연동) 지도/시뮬레이션 흐름
- `DOCUMENT/tasks.md` 5-1번(택배사 연동) 주문 추적 좌표 반영

## 재현 이슈
- 관리자 주문 상세에서 `상태 새로 고침(시뮬레이션)` 클릭 시
  - 상태 글자: 변경됨
  - 맵 좌표: 고정됨(`37.48078, 126.89711`)

## 원인
- 테스트 기본 주소 문구 + 매장 좌표가 실제 배송 목적지로 인식되어,
  시뮬레이션 API가 동일 좌표를 계속 반환함.

## 수정
- 파일: `src/app/api/admin/orders/[id]/simulate-status/route.ts`
- 테스트 기본 주소(`테스트 배송지 미입력`) + 매장 동일 좌표 조합은
  실제 배송지로 취급하지 않도록 조건 분기 추가.
- 해당 케이스에서는 지오코딩을 생략하고 주문별 fallback 목적지를 계산하도록 변경.

## 검증 결과
1. 수정 전 재현(실패)
- `before`: `상태: 배송준비`, `37.48078, 126.89711`
- `after-1`: `상태: 배송중`, `37.48078, 126.89711`
- `after-2`: `상태: 도착중`, `37.48078, 126.89711`
- `after-3`: `상태: 배송완료`, `37.48078, 126.89711`

2. 수정 후 재검증(성공)
- `step0-after-dispatch`: `상태: 배송완료`, `37.48078, 126.89711`
- `step1-after-sim`: `상태: 배송중`, `37.48416, 126.89981`
- `step2-after-sim`: `상태: 도착중`, `37.48716, 126.90221`
- `step3-after-sim`: `상태: 배송완료`, `37.48828, 126.90311`

## 자동 점검
- `npx tsc --noEmit`: 성공

## 증적 파일
- `docs/test-artifacts/admin-order-2-map-static-repro.png`
- `docs/test-artifacts/admin-order-2-map-move-step0-after-dispatch.png`
- `docs/test-artifacts/admin-order-2-map-move-step1-after-sim.png`
- `docs/test-artifacts/admin-order-2-map-move-step2-after-sim.png`
- `docs/test-artifacts/admin-order-2-map-move-step3-after-sim.png`
