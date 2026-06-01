# univ-us-fe (프론트엔드)

대학 커뮤니티 서비스 **Univ-us** 의 프론트엔드 레포지토리.
백엔드(Java/Spring): `univ-us-be`

---

## 🧰 기술 스택
- **프레임워크**: Next.js 16.2.6 (App Router) + React 19.2.4
- **언어**: TypeScript 5
- **스타일**: Tailwind CSS v4 + shadcn/ui + radix-ui
- **상태관리**: Zustand
- **실시간**: @stomp/stompjs + sockjs-client
- **배포 형태**: 정적 export (`output: 'export'` → `out/`), 서버 아파치(httpd) 이미지로 배포
- **런타임/툴**: Node 22+ (팀 기준 Node 24.16.0), 패키지매니저 npm

## 🚀 시작하기
```bash
npm ci          # 잠금파일(package-lock.json) 기준 정확히 설치
npm run dev     # 개발 서버 → http://localhost:3000
npm run lint    # ESLint
npm run build   # 정적 export 빌드 → out/
```

---

## 🌿 브랜치 전략 & 작업 규칙 (필독)

> 기본 브랜치는 **`dev`** 입니다.
> (잔디가 기본 브랜치 기준으로 찍히고, 실제 작업 흐름을 PR과 일치시키기 위함)

**작업 시작 전 반드시 현재 브랜치를 확인하고, 새 브랜치를 파서 작업하세요.**

1) 현재 브랜치 확인
```bash
git branch          # '*' 표시가 현재 브랜치
```
2) dev 최신화 후 새 브랜치 생성
```bash
git checkout dev
git pull
git checkout -b feat/작업내용     # 예: feat/login, fix/button-style, ui/community
```
3) 작업 → 커밋 → 푸시 → **`<브랜치> → dev` PR 생성**

> ⚠️ **`dev` / `main`에 직접 커밋 금지.** 반드시 브랜치를 따서 작업 후 **PR로 머지**합니다.
> ✅ **브랜치 이름과 무관하게**, dev로 들어오는 **모든 PR이 CI 검증을 거칩니다.** (검증 통과해야만 병합)

### 흐름 요약
```
feat/* (또는 fix/, ui/ …)  ──PR──▶  dev  ──매일 06시 정기 병합──▶  main
        ↑ CI 검증 후 자동 병합              ↑ CI 검증 후 자동 병합
```

---

## 🔄 CI/CD 파이프라인

GitHub Actions 워크플로 2개. 알림은 Discord **#Git-fe**(`Univus-FE BOT`)로 전송됩니다.
> Repo Secret `DISCORD_WEBHOOK` 필요. 자동 병합은 `GITHUB_TOKEN` + 워크플로 `permissions: contents/pull-requests: write`로 동작(별도 PAT 불필요).

### 1) `ci-cd-dev.yml` — 모든 PR → dev 검증 & 자동 병합
- **트리거**: **dev로 향하는 모든 PR** (opened/synchronize/reopened)
- **동작**: `npm ci` → `npm run lint` → `npm run build`
- **통과 시**: dev로 **자동 병합** + ✅ 알림 / **실패 시**: 병합 거부 + ❌ 알림

### 2) `ci-cd-main.yml` — dev → main 정기 병합
- **트리거**: 매일 **KST 06시**(`cron: '0 21 * * *'`) + 수동 실행(`workflow_dispatch`)
- **동작**: dev 검증(`npm ci`/lint/build) 후 통과하면 **dev를 main에 병합**
- 성공/실패 시 Discord 알림 (✅ / ❌)
- ⚠️ 스케줄/수동 실행은 **기본 브랜치(현재 dev)의 파일만** 작동합니다.

---

## ⚠️ 현재 CI/CD의 한계와 개선 과제

현재 파이프라인은 백엔드와 동일하게 **"컴파일·빌드 오류"까지만** 걸러냅니다.
즉 **`npm run build` 성공 ≠ 앱 정상 동작** 입니다. 빌드는 통과해도 런타임 버그는 그대로 배포될 수 있습니다.

### 무엇을 잡고, 무엇을 못 잡나
| 구분 | 현재 잡힘 ✅ | 현재 못 잡음 ❌ |
|------|------------|----------------|
| 의존성 | `npm ci` 설치 실패 | — |
| 정적 분석 | ESLint 위반, 타입 오류(`tsc`), Next 빌드 오류 | 타입은 맞지만 **로직이 틀린 경우** |
| 렌더링 | 빌드 시 정적 프리렌더(SSG) 중 터지는 오류 | **클라이언트 런타임 오류**(이벤트/상호작용/데이터 패칭) |
| 동작 검증 | (없음) | **실제 동작·회귀**(버튼·폼·API 연동 등) |
| 사용자 흐름 | (없음) | **E2E 시나리오**(로그인→글쓰기 등) |
| 보안 | (없음) | 의존성 취약점, 시크릿 노출 |

> 백엔드가 `./gradlew build`로 **JUnit 테스트**를 함께 돌려 런타임 오류를 일부 걸러내듯,
> 프론트엔드도 **테스트 코드(단위/통합/E2E)** 를 작성해야 "빌드는 됐는데 실제로 안 되는" 버그를 잡을 수 있습니다.

### 조금의 노력으로 해결 가능한 개선점
1. **단위/통합 테스트 도입 (JUnit의 FE 대응)**
   - **Vitest + React Testing Library** 추가 → 컴포넌트/로직 테스트 작성.
   - CI에 `npm run test` 스텝 추가 → 동작·회귀 버그를 빌드 단계에서 차단.
2. **E2E 테스트** — **Playwright**로 핵심 플로우(로그인·글쓰기 등) 검증.
3. **브랜치 보호규칙 추가** — 현재 dev/main에 보호규칙이 없어, 검증 실패/미실행 PR도 **사람이 수동 병합**할 수 있음. dev에 **"필수 상태체크(CI 통과) 후 병합" 규칙**을 걸면 빈틈이 사라짐.
4. **자동 병합 범위 제어(선택)** — 현재 통과한 모든 PR이 자동 병합됨. 검토가 필요한 PR은 **Draft PR**로 올리거나, 워크플로에 `draft == false` 조건 추가.
5. **보안 점검** — `npm audit` 스텝 또는 **Dependabot** 활성화.
6. **액션 버전 업** — `actions/checkout@v4`, `actions/setup-node@v4` → `@v5` (Node 20 deprecated 경고 제거).

---

## 📁 디렉토리 구조
```
src/
├─ app/            # App Router (페이지/레이아웃)
├─ components/     # 공통/레이아웃/ui 컴포넌트 (shadcn)
├─ hooks/          # 커스텀 훅
├─ lib/            # 유틸 (cn 등)
├─ store/          # Zustand 스토어
└─ types/          # 타입 정의
```
