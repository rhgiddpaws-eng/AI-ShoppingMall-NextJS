#!/bin/bash
# Let's Encrypt 인증서 갱신 (90일마다 한 번씩 실행 권장)
# - ncott.shop 도메인이 이 서버(80 포트)를 가리켜야 함 (Route 53 A 레코드 → 내 공인 IP)
# - 만료 30일 이내면 갱신, 그렇지 않으면 "no renewal needed" 로 끝남

set -e
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

echo ">>> nginx(webserver) 중지 (80 포트 확보)..."
docker compose -f ./nginx-compose.yml stop webserver 2>/dev/null || true

echo ">>> 인증서 갱신 확인 중..."
docker compose -f ./nginx-compose.yml run --rm -p 0.0.0.0:80:80 --entrypoint certbot certbot renew --standalone --quiet

echo ">>> nginx 재기동..."
docker compose -f ./nginx-compose.yml up -d webserver

echo ">>> 완료."
