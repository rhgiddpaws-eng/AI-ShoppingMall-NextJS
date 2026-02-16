# 빌드 스테이지
FROM node:22.12.0-slim AS builder

WORKDIR /usr/src/app

# Prisma가 요구하는 OpenSSL (slim 이미지에 없음 → generate 시 에러 방지)
RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

# pnpm만 전역 설치 (pm2 제거)
RUN npm install -g pnpm

COPY . .

# pnpm으로 의존성 설치
RUN pnpm install --force
# Prisma 클라이언트 생성 (@prisma/client 6.4.1과 동일 버전 CLI 사용 → WASM 경로 불일치 방지)
RUN npx prisma@6.4.1 generate
# Next 빌드 시 페이지 수집 단계에서 OpenAI 등 모듈이 로드됨 → 필수 env 더미 설정 (실행 시에는 compose env_file로 덮어씀)
ENV OPENAI_API_KEY=dummy-for-build
ENV DATABASE_URL=postgresql://postgres:postgres@host:5432/postgres
# 애플리케이션 빌드
RUN pnpm run build

# 빌드 완료 후 .env.production 파일 삭제
RUN rm -f .env.production

# 실행 스테이지
FROM node:22.12.0-slim 

WORKDIR /usr/src/app

# 타임존 설정을 실행 스테이지로 이동
ARG DEBIAN_FRONTEND=noninteractive
ENV TZ=Asia/Seoul


# pnpm 설치
RUN npm install -g pnpm

COPY --from=builder /usr/src/app .

# OpenSSL (Prisma 클라이언트 런타임) + 기타 유틸
RUN apt-get update && \
    apt-get install -y openssl ca-certificates gnupg inetutils-ping dnsutils vim && \
    rm -rf /var/lib/apt/lists/*

# 기본 포트 설정 (환경변수가 없을 경우 9100 사용, app-compose.yml에서 설정 된 PORT가 있다면 그 값을 사용)
ENV PORT=9100

# 환경변수로 설정된 포트를 EXPOSE에 사용
EXPOSE ${PORT}


# CMD ["bash", "-c", "node scripts/modifyPackageJson.cjs remove && pm2-runtime start ecosystem.config.cjs --env production"]

# Next.js 애플리케이션 시작
CMD ["pnpm", "start"]