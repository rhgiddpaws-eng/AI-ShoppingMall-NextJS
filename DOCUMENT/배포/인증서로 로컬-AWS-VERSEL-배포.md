# 인증서·배포 따라하기: 로컬 / AWS(EC2+S3+CDN) / Vercel+S3+CDN

이 문서는 **ncott.shop** 도메인(가비아 구매, DNS는 AWS Route 53 관리)과  
**ACM 인증서(ncott.shop, \*.ncott.shop)**가 이미 CloudFront/CDN용으로 발급된 상태를 기준으로,  
아래 세 가지 상황에서 **인증서 발급**과 **배포 방법**을 단계별로 정리한 것입니다.

- **1. 로컬 PC** — Let's Encrypt로 HTTPS 테스트
- **2. EC2 + S3 + CDN** — CloudFront 앞에 두고 EC2 오리진
- **3. Vercel + S3 + CDN** — 앱은 Vercel, 이미지는 S3·CDN

---

## 도메인·인증서 상황 정리

| 구분 | 설명 |
|------|------|
| 도메인 구매 | 가비아에서 **ncott.shop** 구매 |
| 실제 DNS 관리 | **AWS Route 53** (가비아 DNS 레코드는 사용 안 함, 0개여도 무관) |
| ACM 인증서 | **ncott.shop**, **\*.ncott.shop** — CloudFront(S3/CDN)용으로 이미 발급·사용 중 |
| Let's Encrypt | 로컬·EC2 직접 노출 시에만 사용 (이 문서에서 단계별 안내) |

---

# 1. 로컬 PC에서 HTTPS(Let's Encrypt) 쓰기

로컬에서 **https://ncott.shop** 으로 접속해 보려면,  
**ncott.shop**이 잠깐이라도 **내 PC**를 바라보게 한 뒤, Let's Encrypt 인증서를 받아야 합니다.

---

## 1-1. 준비할 것

- 도메인: **ncott.shop**
- 내 PC 공인 IP: **112.214.35.103** (바뀌면 그때마다 아래 설정도 수정)
- 내부 IP(nginx 돌리는 PC): **192.168.200.121**
- 공유기: **외부 80번 포트 → 192.168.200.121:80** 포트포워딩 이미 했다고 가정

---

## 1-2. AWS Route 53에서 할 일 (가비아 아님)

1. **AWS 콘솔** 로그인 → **Route 53** → **호스트 영역** → **ncott.shop** 선택.
2. **ncott.shop** 에 대한 **A 레코드**를 찾습니다.  
   (지금은 `d3s7cl7vzjzoba.cloudfront.net` 같은 CloudFront로 연결되어 있을 수 있음.)
3. 해당 A 레코드 **편집**:
   - **레코드 이름**: `ncott.shop` (또는 비워두기, 루트 도메인)
   - **레코드 유형**: A
   - **값**: **112.214.35.103** (내 PC 공인 IP)
   - **라우팅 정책**: 단순 라우팅
   - **TTL**: 300 등 원하는 값
4. **저장** 합니다.
5. 5~10분 정도 기다린 뒤, PC에서 확인:
   ```bash
   nslookup ncott.shop
   ```
   결과가 **112.214.35.103** 이면 OK.

---

## 1-3. 로컬에서 인증서 발급 (obtain-cert.sh)

1. 터미널을 열고 프로젝트로 이동:
   ```bash
   cd docker-compose/nginx
   ```
2. (선택) 이메일 지정:
   ```bash
   export CERTBOT_EMAIL=본인이메일@example.com
   ```
3. 스크립트 실행:
   ```bash
   chmod +x obtain-cert.sh
   ./obtain-cert.sh
   ```
4. 스크립트가 하는 일:
   - nginx(webserver) 중지 → 80 포트 비움
   - certbot이 **ncott.shop** 으로 Let's Encrypt 인증서 요청 (standalone, 80 포트)
   - 인증서를 **letsencrypt_data** 볼륨에 저장
   - nginx 다시 기동
5. 끝나면 **인증서 발급 완료**입니다.  
   nginx는 `letsencrypt_data` 안의 인증서를 읽어서 **https://ncott.shop** 을 제공합니다.

---

## 1-4. 인증서 발급 후 DNS 다시 CloudFront로 돌리기 (선택)

로컬 HTTPS 테스트만 할 거면 그대로 두어도 되고,  
다시 **ncott.shop** 을 CloudFront(S3/CDN)로 쓰고 싶다면:

1. **Route 53** → **ncott.shop** A 레코드 다시 편집.
2. **값**을 예전처럼 **CloudFront 배포 도메인**  
   (`d3s7cl7vzjzoba.cloudfront.net` 등)으로 되돌리거나,  
   Alias 대상으로 CloudFront를 선택해 저장.
3. 로컬에서는 **이미 받아 둔 인증서**를 그대로 쓰면 됩니다 (만료 전까지).

---

## 1-5. 로컬 요약

| 단계 | 어디서 | 뭘 하나요 |
|------|--------|-----------|
| 1 | Route 53 | ncott.shop A 레코드 → **112.214.35.103** |
| 2 | 공유기 | 80 → 192.168.200.121:80 (이미 했다고 가정) |
| 3 | PC | `docker-compose/nginx/obtain-cert.sh` 실행 |
| 4 | (선택) | Route 53에서 ncott.shop 다시 CloudFront로 복구 |

---

## 1-6. 로컬 인증서 갱신 (90일마다)

Let's Encrypt 인증서는 **유효 기간 90일**이라, 로컬에서 계속 HTTPS 쓰려면 **갱신**이 필요합니다.

- **자동 갱신**: Windows에서는 기본으로 설정돼 있지 않습니다. (Linux/EC2는 DEPLOYMENT.md 2.7 참고.)
- **수동 갱신**: **2~3달에 한 번** 아래만 실행하면 됩니다.

```bash
cd docker-compose/nginx
chmod +x renew-cert.sh
./renew-cert.sh
```

- 실행 전에 **Route 53**에서 ncott.shop A 레코드가 **내 공인 IP**를 가리키고 있어야 합니다.
- `renew-cert.sh` 는 “만료 30일 이내면 갱신, 아니면 그냥 통과”라서, 자주 돌려도 문제 없습니다.
- **Windows 작업 스케줄러**로 매달 한 번 실행하게 만들어 두면, 거의 자동에 가깝게 유지할 수 있습니다.

---

# 2. EC2에 배포하고 S3·CDN(CloudFront) 쓰기

**ncott.shop** 은 그대로 **CloudFront** 앞에 두고,  
CloudFront **오리진**만 EC2(Next.js 앱)로 두는 방식입니다.  
이때 **도메인용 SSL은 이미 있는 ACM 인증서**를 CloudFront에 쓰면 되고,  
EC2에서는 Let's Encrypt를 안 써도 됩니다.

---

## 2-1. 전체 그림

```
사용자 → https://ncott.shop (Route 53 → CloudFront) → ACM 인증서(이미 있음)
                ↓
        CloudFront 오리진 → EC2 (Next.js 앱) 또는 S3
                ↓
        이미지 등 정적 자원 → S3 + CDN(CloudFront) — 지금 쓰는 것 유지
```

- **ncott.shop** = CloudFront에 연결 (Route 53 A/AAAA Alias → CloudFront).
- **ACM** = ncott.shop, \*.ncott.shop 인증서를 CloudFront에 연결 (이미 적용되어 있음).
- **EC2** = CloudFront의 **오리진**으로만 등록. EC2에는 **별도 도메인 노출·인증서 불필요**.

---

## 2-2. EC2 준비

1. **EC2 인스턴스** 1대 생성 (Ubuntu 22.04 등).
2. **Elastic IP** 붙여서 IP 고정 (선택이지만 권장).
3. **보안 그룹**: SSH(22), HTTP(80), HTTPS(443) 인바운드 허용.  
   (실제 사용자 트래픽은 CloudFront만 받을 거라 80/443은 오리진용.)
4. Docker·Docker Compose 설치 (기존 `DEPLOYMENT.md` 2.2 참고).
5. 프로젝트 클론/배포, `.env.production` 설정,  
   Postgres·앱·nginx 순서로 기동 (같은 문서 2.6 참고).

---

## 2-3. CloudFront에서 오리진을 EC2로 설정

1. **AWS 콘솔** → **CloudFront** → 사용 중인 **배포** 선택 (ncott.shop 쓰는 것).
2. **오리진** 탭에서:
   - 기존 S3 오리진은 **이미지/정적 자원용**으로 그대로 두고,
   - **오리진 추가**:
     - **오리진 도메인**: EC2 **퍼블릭 IP** 또는 Elastic IP  
       (예: `54.12.34.56` → `54.12.34.56` 그대로 넣거나,  
       EC2에 도메인을 붙였다면 그 도메인.)
     - **프로토콜**: HTTP만 써도 됨 (CloudFront ↔ EC2는 내부 통신).
     - **이름**: 예) `EC2-App`
3. **동작(Behaviors)** 에서:
   - **기본(\*)** 또는 **ncott.shop** 으로 들어오는 요청이  
     **EC2 오리진**으로 가도록 **오리진**을 방금 만든 EC2 오리진으로 지정.
   - 이미지/API 경로는 필요하면 **경로 패턴**으로 S3 vs EC2 나눌 수 있음.
4. **저장** 후 배포 반영될 때까지 잠시 대기.

---

## 2-4. Route 53 확인

- **ncott.shop** (및 www 등)은 **CloudFront 배포**를 가리키는 **A/AAAA Alias** 그대로 두면 됩니다.
- **바꿀 것 없음.** ACM도 이미 CloudFront에 연결되어 있으므로 추가 인증서 작업 없음.

---

## 2-5. EC2에서는 인증서를 안 써도 되는 이유

- 사용자는 **https://ncott.shop** 으로만 접속합니다.
- 그 요청은 **Route 53 → CloudFront** 로 가고,  
  **CloudFront** 가 **ACM 인증서(ncott.shop, \*.ncott.shop)** 로 HTTPS를 처리합니다.
- CloudFront가 **백엔드(EC2)** 에는 **HTTP** 로만 요청을 보내므로,  
  EC2에 Let's Encrypt나 ACM을 붙일 필요가 없습니다.

---

## 2-6. EC2 + S3 + CDN 요약

| 단계 | 어디서 | 뭘 하나요 |
|------|--------|-----------|
| 1 | EC2 | 앱 + Postgres + (선택) nginx 기동, 보안 그룹 80/443 열기 |
| 2 | CloudFront | 오리진에 EC2(IP 또는 도메인) 추가, 동작에서 해당 오리진 지정 |
| 3 | Route 53 | ncott.shop → CloudFront 유지 (이미 되어 있음) |
| 4 | 인증서 | **추가 작업 없음** — ACM 인증서는 CloudFront에 이미 적용 |

---

# 3. Vercel로 배포하고 S3·CDN 쓰기

앱(Next.js)은 **Vercel**에 올리고,  
이미지/정적 자원은 기존처럼 **S3 + CloudFront(CDN)** 를 쓰는 경우입니다.  
**ncott.shop** 을 Vercel에 연결할 수도 있고,  
**cdn.ncott.shop** 같은 서브도메인은 그대로 S3·CDN용으로 쓸 수 있습니다.

---

## 3-1. 전체 그림

```
사용자 → https://ncott.shop (Route 53 → Vercel) → Vercel이 HTTPS 자동 처리
사용자 → 이미지 요청 → cdn.ncott.shop 등 → CloudFront → S3 (기존 ACM \*.ncott.shop 사용)
```

- **ncott.shop** = Vercel에 연결하면, Vercel이 자동으로 HTTPS(인증서) 처리.
- **cdn.ncott.shop** = 기존처럼 CloudFront + S3, ACM **\*.ncott.shop** 으로 HTTPS.

---

## 3-2. Vercel에 프로젝트 배포

1. **Vercel** (https://vercel.com) 로그인.
2. **Add New** → **Project** → 이 레포지토리(GitHub 등) 연결.
3. **Framework**: Next.js 자동 감지.
4. **Environment Variables** 에 배포에 필요한 값 설정:
   - `DATABASE_URL` (Supabase 등)
   - `NEXT_PUBLIC_AWS_BUCKET_CDN` (이미지 CDN 주소, 예: https://cdn.ncott.shop)
   - 기타 `SESSION_SECRET_*`, `OPENAI_API_KEY` 등.
5. **Deploy** 로 첫 배포 완료.

---

## 3-3. ncott.shop 도메인을 Vercel에 연결

1. Vercel 프로젝트 → **Settings** → **Domains**.
2. **Add** → **ncott.shop** 입력.
3. Vercel이 안내하는 대로 **Route 53** 에 레코드 추가:
   - 보통 **CNAME** `cname.vercel-dns.com` 또는  
     **A** 레코드로 Vercel이 알려준 IP를 넣으면 됩니다.
4. **Route 53** 에서:
   - **ncott.shop** 에 대해 지금 CloudFront로 되어 있던 **A/AAAA Alias** 를 **삭제**하거나 수정하고,
   - Vercel이 준 **CNAME** 또는 **A** 값으로 **ncott.shop** 을 연결합니다.
5. 전파 후 Vercel에서 **인증 완료** 표시가 나오면,  
   **https://ncott.shop** 은 Vercel이 알아서 HTTPS 인증서를 발급·갱신합니다.  
   → **Let's Encrypt는 우리가 안 써도 됨.**

---

## 3-4. S3·CDN(CloudFront)은 그대로 사용

- 이미지 URL은 **NEXT_PUBLIC_AWS_BUCKET_CDN** (예: https://cdn.ncott.shop) 을 쓰고 있으면,
- **cdn.ncott.shop** 은 기존 CloudFront + S3 설정과  
  **ACM \*.ncott.shop** 인증서로 그대로 동작합니다.
- Vercel 앱은 그냥 이 CDN URL을 참조만 하면 됩니다.

---

## 3-5. Vercel + S3 + CDN 요약

| 단계 | 어디서 | 뭘 하나요 |
|------|--------|-----------|
| 1 | Vercel | 프로젝트 배포, 환경 변수 설정 |
| 2 | Vercel Domains | ncott.shop 추가, 안내대로 레코드 확인 |
| 3 | Route 53 | ncott.shop 을 **Vercel이 준 CNAME/A** 로 연결 (CloudFront에서 빼기) |
| 4 | 인증서 | **추가 작업 없음** — ncott.shop은 Vercel이 처리, cdn은 ACM \*.ncott.shop 유지 |

---

# 한눈에 보는 정리

| 상황 | 도메인 연결처 | HTTPS 인증서 | 우리가 할 일 |
|------|----------------|-------------|--------------|
| **로컬** | Route 53: ncott.shop → 내 PC 공인 IP | Let's Encrypt (obtain-cert.sh) | Route 53 A → 112.214.35.103, 포트포워딩, 스크립트 실행 |
| **EC2 + S3 + CDN** | Route 53: ncott.shop → CloudFront | ACM (이미 CloudFront에 적용) | CloudFront 오리진만 EC2로 추가, EC2에는 인증서 X |
| **Vercel + S3 + CDN** | Route 53: ncott.shop → Vercel | Vercel 자동 + cdn은 ACM \*.ncott.shop | Vercel에 도메인 추가, Route 53을 Vercel로 변경 |

---

# 참고

- **가비아**: 도메인만 구매한 곳. DNS 레코드는 **Route 53**에서만 관리하면 됩니다.
- **ACM 인증서**: ncott.shop, \*.ncott.shop — CloudFront(S3/CDN)용으로 이미 발급·사용 중이므로,  
  EC2 직접 노출이 아니면 **추가 인증서 발급 불필요**합니다.
- 상세 Docker·DB·마이그레이션 절차는 **DOCUMENT/DEPLOYMENT.md** 를 참고하세요.
