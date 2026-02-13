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

## 5. 배달 연동 (네이버 지도 + 상태)

- [x] Prisma: DeliveryStatus enum, Order.deliveryStatus, shippingAddress, shippingLat/Lng 마이그레이션
- [x] 주문 생성 시 deliveryStatus 기본값(ORDER_COMPLETE) 적용
- [x] 관리자 주문 상세 GET/PUT(Prisma), 배달 상태 변경 API
- [x] 고객 주문 상세(OrderHistory): 배달 상태 뱃지, 배송지 표시
- [x] 관리자 주문 상세: 상태 변경 Select(주문완료→배달완료), 좌표 placeholder
- [ ] 네이버 지도 컴포넌트 (NEXT_PUBLIC_NAVER_MAP_CLIENT_ID 설정 후 연동)

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
- [ ] 상품/모델 이미지 고해상도·라이선스 확보 (스크립트·DOCUMENT 참고)

## 9. SNS 로그인

- [x] 구글로그인 (OAuth: /api/auth/google, callback, DOCUMENT/SNS-LOGIN-OAUTH.md)
- [x] 카카오로그인 (OAuth: /api/auth/kakao, callback)
