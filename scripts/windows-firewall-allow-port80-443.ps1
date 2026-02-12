# Windows 방화벽: TCP 80, 443 인바운드 허용 (HTTP + HTTPS, 도메인/개인/공용 모두 적용)
#
# ★ 이 파일은 PowerShell 전용입니다. Git Bash/일반 터미널에서 직접 실행하면 "command not found" 에러 납니다.
#
# 실행 방법 (둘 중 하나):
#   1) Windows 시작 메뉴 → "PowerShell" 검색 → 우클릭 → "관리자 권한으로 실행"
#      → cd "D:\AAA FastCampus Source AAA\Web\NOW\AI-ShoppingMall-NextJS"
#      → .\scripts\windows-firewall-allow-port80-443.ps1
#
#   2) Cursor/VS Code 터미널에서 (관리자 권한 없으면 방화벽 적용은 실패할 수 있음):
#      powershell.exe -ExecutionPolicy Bypass -File "./scripts/windows-firewall-allow-port80-443.ps1"

$ruleName = "HTTP/HTTPS 80, 443 인바운드 (nginx)"
$ports = @(80, 443)

# 관리자 여부 확인
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "오류: 관리자 권한이 필요합니다. PowerShell을 우클릭 → '관리자 권한으로 실행' 후 다시 실행하세요." -ForegroundColor Red
    exit 1
}

# 기존 같은 이름 규칙 제거 (중복 방지)
$existing = Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue
if ($existing) {
    Remove-NetFirewallRule -DisplayName $ruleName
    Write-Host "기존 규칙 제거됨: $ruleName"
}

# 새 규칙 생성: TCP 80, 443 인바운드, 도메인/개인/공용 모두 적용
New-NetFirewallRule -DisplayName $ruleName `
    -Direction Inbound `
    -Protocol TCP `
    -LocalPort $ports `
    -Action Allow `
    -Profile Domain, Private, Public `
    -Enabled True

Write-Host "규칙 생성 완료: $ruleName (TCP $($ports -join ', '), 도메인/개인/공용)"
Write-Host "현재 규칙 확인:"
Get-NetFirewallRule -DisplayName $ruleName | Format-Table DisplayName, Enabled, Direction, Action, Profile -AutoSize
