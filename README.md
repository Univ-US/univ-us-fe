# univ-us-fe (프론트엔드)

> Univ-US 대학 커뮤니티 서비스의 프론트엔드. 백엔드: `univ-us-be` (Java/Spring).

## 기술 스택

| 구분 | 기술 |
|------|------|
| 프레임워크 | Next.js 16.2.6 (App Router · 정적 export) · React 19.2.4 |
| 언어 | TypeScript 5 |
| 스타일 | Tailwind CSS v4 · shadcn/ui · radix-ui · lucide-react |
| 상태관리 | Zustand |
| HTTP | axios (`lib/api.ts` — 401 refresh 인터셉터) |
| 실시간 | @stomp/stompjs + sockjs-client (STOMP over WebSocket) |
| 에디터 | Tiptap + DOMPurify (LMS 본문 HTML 작성·sanitize) |
| 기타 | react-easy-crop (이미지 크롭) · xlsx (엑셀) |
| 런타임 | Node 22+ (팀 기준 24.16.0) · npm |

## 로컬 실행

```bash
npm ci          # package-lock 기준 설치
npm run dev     # 개발 서버 → http://localhost:3000
npm run lint    # ESLint
npm run build   # 정적 export → out/
```

> 정적 export(`output:'export'`)라 빌드 산출물을 아파치(httpd) 이미지로 서빙한다. API 주소는 **빌드 시점**에 `NEXT_PUBLIC_API_BASE_URL`로 확정(`lib/api.ts`) — 배포 빌드는 빈 문자열(`""`)을 주입해 **상대경로(`/api`)**로 호출한다(FE·BE 동일 오리진 → CORS 불필요·도메인 변경 시 재빌드 불필요). 로컬은 미설정 시 `http://localhost:9090` 폴백.

## 브랜치 전략

- 기본 브랜치 **`dev`**. 흐름 `feat/* → dev → main`. **dev / main 직접 push 금지**(룰셋 차단 — PR로만 병합).
- dev로 향하는 모든 PR이 CI 검증 후 자동 병합된다.

```bash
git switch -c feat/<작업> origin/dev
git push -u origin feat/<작업>
gh pr create --base dev --fill
```

## CI/CD

| 워크플로 | 역할 | 트리거 |
|------|------|--------|
| `ci-cd-dev.yml` | dev PR `npm ci` → `lint` → `build` → 통과 시 자동 병합 | dev로 향하는 PR |
| `ci-cd-main.yml` | dev → main 병합 (PR 생성·머지 방식) | 수동 `workflow_dispatch` (cron 정지) |
| `deploy.yml` | build → GHCR push → `helm upgrade` (K8s 롤링 배포) | `push:main` + 수동 |

- 배포 대상 = VM 단일노드 K8s (kubeadm + MetalLB + Traefik + Helm). Traefik이 `/`를 FE 파드(아파치:80)로 라우팅.
- 이미지 태그 = **커밋 SHA**(불변 → 롤백 용이). 빌드(GHCR push)는 클라우드 러너, `helm upgrade`는 VM self-hosted 러너에서 실행.
- 검증 잡 이름 `test`는 dev/main 룰셋의 필수 status check와 일치 → **변경 금지**. 알림 = Discord `#Git-fe` (`DISCORD_WEBHOOK`).
- ⚠️ CI는 lint·타입·빌드 오류까지만 검증한다(런타임/E2E 테스트 미작성). **빌드 성공이 동작을 보장하지 않음.**

## 서버 배포

```
1) dev → main 병합
   Actions → "CI-CD Main (Scheduled Dev to Main)" → Run workflow
   (dev 검증 후 dev→main PR 생성·머지)

2) 배포 실행
   Actions → "Deploy FE (build → GHCR → helm)" → Run workflow → Branch: main
```

- `push:main`이 `deploy.yml`을 트리거하지만, **봇(`GITHUB_TOKEN`) 머지는 재귀 방지로 자동 트리거되지 않는다** → 배포는 Deploy 워크플로를 **수동 실행**한다. (사람이 dev→main PR을 직접 머지하면 자동 트리거됨)
- 배포 화면 확인 (게이트웨이 `192.168.50.200`은 내부망 → SSH 터널):
  ```bash
  ssh -p 49022 -L 8080:192.168.50.200:80 univus@happyjob.iptime.org
  # → 브라우저 http://localhost:8080
  ```

## 롤백

런타임 롤백(helm)과 코드 롤백(git revert)은 독립이다. 이미지 태그가 커밋 SHA, helm이 릴리스 리비전을 추적하므로 언제든 이전 상태로 복구 가능.

**서버 롤백** (VM, 즉시 복구 — 장애 1순위)
```bash
helm history univ-us-fe -n univus              # 리비전 확인 (REVISION/STATUS)
helm rollback univ-us-fe <리비전> -n univus     # 이전 리비전으로 롤링

# 또는 특정 정상 커밋 SHA 이미지로 재배포
helm upgrade univ-us-fe ./charts/univ-us-fe --set image.tag=<good-SHA> -n univus
```

**main 브랜치 롤백** (코드 영구 수정 = fix-forward)
```bash
git switch -c fix/revert-<설명> dev
git revert <잘못된커밋SHA>          # 머지 커밋이면 -m 1
git push -u origin fix/revert-<설명>
gh pr create --base dev --fill     # dev 머지 → dev→main → 재배포
```

- 공유 브랜치(`dev`/`main`)에서 `git reset --hard`·force push **금지**(룰셋도 차단). 되돌리기는 **revert**로 커밋을 쌓는다.
- 실전 순서: ① `helm rollback`으로 서버 즉시 복구 → ② `git revert`로 코드 정리 → ③ 재배포.

## 디렉토리 구조

```
src/
├─ app/          # App Router (라우트별 page/layout) — auth·community·home·lms·dashboard
├─ components/   # ui(shadcn) · layout · auth(가드) · lms · common
├─ lib/          # axios 클라이언트(*Api.ts) · 유틸(cn 등)
├─ store/        # Zustand 스토어
└─ types/        # 타입 정의
```
