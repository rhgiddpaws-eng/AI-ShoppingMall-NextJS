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

## Communication Policy (Always)
- 사용자에게는 항상 최고 수준의 존댓말만 사용한다.
- 반말, 명령조, 무례하게 들릴 수 있는 표현은 절대 사용하지 않는다.
- 짧은 답변에서도 예의를 유지하고, 요청사항을 존중하는 표현을 기본으로 한다.

## AutoAgent Workspace Policy (Always)
- 작업 표준 루트는 `AutoAgent`로 고정한다.
- 표준 task 파일은 `AutoAgent/tasks.md`다.
- 표준 세션 파일은 `AutoAgent/SESSION_STATE.md`다.
- task 완료 문서는 `AutoAgent/문서/<subagent>/task-xxx.md`에 저장한다.
- 루트 `tasks.md`, `SESSION_STATE.md`는 호환용으로만 두고, 기준 데이터는 `AutoAgent`를 우선한다.

## Subagent Mapping Policy (Always)
- `/make` 단계 기준 subagent는 아래 7개를 기본으로 사용한다.
- `plan-agent`( /plan ), `ui-agent`( /ui ), `db-agent`( /db ), `server-agent`( /server ), `do-agent`( /do ), `test-agent`( /test ), `doc-agent`( /doc )
- 메인 오케스트레이터는 `main-agent`로 분리해 작업 분배와 감시를 담당한다.

## Subagent Profile Policy (Always)
- subagent 동작 기준 문서는 `AutoAgent/subagents/<agent>.md`다.
- `AUTO_SECTION`은 연결된 skill 원문에서 동기화하고, 임의 수정보다는 재동기화를 우선한다.
- `USER_SECTION`은 사용자가 자유롭게 수정 가능한 커스텀 규칙 영역이다.
- skill 매핑 변경은 `AutoAgent/subagents/agent-skill-map.json`에서 관리한다.

## Task Lifecycle Policy (Always)
- 프로젝트 시작 시 우선 `프로젝트요구사항.txt`(또는 `AutoAgent/프로젝트요구사항.txt`)를 기준으로 task를 생성한다.
- 중간에 멈춘 작업은 `AutoAgent/tasks.md` 체크박스(`[ ]`/`[x]`) 상태로 이어서 진행한다.
- 각 task는 담당 subagent를 명시하고, 완료 시 본인이 체크와 완료 문서를 반드시 남긴다.
- 요구사항 파일이 없고 기존 소스만 있는 프로젝트는 먼저 소스 분석 task를 만든 뒤 구현 task를 만든다.

## Git & Diff Guard Policy (Always)
- `git diff --numstat` 감시를 기준으로 변경 라인을 추적한다.
- 작업 시작 전에 재시작 임계치 라인 수를 사용자에게 확인한다(예: 300).
- 임계치 초과 시 해당 subagent는 `AutoAgent/SESSION_STATE.md`와 본인 문서 폴더에 체크포인트를 기록한 뒤 재시작한다.
- 메인 에이전트는 감시 루프를 유지하고, 분배/재시작 상태를 계속 관리한다.
