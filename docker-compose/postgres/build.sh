#!/bin/bash

# 스크립트가 위치한 디렉토리로 이동
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# 도커 빌더 캐시 정리
docker builder prune -f

# 기존 컨테이너 중지 및 제거
docker compose -f ./postgres-compose.yml down

# 캐시 없이 빌드
docker compose -f ./postgres-compose.yml build --no-cache

# 컨테이너 실행
docker compose -f ./postgres-compose.yml up -d