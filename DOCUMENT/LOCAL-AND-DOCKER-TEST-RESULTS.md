# 로컬/도커 테스트 수정 사항 및 이상 항목

## 적용한 수정 사항

### 1. `ReferenceError: Button is not defined` (src/app/page.tsx)
- **원인**: `Button` 사용处에 import 없음.
- **수정**: `import { Button } from '@/components/ui/button'` 추가.

### 2. `Module not found: Can't resolve 'jose'`
- **원인**: `node_modules` 미설치 또는 불완전 설치.
- **수정**: `pnpm install`로 의존성 설치. (로컬에서 `jose` 포함 확인됨.)

### 3. 클라이언트에서 `@prisma/client` import 시 빌드 오류
- **원인**: `order-history.tsx`, `account/page.tsx`, `admin/products/new/page.tsx` 등 클라이언트 컴포넌트에서 `@prisma/client`(OrderStatus, PaymentStatus, Category 등)를 import하면 번들에 Prisma가 포함되며 `.prisma/client/index-browser`를 찾지 못함.
- **수정**:
  - `src/lib/orderEnums.ts` 추가: Prisma enum과 동일한 값의 클라이언트용 상수/타입 (OrderStatus, PaymentStatus, DeliveryStatus, Category).
  - `order-history.tsx`: `@prisma/client` → `@/lib/orderEnums`로 변경.
  - `deliveryStatus.ts`: `@prisma/client` → `@/lib/orderEnums`로 변경.
  - `admin/products/new/page.tsx`: `Category` import를 `@/lib/orderEnums`로 변경.

### 4. 서버/번들에서 `Cannot find module '.prisma/client/default'` (pnpm 환경)
- **원인**: pnpm 구조에서 Prisma Client가 `.pnpm/.../node_modules/.prisma/client`에 생성되고, `@prisma/client`가 `.prisma/client`를 자신 디렉터리 기준으로 찾지 못함.
- **수정**: `prisma/schema.prisma`의 generator에 `output = "../node_modules/@prisma/client/.prisma/client"` 지정하여 `@prisma/client` 패키지 내부에 생성되도록 함.
- **추가**: `next.config.ts`에 `serverExternalPackages: ['@prisma/client', 'prisma']` 유지 (서버 번들에서 Prisma 외부화).

### 5. Docker 빌드 시 `scripts/checkImageKeys.ts` 타입 오류
- **원인**: Next 빌드가 `scripts/`까지 타입 검사하며, custom output 사용 시 `@prisma/client`에서 `PrismaClient` 타입을 찾지 못하는 이슈.
- **수정**: `tsconfig.json`의 `exclude`에 `"scripts"` 추가하여 Next 빌드 시 scripts 폴더 제외.

---

## 로컬 테스트 결과 (구글/카카오/네이버 지도 KEY 제외)

- **홈 (/)**: 로드 성공. (Button 수정·jose 설치·orderEnums 적용 후)
- **로그인 (/login)**: dev 서버가 이전에 삭제된 `.next` 캐시나 손상된 chunk를 참조하는 상태에서 500·404 발생. **dev 서버 완전 재시작 및 `rm -rf .next` 후 재시작 필요.**
- **API (/api/products, /api/user/cart, /api/user/wishlist)**: Prisma 경로 수정 후 서버 재시작 전에는 `Cannot find module '.prisma/client/default'`로 500. **서버 재시작 후 정상 동작 예상.**

---

## 도커 테스트 결과

- **Postgres**: `docker compose -f docker-compose/postgres/postgres-compose.yml up -d` 정상 기동.
- **앱 빌드**: `docker compose -f docker-compose/app/app-compose.yml up -d --build` 실행 시:
  - Prisma generate는 성공 (`output = "../node_modules/@prisma/client/.prisma/client"` 적용).
  - Next 빌드 단계에서 `scripts/checkImageKeys.ts`의 `PrismaClient` 타입 오류로 실패 → **tsconfig exclude에 `scripts` 추가로 해결.**

**tsconfig 수정 후 앱 이미지 재빌드 필요:**
```bash
docker compose -f docker-compose/app/app-compose.yml up -d --build
```

---

## 이상 항목 요약 (추가 확인 권장)

1. **로컬 dev 서버**
   - `.next` 삭제 후 **반드시 dev 서버를 한 번 종료했다가 다시 `pnpm dev`로 시작**할 것.
   - 그렇지 않으면 로그인·API 등에서 500 또는 chunk 404가 계속 날 수 있음.

2. **도커 앱 빌드**
   - `tsconfig.json`에 `scripts` exclude 적용 후 **앱 이미지 재빌드** 필요.
   - 빌드가 길어질 수 있음 (2분 이상).

3. **Next.js / Prisma 경고**
   - Next.js 15.2.1 보안 취약점 패치 버전 업그레이드 권장.
   - Prisma 6.4.1 → 7.x 메이저 업그레이드 시 스키마/호환성 검토 필요.

4. **구글/카카오/네이버 지도**
   - KEY 필요 기능은 로컬/도커 테스트 범위에서 제외됨. KEY 설정 후 별도 검증 필요.

5. **peer dependency**
   - `@tensorflow/tfjs` 등 upscaler 관련 peer dependency 경고는 기존과 동일. 기능 검증 시 참고.

---

## 권장 순서 (로컬 에러 없이 테스트)

1. 터미널에서 기존 `npm run dev` / `pnpm dev` 중지.
2. `rm -rf .next` (Windows: `Remove-Item -Recurse -Force .next` 등).
3. `pnpm dev` 재시작.
4. 브라우저에서 `/`, `/login`, `/cart`, `/category/men` 등 주요 경로 확인.
5. 이상 없으면 도커: `docker network create yesnetwork`, postgres up, app `up --build`.
