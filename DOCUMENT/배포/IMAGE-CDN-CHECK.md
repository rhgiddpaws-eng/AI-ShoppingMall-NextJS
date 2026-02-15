# CDN 이미지 점검 가이드

## 1. 전반 흐름

- **업로드:** `scripts/upload_many_products.ts` → presignedUrl API → S3에 `ecommerce/products/{uuid}.webp` 형태로 저장 → DB `Image.original`에 동일 key 저장.
- **앱:** `getCdnUrl(original)` → `NEXT_PUBLIC_AWS_BUCKET_CDN` + `/` + key → Next `Image` 컴포넌트에 전달.
- **Next Image:** 기본적으로 최적화 사용 시 **서버가 CDN URL을 fetch**한 뒤 리사이즈/압축해 브라우저에 전달. 이때 서버→CDN 통신이 실패하면 이미지가 깨짐.

## 2. 점검 순서

### (1) DB key / CDN URL 일치 여부

```bash
npx tsx scripts/checkImageKeys.ts
```

- DB에 저장된 `original` key와, 그걸로 만든 CDN URL을 출력.
- **3) DB key → CDN URL 실제 접근 가능 여부**에서 스크립트가 해당 URL로 HEAD 요청해 200/404 표시.
- 모두 200이면 DB key와 CDN에 올라간 파일 경로는 일치.

### (2) Next 서버에서 CDN fetch 가능 여부

개발 서버 실행 후 브라우저에서:

```
GET http://localhost:3000/api/diagnostic/image-cdn
```

- `fetchOk: true` 이면 **현재 Next 서버**가 CDN에서 이미지를 가져올 수 있음 → Image 최적화 정상 동작 가능.
- `fetchOk: false` 이면 서버→CDN 요청 실패(방화벽, DNS, remotePatterns 등) → 이미지 깨질 수 있음.

### (3) next.config / env

- `next.config.ts`에서 `loadEnvConfig(process.cwd())`로 **로드 시점에 .env를 명시 로드** 후 `remotePatterns`의 hostname 설정.
- CDN URL 변경 시 `.env`의 `NEXT_PUBLIC_AWS_BUCKET_CDN` 수정 후 **dev 재시작** 또는 **프로덕션 재빌드** 필요.

## 3. HTTP vs HTTPS

- **앱만 http로 실행하는 경우** (예: `http://localhost:3000`, nginx 없이 DB만 사용)
  - 상품 이미지는 CDN의 **https** URL로 로드됨.
  - **HTTP 페이지에서 HTTPS 리소스 로드는 mixed content가 아님** → 이미지 로드에 문제 없음.
- **nginx로 HTTPS 서비스할 때**
  - 페이지도 HTTPS, 이미지도 HTTPS → 동일하게 문제 없음.
- mixed content 경고는 **HTTPS 페이지에서 HTTP 리소스를 불러올 때**만 해당.

## 4. nginx 없이 로컬에서만 돌릴 때

- `docker-compose`의 nginx를 띄우지 않고, DB만 띄운 뒤 `npm run dev`로 앱만 실행해도 됨.
- 이때 앱은 `http://localhost:3000`으로 접속되며, CDN 이미지(https)는 위 규칙대로 정상 로드 가능.
