# 깃헙 위치
https://github.com/rhgiddpaws-eng/AI-ShoppingMall-NextJS.git


# 배포 가이드: 옵션 A(EC2 + Docker) / 옵션 B(Vercel + Supabase)

이 문서는 다음 두 가지 배포 옵션을 한 코드베이스에서 선택해 사용할 수 있도록 정리한 내용입니다.

- **옵션 A**: EC2 한 대 + docker-compose (nginx + 앱 + Postgres) → HTTPS는 nginx + Let's Encrypt
- **옵션 B**: Vercel(앱) + Supabase(DB) → HTTPS는 Vercel이 자동 처리

---

## 1. 소스 변경 사항 및 설명

두 옵션을 바꿔 가며 테스트·배포하려면 아래 변경만 적용하면 됩니다. 코드 분기 없이 **환경 변수와 실행 방식**만 바꾸면 됩니다.

### 1.1 Prisma `schema.prisma` — binaryTargets 추가

**위치**: `prisma/schema.prisma`  
**목적**: EC2(Docker, Debian 계열)와 Vercel(서버리스, RHEL 계열) 둘 다에서 Prisma 클라이언트가 동작하도록.

**변경**:

```prisma
generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["postgresqlExtensions"]
  binaryTargets   = ["native", "debian-openssl-3.0.x", "rhel-openssl-3.0.x"]
}
```

- `debian-openssl-3.0.x`: Docker 앱 이미지(EC2)용  
- `rhel-openssl-3.0.x`: Vercel(AWS Lambda)용  

**그대로 둘 것**: `datasource db`의 `url = env("DATABASE_URL")`는 수정하지 않음.

---

### 1.2 DB 연결 — 환경 변수만 옵션별로 설정

| 항목 | 옵션 A (EC2 + Docker) | 옵션 B (Vercel + Supabase) |
|------|------------------------|-----------------------------|
| `DATABASE_URL` | 앱 컨테이너 기준: `postgresql://postgres:비밀번호@ecommerce_db:5432/mydb?schema=public` | Supabase Connection pooler (포트 **6543**, Transaction 모드) |
| 설정 위치 | `.env.production` (앱 컨테이너용) 또는 EC2에서 직접 지정 | Vercel 대시보드 Environment Variables |

- **옵션 A**: 앱 컨테이너는 `ecommerce_db` 호스트명으로 Postgres 접속. EC2 안에서만 도커 네트워크로 통신하므로 `ecommerce_db:5432` 사용.
- **옵션 B**: Supabase 대시보드에서 Connection string → Transaction pooler URL 복사 후 `DATABASE_URL`에 설정.

---

### 1.3 `src/app/api/products/recommended/route.ts` — PrismaClient 싱글톤 사용

**목적**: 서버리스(Vercel)에서 PrismaClient 인스턴스를 여러 개 만들지 않도록.

**변경**:

- `const prisma = new PrismaClient()` 제거
- `import prismaClient from '@/lib/prismaClient'` 추가 후, `prisma` 대신 `prismaClient` 사용

(동일 파일에서 `pool`(pgClient)로 raw 쿼리하는 부분은 그대로 두면 됨. 옵션 B에서는 pgClient가 Supabase에 연결되도록 `PG_*` env 또는 `DATABASE_URL`을 쓰도록 설정.)

---

### 1.4 (옵션 B 전용) pgClient — Supabase 사용 시

옵션 B에서는 DB가 Supabase 하나이므로, `src/lib/pgClient.ts`에서 `PG_HOST` 등 대신 **Connection string 하나**를 쓰는 편이 좋습니다.  
예: `Pool`에 `connectionString: process.env.DATABASE_URL` 를 넣고, `PG_*`는 fallback 또는 제거.  
(Vercel 환경 변수에 Supabase 호스트/유저/비밀번호/DB를 각각 넣거나, `DATABASE_URL` 하나만 쓰도록 pgClient를 수정하면 됨.)

---

### 1.5 로컬에서 옵션 바꿔 가며 테스트

- **옵션 A 스타일**:  
  - `docker-compose`로 Postgres + 앱 + nginx 기동  
  - `DATABASE_URL` = 앱 컨테이너 기준 `postgresql://postgres:비밀번호@ecommerce_db:5432/mydb?schema=public`  
  - HTTP만 테스트 시 nginx 없이 앱만 띄우고 `http://localhost:9100` 접속 가능  

- **옵션 B 스타일**:  
  - `pnpm dev` 로 로컬 실행  
  - `DATABASE_URL` = Supabase pooler URL  
  - nginx 불필요, `http://localhost:3000` 으로 테스트  

---

## 2. EC2 배포 시 docker-compose로 HTTPS 적용하는 방법

EC2 한 대를 빌려서 현재 docker-compose로 앱 + Postgres + nginx를 실행하고, **HTTPS(Let's Encrypt)** 를 적용하는 절차입니다.

### 2.1 사전 조건

- EC2 인스턴스 1대 (Ubuntu 22.04 등)
- 도메인: 예) `ecommerce.yes.monster` → EC2 **퍼블릭 IP** (또는 Elastic IP)로 A 레코드 설정
- 보안 그룹: **22(SSH), 80, 443** 인바운드 허용

---

### 2.2 EC2에 Docker 및 Docker Compose 설치

```bash
# SSH 접속 후
sudo apt-get update
sudo apt-get install -y ca-certificates curl
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
sudo usermod -aG docker $USER
# 로그아웃 후 다시 SSH 접속하면 docker 명령 권한 적용
```

---

### 2.3 프로젝트 배포

- 저장소 클론 또는 rsync/scp로 프로젝트 올리기  
- 프로젝트 루트에 `.env.production` 준비 (EC2·Docker용):
  - `DATABASE_URL=postgresql://postgres:원하는비밀번호@ecommerce_db:5432/mydb?schema=public`
  - 그 외 `SESSION_SECRET_1`, `SESSION_SECRET_2`, `OPENAI_API_KEY`, AWS 관련 변수 등 앱에 필요한 값 설정

- Postgres 비밀번호는 `docker-compose/postgres/postgres-compose.yml` 의 `POSTGRES_PASSWORD` 와 동일하게 맞출 것.

---

### 2.3.1 ssl 설정

```bash
apt-get update
apt-get install certbot python3-certbot-nginx
certbot certonly --webroot -w /usr/share/nginx/html -d ecommerce.yes.monster --email milli@molluhub.com --agree-tos --no-eff-email
```

```bash
root@d0d44d21e87a:/# certbot certonly --webroot -w /usr/share/nginx/html -d ecommerce.yes.monster --email milli@molluhub.com --agree-tos --no-eff-email
Saving debug log to /var/log/letsencrypt/letsencrypt.log
Requesting a certificate for ecommerce.yes.monster

Successfully received certificate.
Certificate is saved at: /etc/letsencrypt/live/ecommerce.yes.monster/fullchain.pem
Key is saved at:         /etc/letsencrypt/live/ecommerce.yes.monster/privkey.pem
This certificate expires on 2025-06-11.
These files will be updated when the certificate renews.
Certbot has set up a scheduled task to automatically renew this certificate in the background.

- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
If you like Certbot, please consider supporting our work by:
 * Donating to ISRG / Let's Encrypt:   https://letsencrypt.org/donate
 * Donating to EFF:                    https://eff.org/donate-le
- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
```


### 2.4 Let's Encrypt 인증서 발급 (nginx 기동 전에 한 번)

nginx가 80 포트를 쓰기 전에, **80 포트로 certbot**을 사용해 인증서를 먼저 받습니다.

```bash
# certbot 설치 (Ubuntu)
sudo apt-get install -y certbot

# 도메인으로 인증서 발급 (80 포트 사용 → 이때는 nginx 미기동 상태)
sudo certbot certonly --standalone -d ecommerce.yes.monster
# 이메일 입력, 약관 동의 후 발급됨
# 인증서 위치: /etc/letsencrypt/live/ecommerce.yes.monster/fullchain.pem, privkey.pem
```

발급 후 nginx 설정에서 사용하는 경로가 `/etc/letsencrypt/live/ecommerce.yes.monster/` 이므로, **nginx 컨테이너에서 이 경로를 읽을 수 있게** 볼륨으로 마운트해야 합니다.

---

### 2.5 nginx-compose에 Let's Encrypt 볼륨 마운트 추가

**파일**: `docker-compose/nginx/nginx-compose.yml`

`volumes` 에 다음 한 줄 추가:

```yaml
volumes:
  - ./conf.d:/etc/nginx/conf.d
  - ./nginx.conf:/etc/nginx/nginx.conf
  # Let's Encrypt 인증서 (EC2 호스트에서 certbot으로 발급한 경로)
  - /etc/letsencrypt:/etc/letsencrypt:ro
```

`:ro` 는 읽기 전용 마운트입니다.

---

### 2.6 docker-compose 실행 순서

1. **네트워크 생성** (한 번만)

   ```bash
   docker network create yesnetwork
   ```

2. **Postgres 기동**

   ```bash
   cd docker-compose/postgres
   docker compose -f postgres-compose.yml up -d
   ```

3. **DB 초기화·마이그레이션** (필요 시 프로젝트 루트에서)

   **Prisma 명령어 정리**

   | 단계 | 명령어 | 설명 |
   |------|--------|------|
   | 1 | `npx prisma` | Prisma CLI 사용 (migrate, generate, studio 등) |
   | 2 | `npx prisma init` | `prisma/schema.prisma`·`.env` 생성 (신규 프로젝트 시 한 번) |
   | 3 | `npx prisma migrate dev --name init` | 스키마 정의 후, 로컬에서 마이그레이션 생성·적용 (개발용) |
   | 4 | (compose/환경 변경 시) | `DATABASE_URL`을 docker-compose·배포 환경에 맞게 설정 후 `npx prisma migrate deploy` 실행 |
   | 5 | `npx prisma studio` | DB GUI로 데이터 확인·편집 (브라우저에서 열림) |

   **배포/EC2에서 마이그레이션 적용**

   - EC2에 Node/pnpm 설치되어 있다면 (프로젝트 루트에서):
     ```bash
     DATABASE_URL="postgresql://postgres:비밀번호@localhost:7432/postgres?schema=public" npx prisma migrate deploy
     ```
   - 또는 앱 컨테이너 안에서 마이그레이션 실행하도록 스크립트 구성 가능.
   - **갱신 사항**: Cart, CartItem, Wishlist, WishlistEntry 테이블이 추가된 마이그레이션(`add_cart_and_wishlist` 등)이 있으면 배포 시 반드시 `prisma migrate deploy` 로 적용할 것.

   **DB 백업·복원**

   | 구분 | 명령어 | 설명 |
   |------|--------|------|
   | 전체 백업 | 아래 참고 | 스키마 + 데이터 덤프 (재해 복구용) |
   | 데이터만 백업 | 아래 참고 | 데이터만 덤프 (리셋 후 스키마 동일할 때 복원용) |
   | 전체 복원 | 아래 참고 | 백업 파일로 DB 덮어쓰기 |
   | 데이터만 복원 | 아래 참고 | 마이그레이션 적용 후, 데이터만 넣을 때 사용 |

   **Docker Postgres 컨테이너 기준** (컨테이너 이름 `ecommerce_db`, DB명 `postgres`, 유저 `postgres`):

   ```bash
   # 전체 백업 (스키마 + 데이터)
   docker exec ecommerce_db pg_dump -U postgres postgres > backup_$(date +%Y%m%d_%H%M%S).sql

   # 데이터만 백업 (리셋 후 복원 시 스키마가 동일해야 함)
   docker exec ecommerce_db pg_dump -U postgres -a --column-inserts postgres > backup_data_$(date +%Y%m%d_%H%M%S).sql

   # 전체 복원 (기존 DB 내용이 덮어씌워짐) — 아래 파일명을 실제 백업 파일명으로 바꿀 것
   docker exec -i ecommerce_db psql -U postgres postgres < backup_YYYYMMDD_HHMMSS.sql

   # 데이터만 복원 (테이블은 이미 마이그레이션으로 존재할 때)
   docker exec -i ecommerce_db psql -U postgres postgres < backup_data_YYYYMMDD_HHMMSS.sql
   ```

   **호스트에서 직접** (localhost:7432, `pg_dump`/`psql` 설치 필요):

   ```bash
   # 전체 백업
   PGPASSWORD=postgres pg_dump -h localhost -p 7432 -U postgres postgres > backup_$(date +%Y%m%d_%H%M%S).sql

   # 데이터만 백업
   PGPASSWORD=postgres pg_dump -h localhost -p 7432 -U postgres -a --column-inserts postgres > backup_data_$(date +%Y%m%d_%H%M%S).sql

   # 전체 복원 — 아래 파일명을 실제 백업 파일명으로 바꿀 것
   PGPASSWORD=postgres psql -h localhost -p 7432 -U postgres postgres < backup_YYYYMMDD_HHMMSS.sql

   # 데이터만 복원
   PGPASSWORD=postgres psql -h localhost -p 7432 -U postgres postgres < backup_data_YYYYMMDD_HHMMSS.sql
   ```

   - `migrate reset` 전에 전체 백업을 해두면, 문제 시 복구용으로 사용할 수 있음.
   - 리셋 후 **데이터만** 복원하려면, 리셋으로 적용된 스키마가 백업 시점과 동일해야 함.

4. **앱 이미지 빌드 및 기동**

   ```bash
   cd docker-compose/app
   docker compose -f app-compose.yml up -d --build
   ```

5. **nginx 기동**

   ```bash
   cd docker-compose/nginx
   docker compose -f nginx-compose.yml up -d
   ```

이후 `https://ecommerce.yes.monster` 로 접속해 동작 확인.

---

### 2.7 인증서 갱신 (cron)

Let's Encrypt 인증서는 90일마다 갱신해야 합니다.

```bash
# 갱신 테스트
sudo certbot renew --dry-run

# cron 등록 (매일 새벽 3시 확인)
sudo crontab -e
# 다음 한 줄 추가
0 3 * * * certbot renew --quiet && docker restart webserver
```

(갱신 시 `--standalone` 를 쓰면 80 포트를 쓰므로, nginx를 잠시 끄고 갱신하거나, `--webroot` 방식으로 바꾸면 nginx를 켜 둔 채 갱신할 수 있습니다.)

---

## 3. 요약

| 구분 | 옵션 A (EC2 + Docker) | 옵션 B (Vercel + Supabase) |
|------|------------------------|-----------------------------|
| 앱 실행 | docker-compose (app + nginx + postgres) | Vercel이 빌드·실행 |
| DB | EC2 안 Postgres 컨테이너 | Supabase |
| HTTPS | nginx + Let's Encrypt (본 문서 2장) | Vercel이 자동 처리 |
| 로컬 HTTP 테스트 | nginx 없이 앱만 띄워도 가능 | `pnpm dev` + Supabase URL |

소스는 **1.1~1.3** 적용 후, 옵션에 따라 **환경 변수와 실행 방식**만 바꿔 주면 두 옵션을 모두 사용할 수 있습니다.

---

# 접속 가능한 Supabase 정보

