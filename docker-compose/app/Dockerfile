# 빌드 스테이지
FROM node:22.12.0-slim AS builder

WORKDIR /usr/src/app

# pnpm만 전역 설치 (pm2 제거)
RUN npm install -g pnpm

COPY . .

# pnpm으로 의존성 설치
RUN pnpm install --force
# Prisma 클라이언트 생성 추가
RUN npx prisma generate
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


RUN apt-get update && \
    apt-get install -y gnupg && \
    apt-key adv --refresh-keys --keyserver keyserver.ubuntu.com && \
    apt-get install -y inetutils-ping dnsutils vim

# 기본 포트 설정 (환경변수가 없을 경우 9100 사용, app-compose.yml에서 설정 된 PORT가 있다면 그 값을 사용)
ENV PORT=9100

# 환경변수로 설정된 포트를 EXPOSE에 사용
EXPOSE ${PORT}


# CMD ["bash", "-c", "node scripts/modifyPackageJson.cjs remove && pm2-runtime start ecosystem.config.cjs --env production"]

# Next.js 애플리케이션 시작
CMD ["pnpm", "start"]