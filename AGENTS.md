# Repository Agent Rules

## Always Apply Principle
- "항상 적용"은 스킬만으로는 불완전하므로 `AGENTS.md`를 함께 둔다.
- 스킬은 작업 절차를 돕고, `AGENTS.md`는 리포 기본 규칙을 강제한다.
- env 관련 작업에서는 가능하면 `env-policy-nextjs-shoppingmall` 스킬을 우선 사용한다.

## Env Policy (Fixed)
- 개발 실행(`npm run dev`) 기준 파일은 `.env`다.
- 배포/도커 실행(`npm run build`, `npm run start`) 기준 파일은 `.env.production`이다.
- `.env`, `.env.production`은 Git에 커밋하지 않는다.
- `.env.host`만 Git 커밋 가능하며, 민감값은 반드시 마스킹한다.
- `.env.local` 생성/사용은 금지한다.
- 네이버 지도 변수명은 아래 2개만 사용한다.
- `NAVER_MAPS_CLIENT_ID`
- `NAVER_MAPS_CLIENT_SECRET`

## Code Comment Rule
- 모든 신규/수정 코드에는 쉬운 한글 주석을 반드시 넣는다.
- 주석은 코드 목적, 흐름, 예외를 초보자도 이해할 수 있게 짧고 명확하게 쓴다.
- 코드 동작이 바뀌면 주석도 즉시 함께 갱신한다.
