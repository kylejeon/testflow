# Dev Spec: f028b — Cypress Reporter SDK: `@testably.kr/cypress-reporter@1.0.1`

> **작성일:** 2026-04-23
> **작성자:** PM (planner agent)
> **상태:** Draft
> **관련 디자인:** 불필요 (npm 패키지 + CLI 출력, UI 없음)
> **선행 작업:** f028 Playwright Reporter 1.0.1 stable (2026-05-11 런칭)
> **후속 작업:** f028c Jest Reporter, f028d Cypress Cloud 연동 / Component test 지원
> **feature_list.json:** f028b / P1 / impact=high / effort=medium

---

## 0. 전략적 맥락

Playwright Reporter 런칭(2026-05-11) 마케팅 자료의 "Coming Soon: Cypress Reporter" 섹션을 **"Available now"** 로 플립하기 위한 작업. 단일 SDK 가 아닌 **"Testably Test Automation SDK family"** 포지셔닝을 완성한다.

- Playwright Reporter(`@testably.kr/playwright-reporter@1.0.1`) 와 **UX 동등** — 3줄 설정, 동일 env var, 동일 에러 처리.
- 공통 로직은 전부 `@testably.kr/reporter-core@1.0.1` 재사용. **core 변경 금지.**
- Cypress 공식 문서 기준 구현: [`after:run` 이벤트](https://docs.cypress.io/api/plugins/after-run-api), [Module API](https://docs.cypress.io/guides/guides/module-api).
- Playwright 대비 **제거되는 기능 1개**: `testCaseIdSource: 'annotation'` (Cypress 는 `test.annotations` API 없음).

### 0-1. Cypress vs Playwright — 구현 차이점 요약

| 항목 | Playwright | Cypress |
|------|-----------|---------|
| 리포터 등록 | `reporter: [['@testably.kr/playwright-reporter', opts]]` (config array) | `setupTestablyReporter(on, config, opts)` (plugin 함수 호출) |
| 이벤트 훅 | `onTestEnd` 단위 스트림 + `onEnd` flush | `after:run` 단발 (suite 완료 후 한 번에 배치) |
| 어노테이션 API | `test.info().annotations` 있음 | **없음** (→ `'annotation'` 모드 삭제) |
| 태그 API | `test.tags: string[]` 네이티브 | **없음** (→ `'tag'` 모드는 title-fallback 이거나 제외 — 아래 결정) |
| 테스트 타이틀 구조 | `test.title: string` | `test.title: string[]` (`[describe, it]` 체인) |
| 상태값 | `passed` / `failed` / `timedOut` / `skipped` / `interrupted` | `passed` / `failed` / `pending` / `skipped` |
| Retry 표현 | `result.retry: number` | `test.attempts: TestAttempt[]` (마지막만 반영) |
| 설정 언어 | `.ts` 주류 | `.js` 와 `.ts` 혼재 (둘 다 지원 필수) |
| TypeScript types | `@playwright/test/reporter` | `cypress` 패키지 자체에서 global `Cypress.*` + `CypressCommandLine.*` export |

### 0-2. TC ID source 최종 결정

| 옵션 | Playwright | Cypress 본 스펙 | 사유 |
|------|-----------|----------------|------|
| `annotation` | 기본값 | **제거** | API 부재. 강제 구현 시 trade-off 없이 혼란만 유발 |
| `tag` | 지원 (`test.tags`) | **지원 (신규)** — title 내 `@TC-123` 패턴 매칭 (Cypress 는 tag 를 title 뒤 suffix 로 쓰는 관례 있음) | Cypress 커뮤니티 컨벤션 반영 |
| `title` | 지원 | **지원** (기본값) — `it('[TC-123] name')` | 가장 보편적 |
| `custom` | 지원 | **지원** — `mapTestCaseId(title, filePath)` | escape hatch |

Default: `testCaseIdSource: 'title'` (Playwright 는 `annotation` 기본 → Cypress 는 `title` 기본).
README 에 "Playwright 와 달리 Cypress 는 annotation API 가 없어서 title/tag/custom 3종을 제공합니다" 명시.

---

## 1. 개요

- **문제:** Playwright 1.0.1 런칭 후 Cypress 팀은 "언제 우리 차례?" 질문을 받게 됨. Alpha/로드맵 문구로는 런칭 모멘텀을 완전히 전환하지 못한다.
- **해결:** Playwright 런칭 2일 후(권장: 5/13), 동일 UX 의 `@testably.kr/cypress-reporter@1.0.1` stable 을 public npm 에 공개해 "Day 3 헤드라인" 을 확보하고 "SDK family" 포지셔닝을 완성한다.
- **성공 지표:**
  - 런칭 후 30일 npm weekly downloads ≥ 30 (Playwright 의 60% 트래픽)
  - `ci_upload_logs.source = 'cypress'` 업로드 이벤트 ≥ 전체 CI 업로드의 15%
  - SDK 런칭 이후 "Which frameworks do you support?" 계열 지원 티켓 ↓ 70%

---

## 2. 유저 스토리

- **US-1**: As a Cypress QA engineer on a Pro+ plan, I want `cypress run` 결과가 Testably Run 에 자동 반영되기를 원한다, so that 수동 CSV 업로드 작업을 제거한다.
- **US-2**: As a DevOps engineer migrating between Cypress and Playwright projects, I want Cypress 통합도 Playwright 와 동일한 3줄 설정이기를 원한다, so that 인지 비용이 0 이다.
- **US-3**: As a Cypress user who keeps `cypress.config.js` (legacy JS), I want TypeScript 강제 없이 동작하기를 원한다, so that 기존 config 를 건드리지 않는다.
- **US-4**: As a tester, I want `it('[TC-123] should login')` 하나로 TC 매칭이 끝나기를 원한다, so that 별도 매핑 파일을 관리하지 않는다.
- **US-5**: As a Free/Hobby plan Cypress 유저, 이 패키지를 설치해도 CI 가 fail 하지 않기를 원한다, so that 업그레이드를 강요받지 않는다.
- **US-6**: As a platform owner (Testably), 업로드 source 별 트래픽을 분리 추적하고 싶다, so that Playwright 대비 Cypress 채택률을 측정한다.

---

## 3. 수용 기준 (Acceptance Criteria)

> 총 **47 개**. 각 AC 에 "검증 방법" 포함.

### AC-A: 패키지 메타 & 빌드

- [ ] **AC-A1**: `packages/cypress/package.json.name = "@testably.kr/cypress-reporter"`, `version = "1.0.1"`, `private` 필드 **삭제**.
  - 검증: `node -p "require('./packages/cypress/package.json').private"` → `undefined`
- [ ] **AC-A2**: `dependencies."@testably.kr/reporter-core"` 를 `"0.1.0-alpha.0"` → `"1.0.1"` 로 변경 (Playwright reporter 와 동일 버전 락).
  - 검증: `npm ls @testably.kr/reporter-core -w @testably.kr/cypress-reporter` → `1.0.1`
- [ ] **AC-A3**: `peerDependencies."cypress"` 를 `">=10.0.0"` → `">=12.0.0"` 로 상향. Cypress 10.x 는 2024 EOL.
  - 검증: `package.json` 라인 직접 확인.
- [ ] **AC-A4**: `engines.node = ">=18"` 필드 추가 (현재 없음).
  - 검증: `package.json` 직접 확인.
- [ ] **AC-A5**: `publishConfig = { "access": "public", "registry": "https://registry.npmjs.org/" }` 추가.
  - 검증: `package.json` 직접 확인.
- [ ] **AC-A6**: `files = ["dist", "README.md", "LICENSE"]` (현재 `["dist"]` 만).
  - 검증: `npm pack --dry-run -w @testably.kr/cypress-reporter` 출력에 `README.md`, `LICENSE` 포함.
- [ ] **AC-A7**: `repository`, `homepage`, `bugs`, `author` 4 필드 추가 (Playwright 패키지와 동일 포맷, `directory: "packages/cypress"`).
  - 검증: `npm view` 포맷으로 4 필드 모두 render.
- [ ] **AC-A8**: `npm run build -w @testably.kr/cypress-reporter` 실행 시 `packages/cypress/dist/` 에 `index.js` (CJS), `index.mjs` (ESM), `index.d.ts` (types) 3 종 생성.
  - 검증: `ls packages/cypress/dist/` → 3 파일 모두 존재, 각 0 byte 아님.
- [ ] **AC-A9**: `npm publish --access public --dry-run -w @testably.kr/cypress-reporter` 성공. tarball 크기 < 50 KB.
  - 검증: dry-run 출력의 `package size` 확인.

### AC-B: Plugin API 시그니처

- [ ] **AC-B1**: `setupTestablyReporter(on, config, options?)` 시그니처를 default + named export 로 제공.
  - 검증: `import { setupTestablyReporter } from '@testably.kr/cypress-reporter'` + `import setup from '@testably.kr/cypress-reporter'` 둘 다 동작.
- [ ] **AC-B2**: 타입 시그니처는 **exactly**:
  ```ts
  export function setupTestablyReporter(
    on: Cypress.PluginEvents,
    config: Cypress.PluginConfigOptions,
    options?: CypressReporterOptions,
  ): void;
  ```
  - 검증: `.d.ts` 에서 grep + Cypress 14 TS 프로젝트에서 타입 에러 없음.
- [ ] **AC-B3**: `CypressReporterOptions` 인터페이스가 export 되고 다음 필드 포함:
  ```ts
  export interface CypressReporterOptions extends Partial<TestablyConfig> {
    testCaseIdSource?: 'title' | 'tag' | 'custom';
    dryRun?: boolean;
  }
  ```
  - 검증: `.d.ts` 에 위 shape 정확히 존재. `annotation` 옵션 부재 확인.
- [ ] **AC-B4**: 설정 resolution 우선순위: `options.{url,token,runId}` → `config.env.TESTABLY_*` → `process.env.TESTABLY_*` → `ConfigError`.
  - 검증: 3 케이스 각각 unit test (`configResolution.test.ts`).

### AC-C: TC ID 매핑 (3 모드)

- [ ] **AC-C1**: `testCaseIdSource: 'title'` (기본) — `it('[TC-123] login flow')` 또는 `describe > it` 합친 full title 에서 `[(TC-\d+|<uuid>)]` 패턴 매칭. 대소문자 무시.
  - 검증: `extractTestCaseId.test.ts` — `[TC-42]`, `[tc-42]`, `[<uuid>]`, `TC-999 without brackets` (매칭 실패), `no marker` (매칭 실패) 5 케이스.
- [ ] **AC-C2**: `testCaseIdSource: 'tag'` — Cypress 는 tag API 가 없으므로 full title 말미의 ` @TC-123` suffix 또는 `@TC-123` 를 매칭한다. 규칙: `/\s@(TC-\d+|<uuid>)$/i` + `/(^|\s)@(TC-\d+|<uuid>)(\s|$)/i`.
  - 검증: `extractTestCaseId.test.ts` — `'should login @TC-7'`, `'@TC-7 login'` 매칭. `'email@domain.com'` 비매칭 (골든 케이스).
- [ ] **AC-C3**: `testCaseIdSource: 'custom'` — `options.mapTestCaseId(fullTitle, filePath)` 호출. 콜백 반환값이 `undefined` 면 skip.
  - 검증: unit test + mock mapper.
- [ ] **AC-C4**: TC ID 추출 실패 테스트는 **스킵** 되고 업로드 payload 에 포함되지 않는다. `verbose: true` 에서만 `[Testably:debug] Skipped (no TC ID): <fullTitle>` 로그.
  - 검증: fetch mock assertion + console.log spy.
- [ ] **AC-C5**: `after:run` 종료 시 요약 로그: `[Testably] <total> tests run, <mapped> mapped to Testably, <skipped> skipped (no TC ID)`.
  - 검증: console.log spy.

### AC-D: Status 매핑

- [ ] **AC-D1**: Cypress state → Testably status:
  - `passed` → `passed`
  - `failed` → `failed`
  - `pending` → `blocked` (it.skip / describe.skip)
  - `skipped` → `blocked` (동적 skip 또는 before-all 실패)
  - 그 외 (미래 호환) → `untested`
  - 검증: `mapCypressStatus.test.ts` — 4 + 1 default 케이스.
- [ ] **AC-D2**: `test.attempts.length > 1` 인 경우 (Cypress 자체 retry) `note` 에 `"Retried N times. "` prefix 붙이고 마지막 attempt 의 `displayError` 를 뒤에 append (800 자 절단 유지).
  - 검증: fixture 기반 unit test.
- [ ] **AC-D3**: `test.state === 'passed'` 인 경우 `note` 는 `undefined` (Playwright reporter 와 동일).
  - 검증: unit test.

### AC-E: 업로드 & 에러 처리 (Playwright 동등성)

- [ ] **AC-E1**: `after:run` 핸들러는 **단 1 회** 호출되며 (Cypress spec), 내부에서 `client.uploadResults(testResults)` 를 호출. `reporter-core` 가 100 개씩 자동 배치 분할.
  - 검증: 150 개 fixture → fetch mock 이 정확히 2 회 호출됨 (`integration.test.ts`).
- [ ] **AC-E2**: 네트워크 실패 → 지수 백오프 재시도 (1s, 2s, 4s…) 최대 `maxRetries = 3`. `reporter-core` 의 `withRetry` 재사용. 별도 구현 금지.
  - 검증: 500 응답 × 3 → 3 회 재시도 후 throw 확인. `reporter-core@1.0.1` 로직 차용.
- [ ] **AC-E3**: 모든 재시도 실패 시 기본 `failOnUploadError = false` → `console.error` 1 회 + exit 0. `true` 이면 throw → Cypress 가 plugin error 로 exit 1.
  - 검증: 두 모드 각각 unit test.
- [ ] **AC-E4**: 서버 403 (플랜 부족) → 재시도 없이 아래 메시지 1회:
  ```
  [Testably] Upload skipped: this feature requires a Professional plan or higher.
  [Testably] Upgrade at https://testably.app/billing — test run itself has NOT failed.
  ```
  CI exit code 0.
  - 검증: mock 403 response → console.warn spy.
- [ ] **AC-E5**: 401 (invalid token) / 404 (run not found) / 400 (invalid payload) 각각 1 회 로그 후 재시도 없음, exit 0 (기본).
  - 검증: 3 케이스 각각 unit test, 메시지 문자열 Playwright 와 동일.
- [ ] **AC-E6**: 207 partial_failure → `console.warn` 으로 `failed_test_case_ids` 출력, exit 0.
  - 검증: mock 207 → console.warn spy.

### AC-F: dryRun 모드

- [ ] **AC-F1**: `options.dryRun === true` **또는** `process.env.TESTABLY_DRY_RUN === 'true'` **또는** `config.env.TESTABLY_DRY_RUN === 'true'` 일 때 `after:run` 에서 업로드 대신 `client.testConnection()` 호출.
  - 검증: 3 소스 각각 unit test.
- [ ] **AC-F2**: dryRun 성공 시 로그: `[Testably] Dry run passed. (Run: "<run_name>", tier: <tier>)` (Playwright 와 동일 포맷).
  - 검증: console.log spy.
- [ ] **AC-F3**: dryRun 실패 (401/403/404) 는 AC-E4/E5 와 동일 에러 처리 분기 재사용.
  - 검증: unit test.

### AC-G: 환경변수 & SDK 헤더

- [ ] **AC-G1**: 모든 업로드 요청에 `User-Agent: @testably.kr/cypress-reporter/1.0.1` 및 `X-Testably-SDK-Version: @testably.kr/cypress-reporter/1.0.1` 헤더 포함. 상수 `SDK_AGENT` 로 정의.
  - 검증: fetch mock 의 `init.headers` assertion.
- [ ] **AC-G2**: `TESTABLY_URL` / `TESTABLY_TOKEN` / `TESTABLY_RUN_ID` 3 종 env var 누락 시 `ConfigError` throw → Cypress plugin 로드 실패 (fail-fast).
  - 검증: 3 케이스 각각 unit test.
- [ ] **AC-G3**: 서버 로그 `ci_upload_logs.source = 'cypress'` 로 기록된다 (서버는 User-Agent 프리픽스로 판별). **서버 DB / 코드 변경 없음** — `source` CHECK 에 `'cypress'` 이미 포함됨.
  - 검증: 수동 E2E — `cypress run` 후 Settings → CI Uploads 탭에서 `source: cypress` 확인.

### AC-H: TypeScript / ESM·CJS 듀얼

- [ ] **AC-H1**: `tsup src/index.ts --format cjs,esm --dts` 로 듀얼 번들 생성. Playwright reporter 와 동일.
  - 검증: `dist/index.js` (CJS 헤더 `"use strict"`) + `dist/index.mjs` (ESM `export`) + `dist/index.d.ts`.
- [ ] **AC-H2**: `cypress.config.ts` (TS) 와 `cypress.config.js` (CJS) 둘 다에서 동일 문법으로 import 가능.
  - 검증: `tests/integration/ts-config.test.ts` + `tests/integration/cjs-config.test.js` 두 통합 테스트.
- [ ] **AC-H3**: TypeScript strict 모드에서 사용자 `cypress.config.ts` 에 빨간 줄 없음. `Cypress.PluginEvents`, `Cypress.PluginConfigOptions` 타입이 `cypress` 패키지 (peer dep) 에서 resolve.
  - 검증: `tests/fixtures/strict-tsconfig/cypress.config.ts` 샘플 tsc 컴파일 통과.

### AC-I: 테스트 커버리지

- [ ] **AC-I1**: `packages/cypress/tests/plugin.test.ts` — vitest. TC ID 추출 3 모드 × status 매핑 4 케이스 × 업로드 페이로드 빌드.
  - 검증: `npx vitest run -w @testably.kr/cypress-reporter` 통과, 최소 15 개 테스트.
- [ ] **AC-I2**: `packages/cypress/tests/retry.test.ts` — 500/429/401/403 응답 mocking + fake timers. Playwright 의 `retry.test.ts` 를 1:1 포팅.
  - 검증: 8 케이스 이상 (retry-success, retry-exhaust, rate-limit wait, 401/403/404 non-retry, failOnUploadError toggle).
- [ ] **AC-I3**: `packages/cypress/tests/fallback.test.ts` — env var 조합 × `ConfigError` × Pro 미만 sampling.
  - 검증: Playwright `fallback.test.ts` 와 동일 구조.
- [ ] **AC-I4**: 전체 테스트 스위트 **20 개 이상**, 전부 PASS. `packages/core` 21/21, `packages/playwright` 14/14 의 커버리지 패리티 달성.
  - 검증: `npx vitest run --reporter=verbose` 출력.

### AC-J: 문서

- [ ] **AC-J1**: `packages/cypress/README.md` 신규 작성 (Playwright README 구조 1:1 미러). 필수 섹션:
  1. Badges (npm version, downloads, license, cypress peer)
  2. Status (1.0.1 stable)
  3. Plan requirement (Pro+ 403 동작 명시)
  4. Install
  5. Quick start (3 steps, `cypress.config.ts` + `.js` 두 예시)
  6. TC ID mapping (3 modes, Playwright 와의 차이 note)
  7. Environment variables (3 필수 + dryRun)
  8. Error handling matrix (401/403/404/429/5xx)
  9. Troubleshooting
  10. Cypress 12/13/14 호환 명시
  - 검증: 파일 존재 + 섹션 10 개 heading grep.
- [ ] **AC-J2**: `packages/cypress/CHANGELOG.md` — Keep-a-Changelog. `1.0.1` 엔트리에 "Initial public release" + Playwright 1.0.1 과 동일 UX 명시.
  - 검증: 파일 존재.
- [ ] **AC-J3**: `packages/cypress/LICENSE` = MIT (Playwright 와 동일 텍스트).
  - 검증: `diff packages/cypress/LICENSE packages/playwright/LICENSE` → 저작자/연도 제외 동일.
- [ ] **AC-J4**: 루트 `README.md` 의 `## SDK` 섹션에 `@testably.kr/cypress-reporter` 추가 (Playwright 바로 아래).
  - 검증: grep.

### AC-K: CI/CD & 배포

- [ ] **AC-K1**: `.github/workflows/publish-sdk.yml` 에 `sdk-cypress-v*` 태그 패턴 및 `cypress` matrix option 추가.
  - 검증: workflow diff (§8-3 참조).
- [ ] **AC-K2**: `sdk-cypress-v1.0.1` 태그 푸시 → GitHub Actions 가 `npm publish --access public --tag latest --provenance` 를 성공 실행.
  - 검증: 태그 푸시 후 `npm view @testably.kr/cypress-reporter dist-tags.latest` = `1.0.1`.
- [ ] **AC-K3**: npm provenance badge (`Provenance` 아이콘) 가 npm 페이지에 노출됨.
  - 검증: `npm view @testably.kr/cypress-reporter --json | jq .dist.attestations` → not null.

---

## 4. 기능 상세

### 4-1. 동작 흐름

**정상 흐름 (Happy Path):**

1. 유저가 Testably Settings → CI/CD Tokens 에서 `testably_<hex>` 발급.
2. CI 에 `TESTABLY_URL`, `TESTABLY_TOKEN`, `TESTABLY_RUN_ID` 3 env 등록.
3. `npm i -D @testably.kr/cypress-reporter`
4. `cypress.config.ts` 에 3 줄 추가:
   ```ts
   import { defineConfig } from 'cypress';
   import { setupTestablyReporter } from '@testably.kr/cypress-reporter';
   export default defineConfig({
     e2e: {
       setupNodeEvents(on, config) {
         setupTestablyReporter(on, config, { testCaseIdSource: 'title' });
       },
     },
   });
   ```
5. 테스트 제목에 `[TC-123]` 포함 (`it('[TC-123] should login', ...)`).
6. CI 에서 `npx cypress run` 실행.
7. 모든 spec 완료 → Cypress 가 `after:run` 이벤트 발생.
8. 플러그인이 누적 결과를 추출 → `reporter-core` 가 100 개씩 배치 → `POST /functions/v1/upload-ci-results`.
9. 서버가 `test_results` upsert + `test_runs` 집계 + `ci_upload_logs` 기록.
10. Reporter 로그: `[Testably] 42 results uploaded`, CI exit 0.

**대안 흐름 A — Free/Hobby/Starter:**
1. 서버 403.
2. Reporter 가 업그레이드 안내 1 회 로그.
3. CI exit 0 (Cypress 테스트 결과는 Cypress exit code 따름).

**대안 흐름 B — TC ID 매칭 실패만 있음:**
1. `after:run` 에서 `testResults` 가 빈 배열.
2. 네트워크 호출 없음. 로그: `[Testably] No results to upload (skipped)`.

**대안 흐름 C — dryRun:**
1. `TESTABLY_DRY_RUN=true` 또는 `options.dryRun = true`.
2. `client.testConnection()` 호출 → DB write 없음.
3. 로그: `[Testably] Dry run passed. (Run: "<name>", tier: <n>)`.

**대안 흐름 D — Cypress 자체 retry:**
1. Cypress config 에 `retries: 2` 있음, 특정 테스트가 1 번 fail 후 2 번째에 pass.
2. `test.attempts.length === 2`, 마지막 attempt state = `passed`.
3. Reporter 는 최종 state 만 본다 → `status: passed`, `note: undefined`.
4. 그러나 모든 attempt 가 fail 이면 → 마지막 state = `failed`, `note = "Retried 2 times. <displayError>"`.

**에러 흐름:**
1. 네트워크 타임아웃 → 재시도 3 회 → 실패 시 `[Testably] Upload failed ...` warn, exit 0.
2. `TESTABLY_RUN_ID` 미설정 → `ConfigError` → Cypress 가 plugin 로드 실패 → exit 1. 설정 오류이므로 fail-fast.
3. 207 partial_failure → `failed_test_case_ids` warn, exit 0.
4. Cypress 가 `--spec foo.cy.ts` 로 1 개 spec 만 run 하고 `after:run` 전에 CTRL+C → 플러그인 미호출 → 업로드 누락 (현재 한계, OOS 명시).

### 4-2. 비즈니스 규칙

| 규칙 ID | 규칙 | 비고 |
|---------|------|------|
| BR-1 | 업로드 실패는 Cypress 테스트 실패로 전파되지 않는다 (기본 `failOnUploadError=false`) | Playwright BR-1 미러 |
| BR-2 | `TESTABLY_RUN_ID` / `TESTABLY_TOKEN` / `TESTABLY_URL` 하나라도 누락 시 `ConfigError` fail-fast | 무음 실패 방지 |
| BR-3 | Pro 미만 플랜 서버 403 은 "업로드 스킵" 으로 처리 (테스트 실패 아님) | 플랜 게이팅 서버 일임 |
| BR-4 | 모든 업로드는 `User-Agent: @testably.kr/cypress-reporter/1.0.1` 필수 | 트래픽 소스 추적 (`source='cypress'`) |
| BR-5 | 배치 크기 100 개 — `reporter-core` 로직 그대로 사용 | core 변경 금지 |
| BR-6 | API 토큰은 로그에 절대 노출되지 않는다. verbose 모드에서도 Authorization 헤더 masking | 시크릿 보호 |
| BR-7 | TC ID 매칭 실패 케이스는 자동 TC 생성하지 않는다 | Playwright BR-7 미러 |
| BR-8 | `test.attempts.length > 1` 은 `note` prefix 에만 기록. 각 attempt 별도 row 로 분리 업로드 금지 | 서버 스키마가 upsert 단일 행 |
| BR-9 | Cypress component test 는 v1 범위 외. `setupTestablyReporter(on, config)` 가 component test 컨텍스트에서 호출돼도 동작은 하되, 공식 지원은 OOS 명시 | v1.1 로 미룸 |

### 4-3. 권한 (RBAC)

Playwright Reporter 의 RBAC 매트릭스를 그대로 상속한다 (§dev-spec-f028-playwright-reporter.md §4-3).

| 역할 | CI 토큰 발급 | CI 업로드 실행 |
|------|-------------|---------------|
| Owner | ✓ | ✓ |
| Admin | ✓ | ✓ |
| Manager | ✗ | 토큰 발급자 멤버십 기반 |
| Tester | ✗ | - |
| Viewer | ✗ | 서버 RLS 403 |
| Guest | ✗ | ✗ |

### 4-4. 플랜별 제한

Playwright Reporter 와 100 % 동일 — 서버 `upload-ci-results` Edge Function 의 tier 체크 단일 출처.

| 플랜 | CI 업로드 | 응답 |
|------|----------|------|
| Free | ✗ | 403 |
| Hobby | ✗ | 403 |
| Starter | ✗ | 403 |
| Professional | ✓ | 200/207 |
| Enterprise S/M/L | ✓ | 200/207 |

Rate limit: `ci_upload` 60 burst / 1 rps (Playwright 와 토큰 공유). 클라이언트는 Cypress vs Playwright 구분하지 않는다.

---

## 5. 데이터 설계

### 5-1. 신규 테이블
**없음.**

### 5-2. 기존 테이블 변경
**없음.** `ci_upload_logs.source` CHECK 에 `'cypress'` 이미 포함됨 (`supabase/migrations/*ci_upload_logs*.sql` 확인됨 — Playwright 스펙 §5-2 동일).

### 5-3. RLS 정책
**변경 없음.** 서버 Edge Function 이 SERVICE_ROLE_KEY 로 bypass + 수동 tier/member 검증.

### 5-4. 서버 API 변경
**없음.** `upload-ci-results` 가 모든 필요 기능 커버.

---

## 6. API 설계 (SDK ↔ 서버)

### 6-1. Endpoint (기존 재사용)

```
POST ${TESTABLY_URL}/functions/v1/upload-ci-results
Authorization: Bearer ${TESTABLY_TOKEN}
Content-Type: application/json
User-Agent: @testably.kr/cypress-reporter/1.0.1
X-Testably-SDK-Version: @testably.kr/cypress-reporter/1.0.1
```

### 6-2. Request Payload

```json
{
  "run_id": "uuid",
  "format": "json",
  "results": [
    {
      "test_case_id": "TC-123",
      "status": "passed",
      "note": "",
      "elapsed": 2345,
      "author": "Cypress CI"
    }
  ],
  "dry_run": false
}
```

`author` 는 **`"Cypress CI"`** 고정 (Playwright 는 `"Playwright CI"`).

### 6-3. Response 처리

Playwright §6-3 동일. 차이 없음.

### 6-4. Public TypeScript API

```ts
// packages/cypress/src/index.ts (final)
export { default, setupTestablyReporter } from './plugin';
export type { CypressReporterOptions } from './plugin';

// packages/cypress/src/plugin.ts
export interface CypressReporterOptions extends Partial<TestablyConfig> {
  /**
   * TC ID 추출 방법:
   * - 'title' (default): `it('[TC-001] name')` 또는 full title 내 `[TC-001]` 또는 `[<uuid>]`
   * - 'tag': title 말미의 `@TC-001` suffix 또는 title 중간 `@TC-001` 토큰
   * - 'custom': options.mapTestCaseId 콜백 사용
   *
   * Cypress 는 어노테이션 API 가 없어서 Playwright 의 'annotation' 모드는 제공하지 않습니다.
   */
  testCaseIdSource?: 'title' | 'tag' | 'custom';

  /**
   * dry_run 모드. 서버가 인증/권한/run_id 만 검증하고 DB 쓰기 없음.
   * Default: false. 환경변수 TESTABLY_DRY_RUN=true 또는 config.env.TESTABLY_DRY_RUN=true 로도 활성화 가능.
   */
  dryRun?: boolean;
}

export function setupTestablyReporter(
  on: Cypress.PluginEvents,
  config: Cypress.PluginConfigOptions,
  options?: CypressReporterOptions,
): void;

export default setupTestablyReporter;
```

### 6-5. Env var fallback 순위

```
options.{url,token,runId,dryRun}
  > config.env.TESTABLY_*     (cypress.config.ts 의 env 필드)
  > process.env.TESTABLY_*    (shell / CI secrets)
  > ConfigError throw
```

Playwright 와의 차이: Cypress 는 `config.env` 라는 추가 소스 가 있다. 이 소스는 `cypress.env.json` 또는 `cypress run --env foo=bar` 에서 채워진다. 이를 `process.env` 보다 **높은** 우선순위로 둔다 (명시적 > 묵시적 원칙).

---

## 7. 기존 skeleton 수정 가이드 (diff 기반)

현재 `packages/cypress/src/plugin.ts` (127 줄) 의 라인별 개정안:

| 라인 | 현 상태 | 개정 | 이유 |
|-----|--------|-----|------|
| 1 | `import { TestablyClient, TestResult, TestablyConfig } from '@testably.kr/reporter-core';` | **유지** | 그대로 |
| 1 | — | `+ import { NonRetryableUploadError } from '@testably.kr/reporter-core';` | 403/401/404 분기 처리에 필요 |
| 3 | `const SDK_AGENT = '@testably.kr/cypress-reporter/0.0.0-dev';` | `const SDK_AGENT = '@testably.kr/cypress-reporter/1.0.1';` | stable 버전 문자열 |
| 5-13 | `CypressReporterOptions`, `testCaseIdSource?: 'title' \| 'custom'` | `testCaseIdSource?: 'title' \| 'tag' \| 'custom'` + `dryRun?: boolean` 필드 추가 | AC-B3 |
| 19-23 | `setupTestablyReporter` 시그니처 | **유지** (이미 정확함) | — |
| 24-32 | `TestablyClient` 생성자 | 추가: `config.env.TESTABLY_URL/TOKEN/RUN_ID` 조회 순서 `options > config.env > process.env` 명시 (현재도 그렇지만 주석 강화) | AC-B4 명시성 |
| 34-85 | `on('after:run', async (results) => { ... })` | 전면 개편: dryRun 분기 추가, `handleUploadError(err)` 헬퍼 도입, 403/401/404/400 분기 복제 | AC-E4/E5, AC-F |
| 87-104 | `extractTestCaseId` — `'title'` + `'custom'` 만 처리 | **`'tag'` 분기 추가** + title regex 가 `[TC-\d+]` 괄호 포함 강제로 변경 (현재는 괄호 선택적) | AC-C1/C2 |
| 106-119 | `mapCypressStatus` | **유지 + fallback 강화**: `default: 'untested'` 은 그대로. | AC-D1 |
| 121-125 | `extractNote` | `test.attempts.length > 1` 처리 추가 (`"Retried N times. " + displayError`) | AC-D2 |
| 127 | `export default setupTestablyReporter;` | **유지** | — |

### 7-1. 신규 private 헬퍼 (리포터 내부)

```ts
function handleUploadError(err: unknown, options: CypressReporterOptions): void {
  // Playwright reporter.ts L120-154 와 1:1 동일. NonRetryableUploadError 분기 + failOnUploadError 토글.
  // Playwright 코드를 복사하되 ClassType import 만 바꾼다.
}

function runDryRun(client: TestablyClient): Promise<void> {
  // client.testConnection() 호출 + 성공/실패 로그. Playwright reporter.ts L85-95 미러.
}
```

---

## 8. 영향 범위 (파일 목록)

### 8-1. 신규 파일

| 파일 | 역할 |
|------|------|
| `packages/cypress/README.md` | Quick Start, TC 매핑 3 모드, Playwright 와의 차이 note, troubleshooting |
| `packages/cypress/CHANGELOG.md` | Keep-a-Changelog, `1.0.1` 엔트리 |
| `packages/cypress/LICENSE` | MIT (Playwright 파일 복사) |
| `packages/cypress/vitest.config.ts` | vitest 설정 (Playwright 파일 복사 — `environment: 'node'`, `include: ['tests/**/*.test.ts']`) |
| `packages/cypress/tests/plugin.test.ts` | TC ID 추출 3 모드 + status 매핑 + 업로드 페이로드 빌드 |
| `packages/cypress/tests/retry.test.ts` | 재시도/백오프/rate-limit (Playwright 파일 포팅) |
| `packages/cypress/tests/fallback.test.ts` | env var 조합 + `ConfigError` + dryRun 소스 3 종 |
| `packages/cypress/tests/setup.ts` | vitest mock fetch 세팅 (필요 시) |
| `packages/cypress/tests/fixtures/cypress-test-result.ts` | `CypressCommandLine.CypressRunResult` 모의 생성 헬퍼 |

### 8-2. 수정 파일

| 파일 | 변경 내용 |
|------|---------|
| `packages/cypress/package.json` | version `0.0.0-dev` → `1.0.1`; `private` 삭제; `dependencies."@testably.kr/reporter-core"` `0.1.0-alpha.0` → `1.0.1`; `peerDependencies.cypress` `>=10` → `>=12`; `engines.node` 신규; `publishConfig` 신규; `files` 확장; `author`/`homepage`/`repository`/`bugs` 신규; `scripts.test = "vitest run"`, `scripts."test:watch" = "vitest"` 추가; `devDependencies` 에 `vitest: "^4.1.4"` 추가 |
| `packages/cypress/src/plugin.ts` | §7 diff 참조 (SDK_AGENT, TC ID 3 모드, dryRun, handleUploadError, extractNote 개선) |
| `packages/cypress/src/index.ts` | 변경 없음 (이미 `setupTestablyReporter` + `CypressReporterOptions` export 중) |
| `packages/cypress/tsconfig.json` | 변경 없음 (현 설정 적절) |
| `.github/workflows/publish-sdk.yml` | `sdk-cypress-v*` 태그 패턴 + `cypress` matrix option 추가 (§8-3) |
| `package.json` (루트) | 변경 없음 (`workspaces: ["packages/*"]` 이미 cypress 포함) |
| `README.md` (루트) | `## SDK` 섹션에 `@testably.kr/cypress-reporter` 라인 추가 |
| `docs/marketing/f028-product-hunt-launch.md` | "Coming Soon: Cypress" → "Available now (1.0.1)" 플립 (§9 체크리스트) |
| `docs/marketing/f028-readme-draft.md` | 동일 플립 |
| `docs/marketing/f028-twitter-thread.md` | 동일 플립 |
| `docs/marketing/f028-blog-ship-results-3-lines.md` | 동일 플립 + Cypress Quick Start 섹션 신설 |

### 8-3. `publish-sdk.yml` 변경 diff

```diff
 on:
   push:
     tags:
       - 'sdk-core-v*'
       - 'sdk-playwright-v*'
+      - 'sdk-cypress-v*'
   workflow_dispatch:
     inputs:
       package:
         description: 'Package to publish'
         required: true
         type: choice
         options:
           - core
           - playwright
+          - cypress
         ...

     # "Determine package & dist-tag" step:
             TAG="${GITHUB_REF#refs/tags/}"
             case "$TAG" in
               sdk-core-v*)
                 echo "package=core" >> "$GITHUB_OUTPUT"
                 ;;
               sdk-playwright-v*)
                 echo "package=playwright" >> "$GITHUB_OUTPUT"
                 ;;
+              sdk-cypress-v*)
+                echo "package=cypress" >> "$GITHUB_OUTPUT"
+                ;;
               *)
                 echo "Unknown tag format: $TAG" >&2
                 exit 1
                 ;;
             esac
```

Matrix 없이 단일 job 이고 `working-directory: packages/${{ steps.target.outputs.package }}` 패턴이므로 `cypress` 값만 추가하면 기존 step 이 그대로 동작한다. 추가 변경 불필요.

### 8-4. 서버 / DB 변경

**없음.**

### 8-5. 빌드 도구

tsup 재사용 (Playwright 동일). `scripts.build = "tsup src/index.ts --format cjs,esm --dts"` 이미 정상.

---

## 9. 마케팅 동기화 체크리스트 (Launch 당일)

런칭 타이밍 B (권장, 5/13) 기준, `docs/marketing/*` 의 "Coming Soon Cypress" 문구를 "Available now" 로 전환한다.

- [ ] `f028-product-hunt-launch.md`
  - "Coming Soon: Cypress Reporter" 섹션 → "Also available: `@testably.kr/cypress-reporter@1.0.1`" 로 교체
  - Maker Comment: "Same 3-line setup for Cypress users" 문장 추가
  - Launch Image 3번 ("Results in Testably dashboard") 에 Cypress run source 도 들어가도록 업데이트 (optional)
- [ ] `f028-readme-draft.md`
  - "Cypress and Jest reporters are coming soon" → "The Cypress reporter is available now. Jest is in roadmap."
- [ ] `f028-twitter-thread.md`
  - 마지막 tweet 에 Cypress npm 링크 추가
- [ ] `f028-blog-ship-results-3-lines.md`
  - 신규 섹션 `### Cypress users` 추가 (code snippet 포함)
  - 기존 "Playwright first, Cypress next month" 문장 제거
- [ ] `f028-changelog.md` — `[Related] @testably.kr/cypress-reporter 1.0.1 shipped 2026-05-13` 로 상호 참조 라인 추가
- [ ] 루트 `README.md` `## SDK` 섹션 업데이트
- [ ] Testably 웹 Settings → CI/CD Integration 페이지 (별도 UI 스펙 필요, **본 스펙 OOS**) — Cypress 설치 가이드 카드 노출

---

## 10. 런칭 타이밍 옵션 비교

| 옵션 | 일정 | 장점 | 단점 | 권장도 |
|------|------|------|------|--------|
| **A** — Dual launch | 5/11 (월) 동시 | "SDK family" 한 방에 포지셔닝. 단일 PH 포스트로 두 패키지 묶어 판매 가능 | (1) 두 패키지 동시 품질 유지 스트레스 (2) PH 태그라인 분산 ("playwright-reporter" 검색어 희석) (3) Cypress 버그 발견 시 Playwright 런칭 롤백 리스크 전이 (4) 마케팅 헤드라인이 "Playwright 중심" 에서 "우리 SDK 여러 개 있어요" 로 흐려짐 | 비추천 |
| **B** — Staggered (권장) | 5/11 Playwright, 5/13 (수) Cypress | (1) 5/11 PH 헤드라인 Playwright 단일 집중 (2) 5/13 "Day 3 retention" 헤드라인 재활성 — 런칭 모멘텀 연장 (3) Cypress 출시 전 Playwright 24-48h 베타 피드백 반영 여유 (4) 각 커뮤니티 (Cypress Discord, Playwright Slack) 별도 공략 가능 | 마케팅 리소스 2 회 소비. 5/11-5/13 주간 블로그/트윗 추가 작업 | **권장** |
| **C** — Late follow-up | 5/18 또는 이후 | Playwright 런칭 1 주 지표 확보 후 여유 있게 Cypress 준비 | (1) PH 모멘텀 완전 소실 — "SDK family" 내러티브 애매 (2) Coming Soon 문구 1 주 이상 유지 시 "언제?" 문의 증가 (3) 5/11 런칭에서 얻은 검색 트래픽을 Cypress 가 못 탐 | 비추천 |

**결정: B (5/13 화 00:01 PST / 17:01 KST)**

### 10-1. B 옵션 세부 타임라인

| 날짜 | 작업 |
|------|------|
| 4/24 (목) | 본 Dev Spec CEO 승인 |
| 4/25 (금) | Designer 리뷰 (불필요 확인) + Developer 구현 착수 |
| 4/25~5/2 | 구현 (skeleton → 1.0.1 완성). 목표: 5/2 내 local test 전체 PASS |
| 5/3 (토) | `0.9.0-rc.1` dist-tag `rc` 로 내부 배포 → CEO + 자체 Cypress 프로젝트로 smoke test |
| 5/4~5/10 | Playwright 런칭 준비 (Cypress 는 대기) |
| 5/11 (월) 00:01 PST | Playwright 1.0.1 stable PH 런칭 |
| 5/11~5/12 | Cypress 최종 리그레션 체크 (Playwright 런칭 중 발견된 이슈 대응) |
| 5/13 (수) 00:01 PST | `sdk-cypress-v1.0.1` 태그 푸시 → 자동 publish → `docs/marketing/*` 플립 PR merge → Twitter/Blog "Day 3" 포스팅 |

---

## 11. 엣지 케이스

| 케이스 | 예상 동작 |
|--------|---------|
| Cypress 10.x / 11.x 유저 | peerDep `>=12` 이므로 npm 경고. README 에 "Cypress 12+ 필요, 10.x 는 2024 EOL" 명시 |
| `cypress.config.js` 에서 ESM import 오류 (`"type": "module"` 없음) | CJS dual 번들이므로 `const { setupTestablyReporter } = require('@testably.kr/cypress-reporter')` 동작 |
| Cypress Cloud 병행 사용 | 무관. Testably 는 client-side 에서 독립 HTTP 호출 — 충돌 없음 |
| `cypress open` 인터랙티브 모드 | `after:run` 이벤트는 `cypress run` 헤드리스에서만 발생. `cypress open` 에서는 no-op 로 동작 (README 에 명시) |
| 여러 spec 병렬 실행 (`--parallel` + cypress cloud) | `after:run` 은 각 머신에서 독립 호출됨 → 각자 서버로 업로드. run_id 같으면 서버가 upsert 로 병합. 문제없음 |
| `test.title` 이 배열인데 `join(' > ')` 결과가 2000자 초과 | SDK 는 length 제한 안 함. 서버가 payload 검증. 단, TC ID 추출 regex 는 성능 영향 ≤ O(n) |
| `test.state === undefined` (Cypress API 변경) | `mapCypressStatus` default 분기 → `untested` |
| 네트워크 완전 차단 | 재시도 3 회 후 warn, exit 0 |
| 토큰에 포함된 hex 가 DB 에 없음 | 서버 401 → warn, exit 0 |
| Run archived/locked | 서버 207 partial_failure → warn, exit 0 |
| dry_run 이면서 run_id 가 다른 프로젝트 | 서버 404 → warn, exit 0 |
| Cypress 가 `after:run` 전에 SIGINT (CTRL+C) | 플러그인 미호출 → 업로드 누락 (OOS) |
| Component test 에서 호출 | 동작하지만 공식 지원 아님 — README 에 명시 (OOS) |
| `test.attempts.length > 1` 에서 attempt 별 `displayError` 가 다 없음 | `note = "Retried N times."` (trailing period 유지) |

---

## 12. Out of Scope (v1.1 이후)

- [ ] **Cypress Cloud 연동** — 공식 cloud API 와 양방향 동기화. v1.1 `f028d`.
- [ ] **Component test 공식 지원** — `component.setupNodeEvents` 단일 테스트 케이스 커버. v1.1.
- [ ] **Multi-spec 실시간 진행률 업로드** — 현재는 `after:run` 에서 배치 단발. 실시간 spec 단위 업로드는 별도 서버 API (`PATCH test_runs/progress`) 필요.
- [ ] **Screenshot / video 첨부 자동 업로드** — 서버 Storage 설계 선행 필요 (Playwright f028d 와 공유).
- [ ] **JUnit XML 호환 모드** — `cypress-mochawesome-reporter` 류 XML 파일 파싱. 별도 CLI 툴 (`testably upload report.xml`) 이 더 적절.
- [ ] **Cypress 플러그인 자체 retry override** — 플러그인에서 Cypress retries 를 forcibly 활성화 하는 편의 옵션.
- [ ] **Auto TC 생성** — 서버 정책상 금지.
- [ ] **Annotation 모드 polyfill** — `Cypress.currentTest.annotations` 같은 커스텀 helper 제공. 커뮤니티 요청 있으면 v1.2.
- [ ] **i18n 로그** — CI 로그는 영어 only 유지.
- [ ] **SIGINT 복구** — 중간 kill 된 경우 이전 실행분 flush (local state persistence 필요).

---

## 13. i18n

**본 SDK 는 CI 로그 전용이므로 i18n 대상 아님.** 모든 로그 메시지는 영어. Playwright reporter 와 톤앤매너 동일.

Settings 페이지 UI (별도 스펙) 측 키 — **본 스펙 OOS**:

| 키 | EN | KO |
|----|-----|-----|
| `ci.sdk.cypress.title` | "Cypress Reporter" | "Cypress 리포터" |
| `ci.sdk.cypress.install` | "Install" | "설치하기" |
| `ci.sdk.cypress.quickstart` | "5-min Quick Start" | "5분 빠른 시작" |
| `ci.sdk.cypress.required_plan` | "Requires Professional plan or higher" | "Professional 플랜 이상 필요" |

---

## 14. 리스크 & 완화

| 리스크 | 영향 | 완화 |
|--------|------|------|
| Playwright 런칭 중 발견된 core 버그가 Cypress 에도 파급 | Medium | 5/11 런칭 + 5/13 Cypress 런칭 사이 48h 완충 유지 (옵션 B 이점) |
| `reporter-core@1.0.1` 고정 락 — 커뮤니티가 `^1.0.1` 원함 | Low | 1.0.1 고정 유지. minor 업은 다음 릴리스에서 `^1.1.0` 로 갱신 |
| Cypress 14 breaking change (미래) | Medium | peerDep `>=12` 범위 내 CI 스모크 테스트 추가 (후속) |
| npm 패키지 이름 오타 검색 (`cypress-testably`) | Low | npm 키워드 최적화 + README 의 install 커맨드 강조 |
| TC ID tag 모드의 `@TC-123` regex 가 `email@domain.com` 를 실수로 매칭 | Low | regex 를 `\s@TC-\d+` (앞 공백 강제) 로 제한. 골든 테스트 AC-C2 에 포함 |
| `test.attempts` 가 Cypress 12/13/14 에서 shape 상이 | Medium | 각 버전별 fixture 파일로 통합 테스트 |

---

## 15. 배포 체크리스트 (Developer 단계)

```bash
# 0. 로컬 빌드
npm run build -w @testably.kr/cypress-reporter

# 1. 테스트
npx vitest run --project cypress

# 2. Dry-run publish
npm publish -w @testably.kr/cypress-reporter --access public --dry-run

# 3. (로컬) RC publish (optional smoke)
#    — 실제 배포는 태그 푸시로 자동화
# npm publish -w @testably.kr/cypress-reporter --access public --tag rc

# 4. 태그 기반 자동 배포 (CEO 트리거)
#    package.json version 이 1.0.1 일 때:
git tag sdk-cypress-v1.0.1 -m 'release: cypress-reporter 1.0.1'
git push origin sdk-cypress-v1.0.1
#    → publish-sdk.yml 이 --provenance 포함 publish 실행

# 5. 검증
npm view @testably.kr/cypress-reporter
npm view @testably.kr/cypress-reporter dist-tags.latest
# → 1.0.1
```

**주의:** `publish-sdk.yml` 이 이미 `id-token: write` permission 을 갖고 있음 (f028 AC-G5 에서 추가 완료). 재작업 불필요.

---

## 16. Designer 개입 필요? — **불필요**

- 산출물: npm 패키지 + CLI 로그 출력. UI 없음.
- Settings 페이지 Cypress 설치 카드는 별도 Phase 3 디자인 스펙으로 분리 (**본 스펙 OOS**).

---

## 개발 착수 전 체크리스트

- [x] 수용 기준이 전부 테스트 가능한 문장인가 (AC-A~K, 28 개)
- [x] 각 AC 에 검증 방법 포함
- [x] DB 스키마 변경 명시 — 없음 + 이유 기재 (§5)
- [x] RLS 정책 변경 명시 — 없음 + 이유 기재 (§5)
- [x] 플랜별 제한 명시 (§4-4)
- [x] RBAC 권한 매트릭스 (§4-3)
- [x] 변경 파일 목록 구체적 (§8 — 실제 경로 전수 확인)
- [x] 엣지 케이스 식별 (§11)
- [x] Out of Scope 명시 (§12, 10 항목)
- [x] i18n 스코프 명시 (§13, SDK 본체는 OOS)
- [x] 관련 디자인 명세 — Designer 불필요 명시 (§16)
- [x] Skeleton `plugin.ts` 라인별 개정안 제공 (§7)
- [x] `publish-sdk.yml` diff 제공 (§8-3)
- [x] 런칭 타이밍 A/B/C 비교 (§10)
- [x] 마케팅 동기화 체크리스트 (§9)
- [ ] CEO 승인: 5/13 런칭 일정 + 옵션 B 확정
- [ ] Playwright 1.0.1 런칭(5/11) 후 48h 리그레션 관측 완료
