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
```bash
# 원격에 현재 브랜치 푸시
git push -u origin <브랜치>
# 예: git push -u origin feat/login

# PR 생성 (base=dev, head=내 브랜치) — gh CLI 사용
gh pr create --base dev --head <브랜치> --title "<제목>" --body "<설명>"
# 예: gh pr create --base dev --head feat/login --title "feat: 로그인 화면 구현" --body "이메일/비밀번호 로그인 UI 추가"

# PR 상태 확인 (state가 MERGED면 병합 완료)
gh pr view <브랜치 또는 PR번호> --json number,state,mergedAt
# 예: gh pr view feat/login --json number,state,mergedAt
```

> ⚠️ **`dev` / `main`에 직접 커밋 금지.** 반드시 브랜치를 따서 작업 후 **PR로 머지**합니다.
> ✅ **브랜치 이름과 무관하게**, dev로 들어오는 **모든 PR이 CI 검증을 거칩니다.** (검증 통과해야만 병합)

### 흐름 요약
```
feat/* (또는 fix/, ui/ …)  ──PR──▶  dev  ──✋ 현재 자동 스케줄 정지 / 수동 실행만──▶  main
        ↑ CI 검증 후 자동 병합              ↑ dev→main 자동병합 일시 정지 (CD 구축 중, 아래 참고)
```

---

## 🔄 CI/CD 파이프라인

GitHub Actions 워크플로 2개. 알림은 Discord **#Git-fe**(`Univus-FE BOT`)로 전송됩니다.
> Repo Secret `DISCORD_WEBHOOK` 필요. 자동 병합은 `GITHUB_TOKEN` + 워크플로 `permissions: contents/pull-requests: write`로 동작(별도 PAT 불필요).

**역할 한눈에**
| 워크플로 | 역할 | 트리거 | 현재 상태 |
|---|---|---|---|
| `ci-cd-dev.yml` | `feat/*` 등 → **dev** PR 검증(빌드·lint) 후 **자동 병합** | dev로 향하는 모든 PR | ✅ 동작 중 |
| `ci-cd-main.yml` | **dev → main** 정기 병합 (배포 라인) | ~~매일 KST 06시~~ + 수동 `workflow_dispatch` | ⛔ 자동 스케줄 정지 중 |
| `deploy.yml` | **build → GHCR push → `helm upgrade`** (K8s 실배포 = CD) | 수동 `workflow_dispatch` + **`main` push** | ✅ 동작(첫 배포 검증 완료) |

### 1) `ci-cd-dev.yml` — 모든 PR → dev 검증 & 자동 병합
- **트리거**: **dev로 향하는 모든 PR** (opened/synchronize/reopened)
- **동작**: `npm ci` → `npm run lint` → `npm run build`
- **통과 시**: dev로 **자동 병합** + ✅ 알림 / **실패 시**: 병합 거부 + ❌ 알림

### 2) `ci-cd-main.yml` — dev → main 정기 병합  ⛔ **자동 스케줄 정지 중 (2026-06-03~, CD 구축 전까지)**
- **트리거**: ~~매일 **KST 06시**(`cron: '0 21 * * *'`)~~ → **일시 정지(주석처리)** · 수동 실행(`workflow_dispatch`)은 **유지**
- **동작**: dev 검증(`npm ci`/lint/build) 후 통과하면 **dev→main PR을 생성·머지**(`gh pr create`/`gh pr merge`) — main 직접 push 금지 룰셋과 호환. main 병합 시 `deploy.yml`(push:main) 실배포 트리거.
- 성공/실패 시 Discord 알림 (✅ / ❌)
- ⚠️ 스케줄/수동 실행은 **기본 브랜치(현재 dev)의 파일만** 작동합니다.

> ⛔ **[정지 안내]** 곧 붙을 CD는 *self-hosted runner가 `main` push/workflow_run을 트리거로 `helm upgrade`(실배포)* 하는 구조라,
> CD가 붙는 순간 **`main` = 배포 스위치**가 됩니다. CD 안정화 전에 `dev→main` 자동병합이 계속 돌면 준비 안 된 배포가 나갈 위험이 있어 **자동 스케줄을 임시 정지**했습니다. (배포 시점은 수동 통제)
> - **멈춘 것**: `schedule`(`cron` 매일 06시 자동병합) — `ci-cd-main.yml`에서 주석처리.
> - **유지**: `workflow_dispatch`(수동 실행) → 필요 시 통제된 병합 가능. `ci-cd-dev.yml`(feat→dev 자동병합)은 영향 없음.
> - **복구**: `ci-cd-main.yml`의 `schedule`/`cron` 2줄 주석 해제 → **dev에 반영**하면 매일 06시 자동병합 재개. (스케줄 워크플로라 기본 브랜치 dev 반영 필요)
> - BE 레포(`univ-us-be`)도 서버/백엔드 담당이 별도로 동일 조치.

### 3) `deploy.yml` — build → GHCR → `helm upgrade` (CD, 실배포)  ✅ **신규 [2026-06-04]**
프론트를 **쿠버네티스 클러스터에 실제 배포**하는 CD 워크플로. (서버팀이 구축한 self-hosted runner 사용)
- **트리거**: 수동 `workflow_dispatch` + 자동 **`push: branches:[main]`**. → **`dev`→`main` 병합 시 자동 실배포.** 평소(dev 작업)엔 **안 돎.**
  - ⚠️ **`pull_request` 트리거 없음** — public 레포 + self-hosted runner 조합의 **fork PR RCE**를 막기 위함(보안 필수).
- **흐름 (2-잡)**:
  1. **`build`** (GitHub-hosted `ubuntu-latest`): `npm ci` → `npm run build`(→`out/`) → 이미지 빌드 → **GHCR push** `ghcr.io/univ-us/univ-us-fe:<commit SHA>` (+`:latest`)
  2. **`deploy`** (`runs-on: [self-hosted, univus-vm]`): 레포 체크아웃 → `helm upgrade --install univ-us-fe ./charts/univ-us-fe --set image.tag=<SHA> -n univus --wait`
  3. K8s가 `ghcr-cred`(imagePullSecret)로 이미지 pull → 파드 롤링 업데이트
- **관련 파일**: `charts/univ-us-fe/`(Helm 차트: Deployment/Service/IngressRoute), `Dockerfile`(`httpd:2.4`+`out/`), `.dockerignore`
- **인프라(서버팀)**: 단일노드 kubeadm K8s + MetalLB(게이트웨이 IP `192.168.50.200`) + Traefik. 프론트=`/` 라우팅(IngressRoute), 백엔드=`/api`(예정).
- **이미지 태그 = commit SHA(불변)** → 롤백은 `helm rollback univ-us-fe`(서버에서).

> 💡 이번 첫 배포는 **`workflow_dispatch`를 `dev` ref로 수동 실행**해 검증했습니다(테스트). **운영 자동 배포는 `dev`→`main` 병합 시** `push:main` 트리거로 발동합니다. 두 트리거는 독립적입니다.

### 🖥️ 배포 확인하는 방법 (GUI)
| 무엇 | 어디서 | 확인 내용 |
|---|---|---|
| **파이프라인 실행** | 레포 → **Actions** 탭 → `Deploy FE (build → GHCR → helm)` | build/deploy 잡 성공 여부 + step별 로그 |
| **빌드된 이미지** | org **Packages** (`github.com/orgs/Univ-US/packages`) → `univ-us-fe` | 푸시된 태그(`<SHA>`, `latest`) 목록 |
| **self-hosted runner** | org **Settings → Actions → Runners** | `univus-vm-runner` 🟢 Idle/Active |

**배포된 프론트 화면 직접 보기** — 게이트웨이 `192.168.50.200`은 학원 내부망 IP라(외부 노출 미설정), **SSH 터널**로 우회해서 봅니다:
```bash
# 맥/PC 터미널에서 (이 창은 켜둔 채로)
ssh -p 49022 -L 8080:192.168.50.200:80 univus@happyjob.iptime.org
```
→ 그 상태로 브라우저에서 **`http://localhost:8080`** 접속 → 배포된 프론트 홈이 렌더되면 배포 성공. (`-L 로컬포트:대상IP:대상포트` = 로컬 8080 요청을 VM이 192.168.50.200:80으로 중계)

> 서버에서 직접 보려면(VM SSH 후): `kubectl get all -n univus` / `helm list -n univus` / `curl -I http://192.168.50.200/`(→ `HTTP 200`)

### 🔗 배포 시 API 주소 — 왜 빈값(`""`)을 주입하나 (중요)

정적 export(`output:'export'`)는 **런타임 서버가 없어** API 주소를 **빌드 시점에 확정**해야 합니다.
그래서 `deploy.yml`의 `build` 잡이 빌드 단계에 환경변수를 주입하고(`NEXT_PUBLIC_API_BASE_URL: ""`), `src/lib/api.ts`가 그 값을 읽습니다:
```ts
// src/lib/api.ts
baseURL: process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:9090",
```

| 환경 | 주입값 | `baseURL` 결과 | 호출 주소 |
|---|---|---|---|
| 로컬 (`npm run dev`) | 미설정 → `undefined` | `http://localhost:9090` | `localhost:9090/api/...` |
| 배포 (CD 빌드) | `""` | `""` (상대경로) | **(접속한 호스트)**`/api/...` |

**★ 빈값인데 어떻게 API가 맞춰지나** — 빈 문자열은 "값 없음"이 아니라 **"상대경로로 보내라"는 신호**입니다. 호스트는 우리가 안 박아도 **브라우저가 요청 시점에 자동으로 채웁니다**:
```
페이지 출처   http://192.168.0.108/community/
api.get("/api/posts") + baseURL=""  →  "/api/posts"  (상대경로)
브라우저      → http://192.168.0.108/api/posts 로 자동 요청   ← 호스트는 브라우저가 채움
Traefik       /api → 백엔드 파드(:9090)
```
- FE(`/`)와 BE(`/api`)가 **같은 Traefik 뒤 = 같은 오리진** → 상대경로 한 줄로 해결.
- **장점**: 어떤 주소로 접속하든(`192.168.0.108`, 추후 `www.UnivUs.ac.kr` 등) API가 자동으로 맞춰짐 → **CORS 불필요**, **도메인 바뀌어도 재빌드 불필요**.

> ⚠️ `??`(nullish)를 쓰는 이유 — `||`는 빈 문자열도 falsy로 봐 `localhost`로 폴백해버림. `??`는 `null`/`undefined`일 때만 폴백하므로 `""`(상대경로)를 배포 값으로 살립니다.
> 💡 BE의 `application-prod.yml` + K8s env 주입과 같은 **"설정 외부화"** 패턴 — 단 **FE는 정적이라 런타임이 아닌 '빌드 시점'에** 값이 박힙니다.

### 🛡️ 브랜치 보호 (Ruleset) — `dev`
검증을 건너뛴 병합(직접 push, CI 실패·미실행 PR의 수동 병합)을 막기 위해 **`dev`에 보호 룰셋**을 적용했습니다.
(GitHub → **Settings → Rules → Rulesets**, Enforcement: **Active**, Target: 기본 브랜치 `dev`)

| 규칙 | 효과 |
|---|---|
| **Require a pull request before merging** (승인 **0명**) | dev 직접 push 금지, PR로만 병합. 승인 0명이라 **봇 자동 병합은 그대로 동작** |
| **Require status checks to pass** → `test` | `ci-cd-dev.yml`의 `test`(빌드·lint) **통과해야만 병합** ← 핵심 |
| **Restrict deletions / Block force pushes** | dev 브랜치 삭제·강제 푸시 차단 |

- 결과: **정상 CI 통과 PR(자동병합 포함)은 그대로 통과**, **검증 빠진 병합만 차단**.

### 🛡️ 브랜치 보호 (Ruleset) — `main`  ✅ **적용 완료 [2026-06-04]**
**왜**: `main` = **배포 스위치**다. `deploy.yml`이 `push:main`에 실배포(GHCR 빌드 → `helm upgrade`)를 트리거하므로,
**사람이 실수로 `main`에 직접 push하면 통제 안 된 배포**가 운영에 나갈 수 있다. 이를 막기 위해 `main`에도 보호 룰셋을 적용.

**어떻게** (두 가지를 함께 적용해야 동작):
1. **`ci-cd-main.yml`을 "직접 push → dev→main PR 머지"로 전환** — 봇이 `gh pr create`/`gh pr merge`(승인 0)로 병합 → "직접 push 금지" 룰과 공존. (직접 push 방식이면 룰셋에 막혀 봇 병합도 깨짐)
2. **`main` 보호 룰셋** (Enforcement: **Active**, Target: `main`, Bypass: 없음):

| 규칙 | 효과 |
|---|---|
| **Require a pull request before merging** (승인 **0명**) | **사람 직접 push 금지** ← 핵심. 승인 0이라 봇 PR 머지는 그대로 동작 |
| **Restrict deletions / Block force pushes** | `main` 삭제·강제 푸시 차단 |
| (Require status checks) | **일부러 미설정** — dev→main PR엔 `ci-cd-dev`의 `test`(base=dev 전용)가 안 돌아 **데드락 방지** |

- **검증 완료**: `main`에 직접 push 시도 → `GH013: ... Changes must be made through a pull request`로 **거부됨** 확인.
  ```bash
  # 재현(거부돼야 정상): git commit --allow-empty -m test && git push origin main → rejected
  # 정리: git reset --hard origin/main
  ```
> 두 룰셋의 목적이 다름 — **dev** = "검증 빠진 병합 차단"(`test` 필수), **main** = "사람 직접 push 차단"(배포 통제).
> 향후 dev→main을 **사람 리뷰 게이트**로 바꾸려면 main 룰셋의 Required approvals를 ≥1로 올리면 됨(현재는 0=자동).

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
3. ~~**브랜치 보호규칙 추가**~~ → ✅ **dev·main 적용 완료** — dev(PR 필수 + `test` 상태체크 필수 + 삭제·강제푸시 차단), main(PR 필수=직접 push 금지 + 삭제·강제푸시 차단). 위 [🛡️ 브랜치 보호] 두 섹션 참고.
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
