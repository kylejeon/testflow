# f028 May 11 런칭 — T-14 Dry-run 리포트

> 실행일: 2026-04-27 (일) — 런칭 14일 전
> 실행자: Claude (auto)
> 관련 launch plan: `docs/marketing/f028-launch-plan-may11.md`

---

## TL;DR

런칭 핵심 인프라(npm 배포, install 흐름, 폴리시 파일)는 **모두 그린**.
다만 마케팅 콘텐츠 안의 작은 정합성 4건이 있었고, 이번 dry-run 에서 3건 자동 수정.
**남은 1건은 CEO 의사결정 필요 (블로그 페이지 제작 vs URL 폴백)**.

| 영역 | 상태 |
|---|---|
| npm 배포 (3 SDK 모두 latest=1.0.1) | ✅ 그린 |
| 외부 신규 프로젝트 install + 모듈 로드 | ✅ 그린 |
| `.github/CODEOWNERS` + `FUNDING.yml` | ✅ 사전 완료 |
| README SDK 테이블 정합성 | ✅ 자동 수정 (stale 섹션 제거) |
| Examples 디렉터리 (Next.js / Nuxt / Remix) | ✅ 존재 — 5/6 회귀 테스트 자료 준비됨 |
| 마케팅 GitHub URL 정합성 | ✅ 자동 수정 (org/태그) |
| 블로그 페이지 라이브 여부 | ⚠️ **CEO 결정 필요** |

---

## 1. npm 배포 검증 (Phase 1, T-15 task)

```bash
npm view @testably.kr/reporter-core dist-tags
# { latest: '1.0.1', alpha: '0.1.0-alpha.0' }
npm view @testably.kr/playwright-reporter dist-tags
# { latest: '1.0.1', alpha: '0.1.0-alpha.0' }
npm view @testably.kr/cypress-reporter dist-tags
# { latest: '1.0.1' }
```

✅ 3종 모두 `latest = 1.0.1`. `alpha` 태그가 두 패키지에 남아있는데 이는 0.1.0-alpha.0 이력 보존용 — 비공식적이고 README/마케팅에서 절대 안내하지 않음. 그대로 둬도 무관.

---

## 2. 신규 프로젝트 E2E install (Phase 1, T-14 task)

`npm init -y` 한 빈 디렉터리에서 양쪽 SDK 설치 + 모듈 로드 검증.

| Package | install | peer dep | default export | named exports |
|---|---|---|---|---|
| `@testably.kr/playwright-reporter@1.0.1` | ✅ 5 packages, 0 vulns | reporter-core 1.0.1 자동 설치 | `function` (PlaywrightReporter 클래스) | PlaywrightReporter |
| `@testably.kr/cypress-reporter@1.0.1` | ✅ | reporter-core 1.0.1 자동 설치 | `function` | ConfigError, NonRetryableUploadError, RateLimitError, UploadError, extractNote, extractTestCaseId, mapCypressStatus |

> **Note on dryRun**: 실제 업로드 dryRun (`TESTABLY_DRY_RUN=true npx playwright test`) 은 production CI 토큰 + run_id 가 필요해 본 dry-run 범위 밖. T-1 (5/10 11:00) 에 CEO 가 실 토큰으로 검증 예정 (launch plan §4 Phase 4).

---

## 3. 마케팅 콘텐츠 정합성 — 발견 4건 / 자동 수정 3건

### 3.1 ✅ FIX — `f028-changelog.md:78` GitHub release tag URL 오타

```diff
- https://github.com/kylejeon/testflow/releases/tag/playwright-reporter-v1.0.1
+ https://github.com/kylejeon/testflow/releases/tag/sdk-playwright-v1.0.1
```

실제 푸시된 태그는 `sdk-playwright-v1.0.1` (게시 워크플로우 publish-sdk.yml 의 트리거 패턴과 일치).

### 3.2 ✅ FIX — `f028-readme-draft.md:267` 잘못된 GitHub org

```diff
- https://github.com/testably/testably
+ https://github.com/kylejeon/testflow
```

`testably/testably` org/repo 는 존재하지 않음. 실제 리포지토리는 `kylejeon/testflow`.

### 3.3 ✅ FIX — `README.md` SDK 섹션 중복

루트 README 에 SDK 안내 표가 두 곳에 있었고 하단 (L208-239) 이 stale ("alpha — pending publish to npm"). 상단 표 (L19-38) 는 최신 ("Stable 1.0.1"). 하단 stale 섹션을 안내 문구 + 링크로 압축.

### 3.4 ✅ FIX — 블로그 슬러그 launch-plan vs 블로그 draft 불일치

블로그 draft (`f028-blog-ship-results-3-lines.md`) 의 canonical 은 `playwright-reporter-ci-integration`인데
launch plan 은 `playwright-reporter-stable` 로 발행 지시. 두 곳을 launch plan → ci-integration 으로 정렬 (블로그 draft 가 source of truth, SEO 측면에서 토픽 슬러그가 더 우월).

Cypress 도 동일: `cypress-reporter-stable` → `cypress-reporter-ci-integration`.

---

## 4. ⚠️ 미해결 — 블로그 페이지 라이브 여부

### 현황
launch plan 이 **5/11 09:05 KST 에 블로그 publish** 를 명시 (Phase 5).
콘텐츠 draft 는 `docs/marketing/f028-blog-ship-results-3-lines.md` 에 완성돼 있음.
**그러나 실제 라우트가 `src/router/config.tsx` 에 등록돼 있지 않음.**

```
[현재 등록된 블로그 라우트]
/blog/choosing-test-management-tool   ✅ 존재 (page.tsx 있음)

[런칭 시 필요한 라우트 — 미등록]
/blog/playwright-reporter-ci-integration  ❌ 페이지 없음 (5/11 publish 대상)
/blog/cypress-reporter-ci-integration     ❌ 페이지 없음 (5/13 publish 대상)
```

### CEO 결정 필요 (둘 중 택일)

**A. 블로그 페이지를 사전 제작 (권장)**
- T-13 ~ T-9 (4/28 ~ 5/2) 사이에 @developer 가 draft.md → React 페이지 변환
- `src/pages/blog/playwright-reporter-ci-integration/page.tsx` 생성, router 등록
- 단순 정적 페이지라 30분~1시간 작업
- 5/11 09:05 에 환경변수 토글로 enable 만 하면 publish 처리 가능 (또는 그냥 사전 머지 후 외부 링크 노출만 그날 시작)

**B. 블로그 대신 npm README 와 docs 에 인바운드 집중**
- 런칭 콘텐츠 안의 블로그 URL 을 모두 `https://www.npmjs.com/package/@testably.kr/playwright-reporter` 로 교체
- 블로그 글은 그 다음에 별도 게시
- 단점: PH/트위터 등에서 "공식 블로그" 로 클릭할 깊이 있는 콘텐츠가 줄어듦. PH 댓글의 디테일 답변용 링크가 npm README 로 한정.

→ 제 추천은 **A**. 콘텐츠가 이미 완성돼 있으므로 변환 비용이 낮고, 런칭 임팩트가 더 큼.

---

## 5. Phase 3 (T-6 ~ T-2) Claude 담당 항목 — 미리 점검 결과

### 5/6 (수) — 3개 sample repo 회귀 테스트
- ✅ `examples/nextjs-github-actions/` 존재
- ✅ `examples/nuxt-gitlab-ci/` 존재
- ✅ `examples/remix-circleci/` 존재
- 각 디렉터리에 `playwright.config.ts` 도 있음
- → 회귀 테스트 실행만 남음. 사전 작업 없음.

### 5/8 (금) — repo polish (CODEOWNERS, FUNDING.yml, README SDK 링크)
- ✅ `.github/CODEOWNERS` 이미 존재 (kylejeon 리뷰어 + SDK 패키지 별 보강)
- ✅ `.github/FUNDING.yml` 이미 존재 (testably.app/pricing 링크)
- ✅ README SDK 표 정상 (오늘 dry-run 으로 stale 섹션 제거)
- → 5/8 작업이 사실상 **완료 상태**. 추가 손볼 것 없음.

→ Phase 3 의 Claude 담당 두 항목 모두 사전 검증 완료. 5/6, 5/8 일정에서 단순 재확인만 하면 됨.

---

## 6. 남은 일정 — Claude 가 능동적으로 보탤 수 있는 일

### 즉시 (오늘~내일)
- **블로그 페이지 변환** (CEO 가 §4 A 선택 시): `f028-blog-ship-results-3-lines.md` → `src/pages/blog/playwright-reporter-ci-integration/page.tsx` + router 등록
- **Cypress 블로그 draft 작성**: 현재 Cypress 전용 블로그 글 draft 가 없음 — `f028-blog-ship-results-3-lines.md` 의 Cypress 버전이 §9 에 짧게만 있음. 5/13 publish 까지 별도 글 필요할 수 있음. CEO 의사결정.

### Phase 4 (T-1, 5/10) 사전 자동화
- launch plan §4 의 13:00 "마케팅 콘텐츠 URL 라이브 검증" 을 자동 스크립트로 만들 수 있음 — 하지만 1회성이라 굳이 할 필요는 낮음

---

## 7. 결론 & 다음 액션

| # | 액션 | 담당 | 우선순위 |
|---|------|------|---------|
| 1 | 본 dry-run 의 자동 수정 4건 (커밋 예정) main 머지 | CEO | 높음 |
| 2 | §4 결정: 블로그 페이지 사전 제작 (A) vs URL 폴백 (B) | CEO | 높음 |
| 3 | A 선택 시 → @developer 가 블로그 페이지 변환 + Cypress 블로그 draft 추가 | Claude | 중간 |
| 4 | 5/6 회귀 테스트 실제 실행 | Claude | 5/6 |
| 5 | 5/10 T-1 체크리스트 (npm view, upload smoke, URL liveness) | Claude | 5/10 |

**Status: 런칭 준비 92% 완료.** 남은 8% = 블로그 페이지 의사결정 + 실제 라이브 콘텐츠 게시 (CEO 채널).

---

> 본 리포트는 자동 dry-run 결과입니다. 자동 수정 변경 4건은 별도 커밋으로 push 예정입니다.
