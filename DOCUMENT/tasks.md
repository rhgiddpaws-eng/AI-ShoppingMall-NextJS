# 도커/인증/배달/UI 종합 개선 — Task 체크리스트

진행 시 해당 항목을 `[x]`로 체크합니다.

---

## 0. 작업 환경

- [x] Push 후 로컬에서 작업 (도커 중지, `pnpm dev`로 개발·검증)
- [x] DOCUMENT/tasks.md 생성 완료

---

## 1. 로그인 없이 구매·장바구니 (심각)

- [x] 장바구니/결제 UI에 "로그인하면 서버에 저장됩니다" 문구 추가
- [x] checkout 로그인 필수 유지 확인
- [x] 도커/nginx 세션 쿠키 도메인·SameSite 문서화 (DOCKER-ISSUES-AND-ROADMAP.md 체크리스트)
- [x] 도커 빌드 후 비로그인 → 결제 시도 → 로그인 리다이렉트 검증

---

## 2. 상세페이지 추천 상품 (도커)

- [x] 추천 API: Prisma $queryRawUnsafe + DATABASE_URL 단일 연결로 전환 (pgClient 제거)
- [x] 도커 env: PG_HOST=ecommerce_db, PG_PORT=5432 (다른 pgClient 사용처 있을 시만)
- [x] 도커에서 추천 상품 로드 성공 검증

---

## 3. 관리자 "홈으로 돌아가기"

- [x] 사이드바 "홈으로 돌아가기" 링크 적용 완료 (추가 작업 없음)

---

## 4. JWT 전환

- [x] lib/jwt.ts (발급·검증) 추가
- [x] api/login/route.ts 응답에 JWT 추가
- [x] API 라우트: getAuthFromRequest (JWT + 세션 fallback) 적용 (cart, wishlist, confirm, admin, orders, inquiries)
- [x] 클라이언트: 로그인 후 token 저장, authFetchOpts / checkout success에서 Authorization 헤더
- [x] middleware.ts 공개 경로 제외 JWT 검증 (선택)

---

## 5. 배달 연동 (실주문 배송 상태 + 네이버 지도)

- [x] Prisma: DeliveryStatus enum, Order.deliveryStatus, shippingAddress, shippingLat/Lng 마이그레이션
- [x] 주문 생성 시 deliveryStatus 기본값(ORDER_COMPLETE) 적용
- [x] 관리자 주문 상세 GET/PUT(Prisma), 배달 상태 변경 API
- [x] 고객 주문 상세(OrderHistory): 배달 상태 뱃지, 배송지 표시
- [x] 관리자 주문 상세: 상태 변경 Select(주문완료→배달완료), 좌표 placeholder
- [x] 네이버 지도 컴포넌트 + 경로 API 연동 (키 설정 시 지도 표시)
- [x] 좌표 누락 주문 보완: 관리자 저장/배차/활성배송 API에서 주소 기반 지오코딩 fallback 적용
- [x] 좌표 검증 강화: 위도·경도 짝 입력 및 범위 검증(위도 -90~90, 경도 -180~180)
- [x] 배달 지도 완성 검증: 타입체크 및 API 스모크 테스트로 좌표 fallback/상태 반영 확인
- [x] 네이버 지오코딩 실패 원인 진단: 키/권한/호출 조건(도메인, API 경로, 응답코드) 확인
- [x] 지오코딩/경로 실패 fallback 강화: 좌표 미확보 주문도 배송 추적 흐름이 유지되도록 보완
- [x] fallback 케이스 수동 E2E 통과: 관리자 주문 수정 → 배차 → 사용자 배송지도 반영 재검증

---

## 5-1. 택배사 연동 (추적 기능)

- [x] Prisma: Order 택배 필드(deliveryProvider, externalDeliveryStatus, courierCode, trackingNumber, trackingUrl, dispatchedAt) 및 추적 로그 테이블(DeliveryEvent, RiderLocationLog) 추가
- [x] 관리자 배차 API: `/api/admin/orders/[id]/dispatch` (결제완료 주문 검증 후 공급자 배차 요청)
- [x] 공급자 어댑터 구조: `providerAdapter` + `providerRegistry` (MOCK/KAKAO/BAROGO/VROONG/THINKING/INTERNAL)
- [x] 배송 웹훅 API: `/api/webhooks/delivery/[provider]` (서명 검증, dedupeKey 중복 방지, 외부 상태 매핑)
- [x] 주문 추적 반영: 송장번호/추적URL/외부상태 + 라이더 좌표(riderLat/riderLng/riderUpdatedAt) 갱신
- [x] 사용자 추적 API/UI: `/api/user/orders/active-delivery`, `/api/user/orders/completed-deliveries`, 홈/주문내역 지도 연동
- [x] 라이더 기능: `/rider`, `/api/rider/assignments`, `/api/rider/location`
- [x] SweetTracker 실연동 구현: `trackingInfo`(t_key/t_code/t_invoice) 기반 배차(create)·조회(get) 표준 매핑
- [x] 레거시 KAKAO 슬롯 호환: `kakaoProvider` 경로는 유지하고 내부 구현은 SweetTracker provider로 교체
- [x] 관리자 배차 UX 보완: 배차 버튼에서 `courierCode/trackingNumber`를 즉시 전달해 저장 없이 연동 가능
- [x] 가상 키 샌드박스 모드: `SWEETTRACKER_SANDBOX_MODE=true`에서 외부 호출 없이도 동일 포맷 응답으로 E2E 가능
- [ ] 운영 키 기준 E2E: 관리자 배차 → SweetTracker 실조회 반영 → 사용자 추적 화면 업데이트 검증/증적
- [ ] 운영 실연동 점검: `.env`(dev) / `.env.production`(deploy) 분리 기준으로 실제 SweetTracker 키로 E2E 검증

---

## 6. 관리자 차트 uPlot

- [x] uplot 패키지 추가
- [x] 대시보드 매출 추이 Recharts → SalesChartUplot(uPlot) 교체
- [x] 주/월/연 탭 및 /api/admin/dashboard?period= 유지
- [x] 차트 시각화 개선 (추세선, 폰트 크기, X축 라벨 버그 수정)

---

## 7. 반응형 (긴 글자)

- [x] NavBar: 모바일 햄버거 → Sheet 드로어로 카테고리 링크
- [x] 상품 카드: line-clamp-2, min-w-0, break-words
- [x] 상품 상세: 제목 line-clamp-2, 설명 break-words
- [x] 장바구니 아이템: min-w-0, line-clamp-2, break-words
- [x] admin 주문 상세: truncate/break-words 적용

---

## 8. 디자인·퀄리티

- [x] 메인 히어로: HeroSection 컴포넌트 (동영상 옵션 + 이미지 fallback), framer-motion 오버레이
- [x] 동영상: NEXT_PUBLIC_HERO_VIDEO_URL 또는 videoSrc prop, DOCUMENT/HERO-VIDEO-AND-ASSETS.md
- [x] 모바일: 히어로 CTA min-h-[44px], 반응형 타이포
- [ ] 상품/모델 이미지 고해상도 확보 (스크립트·DOCUMENT 참고)

## 9. SNS 로그인

- [x] 구글로그인 (OAuth: /api/auth/google, callback, DOCUMENT/SNS-LOGIN-OAUTH.md)
- [x] 카카오로그인 (OAuth: /api/auth/kakao, callback)
