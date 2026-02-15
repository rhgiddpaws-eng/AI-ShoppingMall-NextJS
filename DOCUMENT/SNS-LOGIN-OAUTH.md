# SNS 로그인 (Google / Kakao OAuth)

## 개요

- 로그인 페이지(`/login`)에서 **Google**, **카카오** 버튼으로 OAuth 로그인 가능.
- 기존 이메일·비밀번호 로그인과 동일하게 세션(쿠키) + JWT 발급 후 `/account` 또는 `/admin`으로 이동.

## 환경 변수

### Google

| 변수명 | 설명 | 필수 |
|--------|------|------|
| `GOOGLE_CLIENT_ID` | Google Cloud Console OAuth 2.0 클라이언트 ID | ✅ |
| `GOOGLE_CLIENT_SECRET` | 해당 클라이언트의 시크릿 | ✅ |

- [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → 사용자 인증 정보 → OAuth 2.0 클라이언트 ID 생성.
- 애플리케이션 유형: **웹 애플리케이션**.
- 승인된 리디렉션 URI: `https://your-domain.com/api/auth/google/callback` (로컬: `http://localhost:3000/api/auth/google/callback`).

### Kakao

| 변수명 | 설명 | 필수 |
|--------|------|------|
| `KAKAO_REST_API_KEY` | Kakao Developers REST API 키 | ✅ |
| `KAKAO_CLIENT_SECRET` | 카카오 개발자 사이트에서 발급한 Client Secret (선택, 보안 강화 시 권장) | ❌ |

- [Kakao Developers](https://developers.kakao.com/) → 앱 생성 → 카카오 로그인 활성화 → Redirect URI: `https://your-domain.com/api/auth/kakao/callback`.
- 동의 항목에서 **프로필(닉네임)**은 활성화하고, **이메일(account_email)**은 필요할 때만 활성화.

## API 경로

- `GET /api/auth/google` → Google 로그인 화면으로 리다이렉트.
- `GET /api/auth/google/callback?code=...` → 토큰·사용자 정보 조회 후 세션 생성, `/login?oauth=success`로 리다이렉트.
- `GET /api/auth/kakao` → 카카오 로그인 화면으로 리다이렉트.
- `GET /api/auth/kakao/callback?code=...` → 동일하게 세션 생성 후 `/login?oauth=success`로 리다이렉트.
- `GET /api/auth/me` → 현재 세션 쿠키로 사용자 정보 + JWT 반환 (OAuth 성공 후 클라이언트 스토어 갱신용).

## 동작 흐름

1. 사용자가 "Google로 로그인" 또는 "카카오로 로그인" 클릭 → `/api/auth/google` 또는 `/api/auth/kakao`로 이동.
2. 제공자 로그인/동의 후 우리 사이트 `/api/auth/{provider}/callback?code=...`로 리다이렉트.
3. 서버에서 code로 액세스 토큰 교환 → 사용자 이메일/이름 조회 → DB에 없으면 자동 가입(password null), 있으면 기존 계정으로 로그인.
4. 세션 쿠키 저장 후 `/login?oauth=success`로 리다이렉트.
5. 로그인 페이지에서 `GET /api/auth/me` 호출로 JWT·사용자 정보를 받아 클라이언트 스토어에 저장 후 `/account`(또는 관리자면 `/admin`)로 이동.

## 참고

- 소셜로 처음 가입한 사용자는 `User.password`가 `null`이므로 이메일/비밀번호 로그인은 불가. (필요 시 "비밀번호 설정" 기능 추가 가능.)
