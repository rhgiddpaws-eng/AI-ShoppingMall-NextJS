# 5555 포트 사용 중인 프로세스 종료 (Windows)

## 1. 5555 포트를 쓰는 프로세스 찾기

PowerShell에서:

```powershell
netstat -ano | findstr :5555
```

출력 예:
```
TCP    0.0.0.0:5555    0.0.0.0:0    LISTENING    12345
```
마지막 숫자 `12345`가 **PID(프로세스 ID)** 입니다.

## 2. 해당 프로세스 종료

PowerShell **관리자 권한**으로 실행한 뒤:

```powershell
taskkill /PID 12345 /F
```

`12345` 자리에 위에서 본 실제 PID를 넣으면 됩니다.

## 3. 한 줄로 처리 (PowerShell)

5555를 쓰는 프로세스를 찾아서 바로 종료:

```powershell
Get-NetTCPConnection -LocalPort 5555 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }
```

또는 PID만 확인한 뒤 수동으로:

```powershell
$pid = (Get-NetTCPConnection -LocalPort 5555 -ErrorAction SilentlyContinue).OwningProcess
if ($pid) { Stop-Process -Id $pid -Force }
```

## 4. 이후

`npm run studio` 실행하면 Prisma Studio가 5555에서 정상적으로 뜹니다.
