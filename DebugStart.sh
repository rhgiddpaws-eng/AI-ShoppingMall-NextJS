#!/bin/bash

# =============================================================================
# DebugStart.sh - 개발 서버 시작 스크립트 (Windows/macOS/Linux 호환)
# 포트 3000에서 실행 중인 프로세스를 종료하고 npm run dev 실행
# =============================================================================

PORT=3000
echo "🚀 개발 서버 시작 중..."
echo "📍 포트 $PORT 확인 중..."

# OS 감지
if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" || "$OSTYPE" == "cygwin" ]]; then
    # Windows (Git Bash, MSYS2, Cygwin)
    echo "🪟 Windows 환경 감지"
    
    # 포트를 사용 중인 프로세스 찾기
    PID=$(netstat -ano | grep ":$PORT " | grep "LISTENING" | awk '{print $5}' | head -n 1)
    
    if [ -n "$PID" ]; then
        echo "⚠️  포트 $PORT 사용 중인 프로세스 발견 (PID: $PID)"
        echo "🔪 프로세스 종료 중..."
        taskkill //PID $PID //F > /dev/null 2>&1
        
        if [ $? -eq 0 ]; then
            echo "✅ 프로세스 종료 완료"
        else
            echo "⚠️  프로세스 종료 실패 (관리자 권한 필요할 수 있음)"
        fi
        
        # 프로세스가 완전히 종료될 때까지 대기
        sleep 2
    else
        echo "✅ 포트 $PORT 사용 가능"
    fi
    
elif [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    echo "🍎 macOS 환경 감지"
    
    # 포트를 사용 중인 프로세스 찾기
    PID=$(lsof -ti:$PORT)
    
    if [ -n "$PID" ]; then
        echo "⚠️  포트 $PORT 사용 중인 프로세스 발견 (PID: $PID)"
        echo "🔪 프로세스 종료 중..."
        kill -9 $PID > /dev/null 2>&1
        
        if [ $? -eq 0 ]; then
            echo "✅ 프로세스 종료 완료"
        else
            echo "⚠️  프로세스 종료 실패"
        fi
        
        # 프로세스가 완전히 종료될 때까지 대기
        sleep 2
    else
        echo "✅ 포트 $PORT 사용 가능"
    fi
    
else
    # Linux
    echo "🐧 Linux 환경 감지"
    
    # 포트를 사용 중인 프로세스 찾기
    PID=$(lsof -ti:$PORT 2>/dev/null || fuser $PORT/tcp 2>/dev/null | awk '{print $1}')
    
    if [ -n "$PID" ]; then
        echo "⚠️  포트 $PORT 사용 중인 프로세스 발견 (PID: $PID)"
        echo "🔪 프로세스 종료 중..."
        kill -9 $PID > /dev/null 2>&1
        
        if [ $? -eq 0 ]; then
            echo "✅ 프로세스 종료 완료"
        else
            echo "⚠️  프로세스 종료 실패"
        fi
        
        # 프로세스가 완전히 종료될 때까지 대기
        sleep 2
    else
        echo "✅ 포트 $PORT 사용 가능"
    fi
fi

echo ""
echo "🎯 개발 서버 실행 중..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# pnpm 우선, 없으면 npx로 로컬 next 실행 (Windows PATH 이슈 방지)
if command -v pnpm &> /dev/null; then
    pnpm run dev
elif command -v npx &> /dev/null; then
    npx next dev
else
    npm run dev
fi
