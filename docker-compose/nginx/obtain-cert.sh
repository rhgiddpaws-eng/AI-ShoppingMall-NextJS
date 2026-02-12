#!/bin/bash
# Let's Encrypt 인증서 발급 (최초 1회 또는 갱신 시)
# - ncott.shop 도메인이 이 서버(80 포트)를 가리켜야 함
# - 이메일: 환경변수 CERTBOT_EMAIL 또는 기본값 admin@ncott.shop

set -e
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

echo ">>> nginx(webserver) 중지 (80 포트 확보)..."
docker compose -f ./nginx-compose.yml stop webserver 2>/dev/null || true

echo ">>> 인증서 발급 중..."
docker compose -f ./nginx-compose.yml run --rm -p 0.0.0.0:80:80 certbot

echo ">>> nginx 재기동..."
docker compose -f ./nginx-compose.yml up -d webserver

echo ">>> 완료. 인증서는 letsencrypt_data 볼륨에 저장되었습니다."
