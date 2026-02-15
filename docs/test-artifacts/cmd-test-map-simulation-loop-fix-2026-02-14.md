# cmd-test 배송맵 시뮬레이션 반복 검증 (2026-02-14)

## 요청
- 상태 글자는 바뀌는데 맵 좌표가 안 바뀌는 문제를 해결하고,
- 실제 관리자 화면에서 시뮬레이션이 반복 동작할 때까지 수정/재테스트

## 완료 태스크 기준
- `DOCUMENT/tasks.md` 5번 배달 연동(지도/상태 반영)
- `DOCUMENT/tasks.md` 5-1번 택배사 연동(라이더 좌표 반영)

## 원인 정리
1. 배송지 좌표가 매장 좌표와 같은 값으로 저장된 주문은 실제 목적지로 잘못 인식되어 좌표가 고정됨.
2. 외부 상태가 `DELIVERED`이면 시뮬레이션 버튼을 눌러도 다음 상태가 그대로 `DELIVERED`라 변화가 멈춤.

## 수정 내용
- 파일: `src/app/api/admin/orders/[id]/simulate-status/route.ts`
1. 배송 좌표가 매장 좌표와 동일하면 목적지 후보에서 제외하도록 조건 강화
2. 테스트 기본 주소(`테스트 배송지 미입력...`)는 지오코딩 생략
3. `DELIVERED`에서 시뮬레이션 버튼 재클릭 시 상태 흐름을 `REQUESTED`로 순환 재시작

## 재검증 결과
1. 기본 시나리오(배차 후 시뮬레이션)
- `배송준비 37.48078,126.89711`
- `배송중 37.48416,126.89981`
- `도착중 37.48716,126.90221`
- `배송완료 37.48828,126.90311`

2. 지오코딩 실패 주소 시나리오(사용자 제보 유사 조건)
- 주소: `지오코딩실패 테스트 주소 ...`
- 좌표가 매장값이어도 시뮬레이션 진행 시 좌표가 단계별로 변경됨 확인

3. 배송완료 이후 반복 클릭 시나리오
- `도착중 -> 배송완료 -> 배송준비 -> 배송중 -> 도착중`
- 좌표도 함께 순환 갱신됨 확인

## 자동 점검
- `npx tsc --noEmit`: 성공

## 증적 파일
- `docs/test-artifacts/admin-order-2-map-static-repro.png`
- `docs/test-artifacts/admin-order-2-map-move-step0-after-dispatch.png`
- `docs/test-artifacts/admin-order-2-map-move-step1-after-sim.png`
- `docs/test-artifacts/admin-order-2-map-move-step2-after-sim.png`
- `docs/test-artifacts/admin-order-2-map-move-step3-after-sim.png`
- `docs/test-artifacts/admin-order-2-geocodefail-step0-before.png`
- `docs/test-artifacts/admin-order-2-geocodefail-step1-after-sim.png`
- `docs/test-artifacts/admin-order-2-geocodefail-step2-after-sim.png`
- `docs/test-artifacts/admin-order-2-geocodefail-step3-after-sim.png`
- `docs/test-artifacts/admin-order-2-cycle-step0-before.png`
- `docs/test-artifacts/admin-order-2-cycle-step1-after.png`
- `docs/test-artifacts/admin-order-2-cycle-step2-after.png`
- `docs/test-artifacts/admin-order-2-cycle-step3-after.png`
- `docs/test-artifacts/admin-order-2-cycle-step4-after.png`
