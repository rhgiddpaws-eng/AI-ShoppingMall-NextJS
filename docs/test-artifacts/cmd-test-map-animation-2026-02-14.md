# cmd-test 증적 (2026-02-14)

## 대상 작업
- DOCUMENT/tasks.md 섹션 `5. 배달 연동` / `5-1. 택배사 연동` 완료 항목 재검증
- 요청: 배송추적(시뮬레이션) 클릭 시 지도에서 출발지 -> 도착지 이동 재현 강화

## 실행 결과
1. `npm run lint`
- 결과: 실패(코드 오류가 아니라 Next.js ESLint 초기설정 대화형 프롬프트 진입)
- 로그 요약: `How would you like to configure ESLint?`

2. `npx tsc --noEmit`
- 결과: 성공(Exit code 0)
- 목적: 지도 컴포넌트/시뮬레이션 API 변경에 대한 타입 안정성 확인

## 코드 점검 포인트
- `src/app/api/admin/orders/[id]/simulate-status/route.ts`
- `REQUESTED` 단계에서 출발지 좌표를 바로 기록
- `IN_TRANSIT`, `ARRIVING`, `DELIVERED` 단계별 보간 좌표 기록

- `src/components/naver-delivery-map.tsx`
- 추적 표시 상태를 `PREPARING`, `IN_DELIVERY`, `ARRIVING`, `DELIVERED`로 확장
- 이전 좌표 -> 현재 좌표 애니메이션(`requestAnimationFrame`) 적용
- 모든 마커/경로를 bounds에 포함해 자동 확대 유지

- `src/app/admin/orders/[id]/page.tsx`
- 지도 라벨을 `내 위치`, `상대방 주소`, `배송 물건`으로 명확화

