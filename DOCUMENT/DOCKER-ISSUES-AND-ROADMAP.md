# 도커 빌드/실행 시 심각한 문제 정리 및 로드맵

도커로 앱을 빌드·실행했을 때 발생하는 문제와 해결, 그리고 향후 작업(JWT·배달 연동)을 정리한 문서입니다.

---

## 1. 로그인 없이 구매·장바구니 동작 문제

### 현상
- 로그인하지 않았는데 결제가 진행되고, 장바구니에 저장되는 것처럼 보임.

### 원인
1. **장바구니**: 비로그인 시 `/api/user/cart`는 401을 반환하지만, 클라이언트는 API 실패 시 **로컬(localStorage) 장바구니**로 fallback합니다. 따라서 "장바구니에 담긴다"는 것은 브라우저 로컬 상태에만 저장된 것입니다.
2. **결제**: 결제 성공 페이지에서 `/api/tosspayments/confirm` 호출 시 **쿠키(credentials)**를 보내지 않거나, 도커 환경에서 세션 쿠키가 전달되지 않으면 `getSession()`이 빈 값이 됩니다. 이전에는 비로그인 시에도 API가 200으로 "로그인이 필요합니다"만 반환해, 클라이언트가 결제 완료로 처리하는 문제가 있었습니다.

### 적용된 수정
- **`/api/tosspayments/confirm`**: 비로그인이면 **401** 반환.
- **`/checkout/success`**: confirm 호출 시 `credentials: 'include'` 추가, 실패 시 에러 메시지 표시.
- **`/checkout`**: **로그인 필수**. 비로그인 시 `/login?returnUrl=/checkout`으로 리다이렉트.

### 도커에서 세션이 비어 보일 때
- 리버스 프록시/도메인에 따라 쿠키(SameSite, Secure, 도메인)가 전달되지 않을 수 있습니다. JWT 전환 시 Authorization 헤더 사용으로 완화 가능합니다.

**세션 쿠키 점검 체크리스트 (도커 배포 시)**
- [ ] nginx 등 리버스 프록시에서 앱으로 요청 전달 시 `Host` / `X-Forwarded-*` 헤더 유지
- [ ] 앱과 프론트가 같은 도메인(또는 부모 도메인)에서 서빙되면 쿠키 도메인 불일치 방지
- [ ] HTTPS 사용 시 세션 쿠키 `Secure` 옵션 확인 (iron-session 설정)
- [ ] `SameSite=Lax` 또는 `None`(크로스 사이트 필요 시) 확인

---

## 2. 상세페이지 추천 상품 로드 실패

### 현상
- 상품 상세 페이지에서 "추천 상품을 가져오는데 실패했습니다" 메시지가 표시됨. 도커에서만 발생할 수 있음.

### 원인
추천 상품 API(`GET /api/products/recommended`)는:
1. **OpenAI API** (`OPENAI_API_KEY`)로 상품명 임베딩 생성.
2. **pgvector**용 **pgClient**로 유사 상품 검색. pgClient는 **PG_HOST, PG_PORT** 등 환경 변수를 사용합니다.

도커 안에서 앱이 실행될 때 `.env.production`에 `PG_HOST=localhost`, `PG_PORT=7432`로 되어 있으면, 컨테이너 입장에서 `localhost`는 앱 자신이므로 Postgres(예: `ecommerce_db`)에 연결할 수 없습니다. Prisma는 `DATABASE_URL`(ecommerce_db:5432)을 쓰므로 정상이고, 추천 API만 PG_* 설정을 쓰기 때문에 도커에서만 실패합니다.

### 해결
- 도커로 실행할 때 **PG_HOST=ecommerce_db**, **PG_PORT=5432**, **OPENAI_API_KEY** 설정.
- 로컬용과 도커용 env를 분리하거나, docker-compose에서 environment로 덮어쓰기.

---

## 3. 관리자 페이지 "홈으로 돌아가기" 버튼

- **적용 완료**: 관리자 사이드바 상단에 "홈으로 돌아가기" 링크(`/`)가 추가되어 있습니다.

---

## 4. JWT 방식으로 전환

### 현재
- iron-session 기반 쿠키 세션. Edge 미들웨어에서는 getSession() 사용 불가.

### JWT 전환 시
- 로그인 성공 시 JWT 발급(access + optional refresh).
- API는 Authorization 헤더에서 JWT 검증 후 사용자 식별.
- getSession() 사용처를 JWT 기반으로 교체(장바구니, 주문, 결제 confirm, 관리자 API 등).
- 쿠키 도메인/경로 이슈 완화, 모바일/다른 클라이언트에서 동일 토큰 사용 가능.

구체적 설계(라이브러리, payload, 만료·refresh)는 별도 문서 권장.

---

## 5. 배달 연동 (네이버 지도 + 배달 상태 추적)

### 요구사항
- 네이버 지도로 **주문자 위치 ↔ 판매처 위치**를 지도(D2D)에서 표시.
- 배달 상태: 주문완료 → 배송준비 → 배달중 → 도착중 → 배달완료 추적.

### 구현 참고
1. **네이버 지도 API**: 네이버 클라우드 플랫폼 Maps API로 출발/도착 좌표, 경로·마커 표시.
2. **배달 상태**: Order 스키마에 deliveryStatus 필드 추가, 관리자/배달 앱에서 상태 변경, 고객 주문 상세에서 노출.
3. **실제 배달사 연동**: 배민/요기요 등은 파트너 가입·API 별도. 내부 상태만 관리하고 지도로 "주문자 ↔ 판매처" 위치만 먼저 구현하는 방식 권장.

별도 "배달/지도 연동 설계" 문서에서 단계별 정리 권장.

---

## 체크리스트 (도커 배포 시)

- [ ] PG_HOST, PG_PORT 도커 네트워크에 맞게 설정 (ecommerce_db, 5432)
- [ ] OPENAI_API_KEY 컨테이너에 전달
- [ ] SESSION_SECRET_1, SESSION_SECRET_2 설정
- [ ] 결제·결제 승인 API 로그인 필수 확인
- [ ] (선택) 세션 쿠키 도메인·SameSite 확인
