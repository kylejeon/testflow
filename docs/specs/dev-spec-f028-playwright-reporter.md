# Dev Spec: f028 — Test Automation SDK: `@testably.kr/playwright-reporter`

> **작성일:** 2026-04-21
> **작성자:** PM (planner agent)
> **상태:** Draft → Review → **Revised 2026-04-23 (현실 반영)**
> **관련 디자인:** 불필요 (npm 패키지 + CLI 출력, UI 없음)
> **feature_list.json:** f028 / P1 / impact=high / effort=large
> **선행 작업:** 없음 (기존 `upload-ci-results` Edge Function 재사용)
> **후속 작업:** f028b(Cypress Reporter 정식 출시), f028c(Jest / JUnit XML Parser 확장)

---

## Revision 2026-04-23

본 revision 은 스펙을 **현실(실제 배포된 상태)** 에 맞춰 재정렬한다.

- **npm scope 확정:** `@testably` → `@testably.kr` 로 전면 교체. 이유: `@testably.kr/reporter-core@1.0.0` 과 `@testably.kr/playwright-reporter@1.0.0`(+`0.1.0-alpha.0` alpha tag) 이 이미 공식 npm 에 배포 완료됨. 메모리 + npm 기배포 근거.
- **디렉터리 rename 계획 철회:** `packages/core` → `packages/reporter-core`, `packages/playwright` → `packages/playwright-reporter` rename 지시를 전부 제거. 현 이름 그대로 유지 확정.
- **삭제된 BLOCKER / AC:**
  - AC-A1, AC-A2 (디렉터리 rename) — `(removed — revised 2026-04-23)` 로 마커 유지
  - AC-G4 (npm org `@testably` 점유 확인) — `(removed — revised 2026-04-23)`
  - 리스크 "npm org `@testably` 이미 점유됨" 항목 제거
  - 개발 착수 전 체크리스트 `npm org @testably 점유 확인` 항목 제거
- **신규 열린 태스크:**
  - AC-G5: `.github/workflows/publish-sdk.yml` 에 `permissions.id-token: write` 추가 (npm provenance publish 필수 조건 — 현재 누락 상태)
- **코드베이스 건드리지 않음.** 본 revision 은 문서 (`docs/specs/dev-spec-f028-playwright-reporter.md`) 만 편집하며, `packages/`, `supabase/`, workflow 파일은 변경하지 않는다.

---

## 0. 조사 결과 요약 (Dev Spec 의사결정 전제)

| 항목 | 현황 | 출처 |
|------|------|------|
| 서버 API 존재 여부 | **있음.** `POST /functions/v1/upload-ci-results` | `supabase/functions/upload-ci-results/index.ts` |
| 인증 방식 | Bearer `testably_<hex>` → `ci_tokens.token` 매칭 | `upload-ci-results/index.ts` L184-197 |
| 플랜 게이팅 | **Professional(tier 3) 이상만 허용.** Free/Hobby/Starter는 `403 CI/CD integration requires a Professional plan or higher` | `upload-ci-results/index.ts` L63-80, L199-210 |
| 업로드 포맷 | `{ run_id, results[], format?, junit_xml?, dry_run? }`, 100개 배치 분할은 SDK 측 책임 | `packages/core/src/client.ts` L42-52 |
| TC 매핑 키 | `test_case_id`는 UUID 또는 프로젝트 내 `custom_id` 문자열 — 서버가 자동 해석 | `upload-ci-results/index.ts` L298-333 |
| Rate Limit | `ci_upload`: 60 burst / 1 rps | `supabase/functions/_shared/rate-limit.ts` L22-24 |
| 기존 SDK 코드 | **존재함 + npm 배포 완료.** `packages/core` (`@testably.kr/reporter-core@1.0.0`), `packages/playwright` (`@testably.kr/playwright-reporter@1.0.0` + `0.1.0-alpha.0` alpha tag), `packages/cypress`, `packages/jest`. 디렉터리 이름은 현 상태 유지 확정. | `packages/*/package.json` |
| DB 로그 테이블 | `ci_upload_logs` 존재 (업로드 기록), `ci_tokens` 참조 | `supabase/migrations/20260407_ci_upload_logs.sql` |
| npm Scope | **`@testably.kr` 확정.** 이미 npm 에 2개 패키지 배포 완료 (`@testably.kr/reporter-core`, `@testably.kr/playwright-reporter`). |

> **핵심 전환 (2026-04-23 revised)**: 본 스펙은 "백지에서 신규 구현" 도 아니고 "rename + 재브랜딩" 도 아니다. **이미 `@testably.kr` scope 로 npm 배포 완료된 `@testably.kr/playwright-reporter` (alpha) 의 품질/문서/workflow 를 stable release 수준으로 마감**하는 작업이다. 구현 자체는 완료. 테스트 (core 21/21, playwright 14/14) 및 `npm publish --dry-run` 통과 확인.

---

## 1. 개요

- **문제:** Pro+ 고객이 CI(GitHub Actions, GitLab CI)에서 Playwright 테스트를 돌려도 Testably에 수동으로 결과를 올려야 한다. 공식 SDK 는 alpha tag 로만 배포되어 있어 공식화(stable release) 가 필요하다.
- **해결:** `@testably.kr/playwright-reporter` npm 패키지의 alpha 를 stable 로 승격하고 workflow 자동화(provenance publish) 를 마무리한다. 사용자는 `playwright.config.ts` 에 한 줄 추가 + 환경변수 3개 세팅으로 CI 결과를 Testably Run에 자동 반영한다.
- **성공 지표:**
  - 배포 후 30일 내 npm weekly downloads ≥ 50
  - SDK 출처(`source=playwright`) 업로드 이벤트 ≥ 전체 CI 업로드의 30%
  - Pro 플랜 신규 전환 중 "automation SDK 사용" 선행 유저 비율 ≥ 20%

---

## 2. 유저 스토리

- **US-1**: As a Pro+ plan QA lead, I want Playwright CI 결과가 자동으로 Testably Run에 반영되기를 원한다, so that 수동으로 결과를 찍는 시간을 없앤다.
- **US-2**: As a DevOps engineer, I want `TESTABLY_TOKEN` 하나만 GitHub Secrets에 넣고 `playwright.config.ts` 한 줄로 끝내기를 원한다, so that 5분 안에 CI 통합이 완료된다.
- **US-3**: As a tester, I want Playwright 테스트 제목에 `[TC-123]` 만 넣으면 해당 Testably TC 결과가 갱신되기를 원한다, so that 매핑 파일 관리 비용이 없다.
- **US-4**: As a Free/Hobby plan user, 이 패키지를 설치해도 CI 파이프라인이 실패하지 않기를 원한다 (업로드만 스킵), so that 업그레이드를 강요받지 않는다.
- **US-5**: As a platform owner (Testably), I want 업로드 트래픽 source를 구분 추적하기를 원한다, so that SDK 채택률을 측정한다.

---

## 3. 수용 기준 (Acceptance Criteria)

### AC-A: 패키지 구조 & 빌드

- [x] **AC-A1** *(removed — revised 2026-04-23)*: ~~`packages/playwright-reporter/` 디렉터리 생성~~ → 디렉터리 rename 계획 철회. 현 이름 `packages/playwright/` 그대로 유지. `package.json.name = "@testably.kr/playwright-reporter"` 로 이미 배포 완료.
- [x] **AC-A2** *(removed — revised 2026-04-23)*: ~~`packages/reporter-core/` 로 rename~~ → 현 이름 `packages/core/` 그대로 유지. `package.json.name = "@testably.kr/reporter-core"` 로 이미 배포 완료. `playwright-reporter` 의 `dependencies` 는 `"@testably.kr/reporter-core"` 를 참조한다.
- [ ] **AC-A3**: 루트 `package.json` 에 `"workspaces": ["packages/*"]` 가 설정되어 있다 (npm workspaces 사용). 이미 적용되어 있으면 유지 확인만.
- [ ] **AC-A4**: `npm run build -w @testably.kr/playwright-reporter` 실행 시 `packages/playwright/dist/` 에 `index.js` (CJS), `index.mjs` (ESM), `index.d.ts` (types) 모두 생성된다.
- [ ] **AC-A5**: `package.json.files` = `["dist", "README.md", "LICENSE"]`. `npm pack --dry-run` 실행 시 `src/`, `tests/`, `node_modules/` 가 포함되지 않음을 확인한다. (현재 `npm publish --dry-run` 통과 상태 — 리그레션 방지)
- [ ] **AC-A6**: TypeScript target `ES2020`, Node 18+ 최소 지원.

### AC-B: Reporter 동작

- [ ] **AC-B1**: `PlaywrightReporter` 클래스가 `@playwright/test/reporter`의 `Reporter` 인터페이스를 구현한다 (`onBegin`, `onTestEnd`, `onEnd`).
- [ ] **AC-B2**: `onTestEnd(test, result)` 이 호출될 때마다 TC ID를 추출해 내부 버퍼에 push 한다. `onEnd()` 이 한 번 호출되면 버퍼를 100개씩 배치하여 `POST /functions/v1/upload-ci-results` 로 업로드한다.
- [ ] **AC-B3**: TC ID 추출 우선순위 (옵션 `testCaseIdSource` 로 제어):
  1. `annotation` (기본) — `test.info().annotations` 중 `{ type: 'testably', description: 'TC-123' }`
  2. `tag` — `@TC-123` 형식 태그
  3. `title` — 제목 안의 `[TC-123]` 또는 UUID 패턴
  4. `custom` — `mapTestCaseId(title, filePath)` 콜백
- [ ] **AC-B4**: Playwright status → Testably status 매핑:
  - `passed` → `passed`
  - `failed` / `timedOut` → `failed`
  - `skipped` / `interrupted` → `blocked`
  - 그 외 → `untested`
- [ ] **AC-B5**: 네트워크 실패 시 지수 백오프 재시도 (1s, 2s, 4s…) 최대 `maxRetries=3` 회. `429 Rate Limited` 응답 시 `Retry-After` 헤더를 존중한다.
- [ ] **AC-B6**: 모든 재시도가 실패해도 **`failOnUploadError=false` (기본)** 이면 CI 파이프라인을 죽이지 않는다 (exit 0). `true` 로 두면 throw.

### AC-C: 플랜 게이팅 & 에러 처리

- [ ] **AC-C1**: 서버가 `403 CI/CD integration requires a Professional plan or higher` 를 리턴하면 reporter는 **재시도하지 않고** (`RetryableError` 아님) 아래 메시지를 `console.warn` 으로 1회만 출력한다:
  ```
  [Testably] Upload skipped: this feature requires a Professional plan (current: Hobby).
  [Testably] Upgrade at https://testably.app/billing — test run itself has NOT failed.
  ```
  CI exit code 는 0.
- [ ] **AC-C2**: `401` (invalid token) / `404` (run not found) / `400` (invalid payload) 는 1회만 로그 후 재시도 없음, exit 0 (기본).
- [ ] **AC-C3**: `X-Testably-SDK-Version` 및 `User-Agent: @testably.kr/playwright-reporter/<version>` 헤더가 모든 요청에 포함된다 → 서버 `ci_upload_logs.source = 'playwright'` 로 기록된다.

### AC-D: 타입 & DX

- [ ] **AC-D1**: 사용자는 `import type { PlaywrightReporterOptions } from '@testably.kr/playwright-reporter'` 로 옵션 타입을 import 할 수 있다.
- [ ] **AC-D2**: TypeScript strict 모드에서 사용자 `playwright.config.ts` 작성 시 빨간 줄 없음.
- [ ] **AC-D3**: ESM 사용자(`"type": "module"` 프로젝트)와 CJS 사용자 모두 같은 config 문법으로 사용 가능 (tsup `--format cjs,esm --dts`).

### AC-E: 테스트

- [x] **AC-E1**: `packages/playwright/tests/reporter.test.ts` — vitest. `onTestEnd` 모의 TestCase/TestResult 입력 → 내부 버퍼에 기대 payload 가 쌓이는지 검증. (현재 playwright 14/14 PASS)
- [x] **AC-E2**: Mock fetch 사용. `onEnd` 호출 시 `POST /functions/v1/upload-ci-results` 로 정확한 payload(`{ run_id, format: 'json', results }`) 가 전송되는지 검증.
- [ ] **AC-E3**: 500 에러 → 재시도 3회 후 포기 검증. 429 → `Retry-After` 만큼 기다림 검증 (fake timers). (현 테스트 커버리지 확인 필요)
- [ ] **AC-E4**: TC ID 추출 4가지 모드 각각에 대한 단위 테스트.
- [x] **AC-E5**: `packages/core/tests/client.test.ts` — 100개 초과 results 가 2 batch로 분할되는지. (현재 core 21/21 PASS)

### AC-F: 문서

- [x] **AC-F1**: `packages/playwright/README.md` — Quick Start 5분 가이드 존재 확인 완료. 모든 환경변수, 3가지 TC 매칭 전략 예시, troubleshooting (토큰 오류/플랜 거부/매핑 실패) 포함 여부 리뷰는 열린 태스크.
- [x] **AC-F2**: `packages/playwright/CHANGELOG.md` 존재 확인 완료. `0.1.0-alpha.0` 엔트리 포함 여부 리뷰는 열린 태스크.
- [ ] **AC-F3**: 루트 `README.md` 에 `## SDK` 섹션 추가 — `@testably.kr/playwright-reporter`, `@testably.kr/reporter-core` 패키지 링크.
- [x] **AC-F4**: `packages/playwright/LICENSE` = MIT. 존재 확인 완료.

### AC-G: 퍼블리시 준비(실행은 Developer 단계)

- [x] **AC-G1**: `npm publish --access public --dry-run` 성공. 최종 tarball 사이즈 < 50KB. (둘 다 통과 확인됨)
- [ ] **AC-G2**: `package.json.publishConfig = { "access": "public", "registry": "https://registry.npmjs.org/" }` 명시 확인.
- [ ] **AC-G3**: 스펙 본문에 "Developer가 배포할 때 사용할 명령어" 스니펫 포함(§11).
- [x] **AC-G4** *(removed — revised 2026-04-23)*: ~~npm organization `@testably` 점유 확인~~ → `@testably.kr` scope 확정. 이미 `@testably.kr/reporter-core@1.0.0` + `@testably.kr/playwright-reporter@1.0.0`(+alpha tag) 배포 완료.
- [ ] **AC-G5** *(new — revised 2026-04-23)*: `.github/workflows/publish-sdk.yml` 에 `permissions.id-token: write` 추가. **provenance publish 필수 조건** 이며 현재 누락 상태. 이 permission 없이는 `npm publish --provenance` 가 `OIDC token not available` 로 실패한다. 참고: [npm provenance docs](https://docs.npmjs.com/generating-provenance-statements).

---

## 4. 기능 상세

### 4-1. 동작 흐름

**정상 흐름 (Happy Path):**
1. 유저가 Testably 웹 Settings → CI/CD Tokens 에서 토큰 1개 발급 (`testably_<32hex>`).
2. 유저가 CI(예: GitHub Actions)에 `TESTABLY_TOKEN`, `TESTABLY_URL`, `TESTABLY_RUN_ID` 3개 env 등록.
3. 유저가 `npm i -D @testably.kr/playwright-reporter` 후 `playwright.config.ts` 에 리포터 추가:
   ```ts
   reporter: [
     ['list'],
     ['@testably.kr/playwright-reporter', { testCaseIdSource: 'title' }],
   ],
   ```
4. 테스트 제목에 `[TC-123]` 포함 (또는 annotation 사용).
5. CI 에서 `npx playwright test` 실행.
6. Playwright가 모든 테스트를 끝내고 `onEnd()` 호출.
7. Reporter가 누적된 결과를 100개씩 배치해 `POST /functions/v1/upload-ci-results` 로 전송.
8. 서버가 `test_results` upsert + `test_runs` 집계 컬럼 업데이트 + `ci_upload_logs` 기록.
9. Reporter가 `[Testably] 42 results uploaded` 로그 출력, CI exit 0.

**대안 흐름 A — Free/Hobby/Starter 유저:**
1. 서버가 `403 Professional plan required` 반환.
2. Reporter가 업그레이드 안내 1회 로그.
3. CI exit 0 (테스트 자체 결과는 유지).

**대안 흐름 B — TC ID 미발견 테스트가 섞임:**
1. Reporter가 TC ID 없는 테스트는 **스킵**하고 `onEnd` 에서 로그: `42 tests run, 38 mapped to Testably, 4 skipped (no TC ID)`.
2. CI exit 0.

**대안 흐름 C — dry_run 모드 (사용자가 설정 테스트):**
1. 유저가 env `TESTABLY_DRY_RUN=true` 또는 옵션 `dryRun: true` 설정.
2. Reporter가 `POST upload-ci-results` 에 `{ dry_run: true }` 첨부하여 호출 → 서버가 인증/권한/run_id 검증만 하고 `200 { dry_run: true }` 반환, DB 쓰기 없음.
3. Reporter가 `[Testably] Dry run passed. (Run: "<run_name>", tier: 3)` 출력.

**에러 흐름:**
1. 네트워크 타임아웃 → 지수 백오프 재시도 3회. 여전히 실패하면 `console.error` + exit 0.
2. 토큰 무효 (401) → 재시도 없이 `[Testably] Invalid API token` 1회 로그 후 exit 0.
3. `TESTABLY_RUN_ID` 미설정 → Reporter 생성자에서 `ConfigError` throw (Playwright가 reporter 로드를 실패시키므로 CI exit 1). 이는 설정 오류이므로 **즉시 실패가 맞다**.
4. 하나의 배치가 207 partial_failure → `failed_test_case_ids` 를 `[Testably]` 로그로 출력, CI exit 0.

### 4-2. 비즈니스 규칙

| 규칙 ID | 규칙 | 비고 |
|---------|------|------|
| BR-1 | 업로드 실패는 절대 CI 테스트 실패로 전파되지 않는다 (기본 `failOnUploadError=false`) | 유저 신뢰 확보 |
| BR-2 | `TESTABLY_RUN_ID` / `TESTABLY_TOKEN` / `TESTABLY_URL` 셋 중 하나라도 누락되면 Reporter 생성자에서 fail-fast | 무음 업로드 실패 방지 |
| BR-3 | Pro 미만 플랜은 서버 403 으로 거부하며, SDK 측에서는 이를 "업로드 스킵" 으로 처리한다 (테스트 실패 아님) | 플랜 게이팅 명확화 |
| BR-4 | 모든 업로드는 `User-Agent: @testably.kr/playwright-reporter/<version>` 필수 | 트래픽 소스 추적 |
| BR-5 | 배치 크기 100개 고정 (기존 reporter-core 로직 유지) | 서버 payload 제한 대비 |
| BR-6 | API 토큰은 로그에 절대 출력되지 않는다 (`buildHeaders` 함수 외부 노출 금지) | 시크릿 보호 |
| BR-7 | TC ID 매칭 실패 케이스는 **자동 TC 생성하지 않는다** (PRD 명세 - 명시적 "매핑 실패" 로그만) | 서버 정책 일치 |

### 4-3. 권한 (RBAC)

| 역할 | CI 토큰 발급 | CI 업로드 실행 (= 해당 토큰으로 API 호출) |
|------|--------------|-----------------|
| Owner | ✓ | ✓ (프로젝트 멤버십 필수) |
| Admin | ✓ | ✓ |
| Manager | ✗ (Settings 권한 없음) | 토큰 발급자의 프로젝트 멤버십 기반 |
| Tester | ✗ | - |
| Viewer | ✗ | 발급 불가. 만약 상위 role 이 토큰을 공유해도 서버 RLS가 Viewer 프로젝트는 403 |
| Guest | ✗ | ✗ |

> **근거**: `upload-ci-results/index.ts` L249-261 — 업로드는 `project_members` 테이블에 토큰 소유자가 있어야만 허용. role 체크 없이 "member 존재 여부"만 본다(기존 구현 유지). 토큰 발급 UI는 Settings 페이지에 있고 Owner/Admin에게만 노출됨.

### 4-4. 플랜별 제한

| 플랜 | CI 업로드 허용 | 업로드 시 서버 응답 |
|------|---------------|-----------------------|
| Free | ✗ | 403 — `CI/CD integration requires a Professional plan or higher` |
| Hobby | ✗ | 403 |
| Starter | ✗ | 403 |
| Professional | ✓ | 200 / 207 |
| Enterprise S/M/L | ✓ | 200 / 207 |

- **SDK 레벨 제한 없음.** 플랜 게이팅은 100% 서버에서 수행. SDK는 설치/실행 자유.
- Rate Limit: 프로젝트 토큰 당 60 burst / 1 rps (`ci_upload` RATE_CONFIGS 기존 유지).

---

## 5. 데이터 설계

### 5-1. 신규 테이블

**없음.** 모든 업로드는 기존 `test_results` / `test_runs` / `ci_upload_logs` 로 흡수된다.

### 5-2. 기존 테이블 변경

**없음.** `ci_upload_logs.source` 가 이미 `'playwright' | 'cypress' | 'jest' | 'curl' | 'python' | 'unknown'` CHECK를 지원하므로 새 값 추가 불필요.

### 5-3. RLS 정책

**변경 없음.** 기존 정책 재사용:
- `upload-ci-results` Edge Function 은 `SUPABASE_SERVICE_ROLE_KEY` 로 RLS bypass.
- Edge Function 내부에서 (1) `ci_tokens.token` 매칭, (2) `profiles.subscription_tier >= 3` 확인, (3) `project_members` 멤버십 확인을 **수동으로** 수행 (`upload-ci-results/index.ts` L184-261).
- 참고(기존):
  ```sql
  -- ci_upload_logs SELECT: 본인 것만 조회 (Settings 페이지 recent uploads)
  CREATE POLICY "Users can view own upload logs"
    ON ci_upload_logs FOR SELECT
    USING (auth.uid() = user_id);
  ```

### 5-4. 서버 API 변경 필요 여부 — **없음**

`upload-ci-results` Edge Function 스펙이 이미 SDK가 필요한 모든 것을 커버한다:
- `format=json` 배치 업로드
- `dry_run=true` 연결 테스트
- `test_case_id` UUID / `custom_id` 둘 다 허용
- `User-Agent` / `X-Testably-SDK-Version` 헤더 읽기
- Rate limit / 부분 성공(207) 응답

**본 스펙은 서버 변경을 만들지 않는다.** (추후 f028c JUnit 확장 시에도 이미 `format=junit` 지원됨.)

---

## 6. API 설계 (SDK ↔ 서버)

### 6-1. Endpoint (기존)

```
POST ${TESTABLY_URL}/functions/v1/upload-ci-results
Authorization: Bearer ${TESTABLY_TOKEN}
Content-Type: application/json
User-Agent: @testably.kr/playwright-reporter/0.1.0-alpha.0
X-Testably-SDK-Version: @testably.kr/playwright-reporter/0.1.0-alpha.0
```

### 6-2. Request (SDK 생성 페이로드)

```json
{
  "run_id": "uuid",
  "format": "json",
  "results": [
    {
      "test_case_id": "TC-123",           // custom_id 또는 UUID
      "status": "passed",                 // passed | failed | blocked | untested | retest
      "note": "optional error message or ''",
      "elapsed": 2345,                    // ms
      "author": "Playwright CI"
    }
  ],
  "dry_run": false
}
```

### 6-3. Response 처리

| Status | 의미 | SDK 동작 |
|--------|------|---------|
| 200 | 전체 성공 | 로그 출력, exit 0 |
| 207 | 부분 실패 | `failed_test_case_ids` 로그, exit 0 |
| 401 | 토큰 무효 | 경고 로그 1회, exit 0 |
| 403 | 플랜 부족 또는 프로젝트 멤버 아님 | 업그레이드 안내 로그, exit 0 |
| 404 | run_id 없음 | 에러 로그, exit 0 |
| 429 | rate limited | `Retry-After` 만큼 대기 후 재시도 |
| 500/5xx | 서버 에러 | 지수 백오프 재시도, 최종 실패 시 exit 0 |

### 6-4. Reporter 옵션 (사용자 config 인터페이스)

```ts
export interface PlaywrightReporterOptions {
  // --- 필수(환경변수 대체 가능) ---
  url?: string;              // env: TESTABLY_URL
  token?: string;            // env: TESTABLY_TOKEN (생 값 비추천)
  runId?: string;            // env: TESTABLY_RUN_ID

  // --- TC 매칭 ---
  testCaseIdSource?: 'annotation' | 'tag' | 'title' | 'custom';  // default: 'annotation'
  mapTestCaseId?: (testName: string, filePath: string) => string | undefined;

  // --- 동작 ---
  failOnUploadError?: boolean;  // default: false
  maxRetries?: number;          // default: 3
  verbose?: boolean;            // default: false
  dryRun?: boolean;             // default: false (env: TESTABLY_DRY_RUN)
}
```

### 6-5. Env var fallback 순위

`옵션 > process.env > throw ConfigError`

---

## 7. 영향 범위 (변경 파일 목록)

### 7-1. 이름 변경 (rename) — *(removed — revised 2026-04-23)*

~~디렉터리 rename 계획~~ 철회. 아래 이름 그대로 유지:
- `packages/core/` → **유지** (`@testably.kr/reporter-core`)
- `packages/playwright/` → **유지** (`@testably.kr/playwright-reporter`)
- `packages/cypress/`, `packages/jest/` → **유지** (본 스펙 Out of Scope)

### 7-2. 신규 파일 (이미 존재하는 파일은 verify 만)

| 파일 | 역할 | 현재 상태 |
|------|------|---------|
| `packages/playwright/README.md` | Quick Start, TC 매핑 전략, troubleshooting | **존재** (5분 가이드 확인됨) |
| `packages/playwright/CHANGELOG.md` | Keep a Changelog | **존재** |
| `packages/playwright/LICENSE` | MIT | **존재** |
| `packages/playwright/tests/reporter.test.ts` | vitest 단위 테스트 (TC ID 추출 4모드, status 매핑, onEnd 페이로드) | **존재** (14/14 PASS) |
| `packages/playwright/tests/setup.ts` | vitest mock fetch 세팅 | verify |
| `packages/playwright/vitest.config.ts` | vitest 설정 (node env, include: tests/**) | verify |
| `packages/core/README.md` | 내부 코어 설명 (간단) | verify |
| `packages/core/LICENSE` | MIT | verify |
| `packages/core/tests/client.test.ts` | 배치 분할, retry, rate-limit 처리 테스트 | **존재** (21/21 PASS) |
| `packages/core/tests/config.test.ts` | env fallback 검증 | verify |

### 7-3. 수정 파일

| 파일 | 변경 내용 |
|------|---------|
| `package.json` (루트) | `"workspaces": ["packages/*"]` 설정 확인. `private: true` 유지. |
| `package-lock.json` (루트) | 이미 workspaces 기반으로 정상. 변경 없음. |
| `.gitignore` | `packages/*/dist/` 이미 무시되는지 확인 — 없으면 추가 |
| `README.md` (루트) | `## SDK` 섹션 추가, `@testably.kr/playwright-reporter` npm 배지 + 설치 링크 |
| `packages/playwright/package.json` | version bump (alpha→stable 준비), `publishConfig` 확인, `peerDependencies: { "@playwright/test": ">=1.40.0" }` 확인, `dependencies: { "@testably.kr/reporter-core": "^..." }` 확인, `files: ["dist", "README.md", "LICENSE"]`, `repository`, `bugs`, `homepage` 필드 확인/보강 |
| `packages/playwright/src/reporter.ts` | 상수 `SDK_AGENT` 가 `@testably.kr/playwright-reporter/<version>` 로 이미 설정됨. `dryRun` 옵션 분기 (`client.testConnection()` 호출 경로) 확인/추가 |
| `packages/playwright/src/index.ts` | export 유지 |
| `packages/playwright/tsconfig.json` | `lib: ["ES2020"]` 이미 정상 — 변경 불필요 |
| `packages/core/package.json` | `publishConfig`, `files`, `repository` 확인/보강 |
| `packages/core/src/*` | `SDK_NAME = '@testably.kr/reporter-core'`, `SDK_VERSION = '<version>'` 확인 |
| `.github/workflows/publish-sdk.yml` | **신규 열린 태스크 (AC-G5):** `permissions.id-token: write` 추가 — npm provenance publish 필수 조건 |

### 7-4. 빌드 도구

- **선택: tsup (기존 유지).** 이유: 이미 `packages/playwright/package.json` 이 `tsup src/index.ts --format cjs,esm --dts` 를 쓰고 정상 동작. esbuild 기반이라 빠르고 ESM/CJS 듀얼 + .d.ts 동시 생성. tsc 직접 쓰면 ESM/CJS 듀얼 번들이 번거롭고, rollup 은 오버킬.
- tsup 은 devDependency. 런타임 의존성에 추가하지 않음.

### 7-5. 서버 측 변경

**없음.** Edge Function `upload-ci-results` 는 그대로.

---

## 8. 엣지 케이스

| 케이스 | 예상 동작 |
|--------|---------|
| CI 네트워크 완전 차단 | 재시도 3회 후 `[Testably] Upload failed after 3 retries: ...` 경고, exit 0 |
| Pro 구독 중 plan 다운그레이드 직후 CI 실행 | 서버 403 → SDK 는 업그레이드 안내 로그, exit 0 |
| Playwright 테스트 0개 (필터로 전부 스킵) | `onTestEnd` 한 번도 안 불림 → `onEnd` 에서 results=[] → `[Testably] No results to upload (skipped)` 로그, 네트워크 호출 없음 |
| TC ID 미포함 테스트만 있음 | `[Testably] 42 tests run, 0 mapped, 42 skipped (no TC ID)` 로그, 네트워크 호출 없음 |
| `test_case_id` custom_id 가 해당 프로젝트에 없음 | 서버 400 `not_found: ["TC-999"]` → SDK 경고 로그, exit 0 |
| 토큰에 포함된 hex 가 DB 에 없음 | 서버 401 → SDK 경고 로그, exit 0 |
| Run이 archived/locked 상태 | 서버가 write 실패 → 207 partial_failure → SDK 가 `failed_test_case_ids` 로그 |
| 배치 중간에 네트워크 끊김 (배치 1 성공, 배치 2 실패) | `reporter-core.uploadResults` 가 배치마다 독립 재시도. 최종 `mergeResponses` 가 부분 합 | 
| `playwright.config.ts` 가 TypeScript module 인데 reporter가 CJS (`"type": "module"` 없음) | tsup 듀얼 번들이므로 `require('@testably.kr/playwright-reporter')` / `import` 둘 다 동작 |
| Playwright 병렬 worker가 여러 개 — `onEnd` 여러 번 호출? | Playwright spec: `onEnd` 는 reporter 인스턴스당 **정확히 1회**. 문제없음. |
| 테스트 중간에 CI가 kill 됨 (Ctrl+C) | Playwright `result.status = 'interrupted'` → `blocked` 로 기록. `onEnd` 가 호출되지 않으면 버퍼 손실됨 (현재 한계, Out of Scope 로 명시). |
| API 토큰을 실수로 `token:` 옵션에 생 값으로 박음 | `SDK` 는 입력 검증 안 함. README 에 "TESTABLY_TOKEN env var 사용 권장" 명시. 로그에는 `Authorization` 헤더 절대 출력 금지. |
| `@playwright/test` 1.30~1.39 사용자 | `peerDependencies: ">=1.40"` 이므로 npm 경고. README 에 "Playwright 1.40+ 필요" 명시 |

---

## 9. Out of Scope

- [ ] Cypress Reporter 정식 배포 (후속 티켓 **f028b**)
- [ ] Jest Reporter 정식 배포 (후속 티켓 **f028c**)
- [ ] JUnit XML 파일을 읽어 업로드하는 CLI 툴 (`testably upload results.xml`) — 후속
- [ ] 스크린샷/비디오/trace 첨부파일 업로드 (multipart) — 서버에도 업로드 저장소가 없음. 추후 **f028d** 에서 서버측 Storage 설계 선행 후.
- [ ] Playwright `TestCase.attachments` 중 trace zip 업로드
- [ ] 자동 TC 생성(`auto_create` 플래그) — 서버 정책상 금지
- [ ] Playwright 1.30~1.39 호환성 (peerDep >=1.40)
- [ ] Sentry-style DSN 토큰 (`TESTABLY_DSN=https://...`) — 단순 Bearer 토큰으로 충분
- [ ] Dashboard UI 의 "Automation SDK 설정 마법사" (후속 PM 티켓)
- [ ] `packages/*` 의 실제 `npm publish` 실행 (본 스펙은 **배포 준비 완료까지**. 실제 publish 는 Developer 단계에서 npm token 과 함께 수행)
- [ ] 테스트 실행 중 실시간 스트리밍 업로드 (현재는 `onEnd` 배치만)
- [ ] Interrupted 상태에서 버퍼 손실 복구 (test.afterAll hook 에서 flush) — 후속
- [ ] monorepo 공통 빌드 스크립트 (`npm run build:all`) — Developer 재량

---

## 10. i18n 키

> Reporter는 **CI 로그에만** 출력하므로 **웹 UI i18n은 해당 없음**. 하지만 서버 `upload-ci-results` 에서 사용자에게 보이는 에러 메시지는 현재 영문 고정이며, 이를 따르는 것이 CI 로그 표준. 한국어 로그는 지원하지 않는다 (CI 로그는 영어가 글로벌 컨벤션).

**참고 — 설정 UI(Settings 페이지) 측 키** (**별도 스펙 필요, 본 스펙 Out of Scope**):

| 키 | EN | KO |
|----|----|----|
| `ci.sdk.playwright.title` | "Playwright Reporter" | "Playwright 리포터" |
| `ci.sdk.playwright.install` | "Install" | "설치하기" |
| `ci.sdk.playwright.quickstart` | "5-min Quick Start" | "5분 빠른 시작" |
| `ci.sdk.playwright.required_plan` | "Requires Professional plan or higher" | "Professional 플랜 이상 필요" |

---

## 11. 배포 체크리스트 (Developer 단계에서 사용)

> **현재 상태 (2026-04-23):** `@testably.kr/reporter-core@1.0.0` 및 `@testably.kr/playwright-reporter@1.0.0` (+ `0.1.0-alpha.0` alpha tag) **이미 npm 배포 완료**. 본 스펙의 퍼블리시 체크리스트는 후속 버전 릴리스(예: stable promotion 이나 hotfix) 에 사용한다.

```bash
# 0. npm scope 확인 (@testably.kr 확정)
npm access list packages @testably.kr

# 1. 로컬 빌드 검증
npm run build -w @testably.kr/reporter-core
npm run build -w @testably.kr/playwright-reporter

# 2. 패키지 내용 dry-run
npm publish -w @testably.kr/reporter-core      --access public --dry-run
npm publish -w @testably.kr/playwright-reporter --access public --dry-run

# 3. 실제 배포 (예시: alpha 버전)
npm publish -w @testably.kr/reporter-core      --access public --tag alpha
npm publish -w @testably.kr/playwright-reporter --access public --tag alpha

# 4. 검증
npm view @testably.kr/playwright-reporter
```

**토큰은 CI Secret 으로만 주입.** 로컬 publish 도 `NPM_TOKEN` env 로.

**중요 (AC-G5):** GitHub Actions 를 통한 자동 publish (`publish-sdk.yml`) 를 사용하려면 workflow 파일의 `permissions:` 블록에 `id-token: write` 를 반드시 추가해야 한다. 이 permission 없이는 `npm publish --provenance` 가 OIDC token 을 발급받지 못해 실패한다.

---

## 12. 리스크 & 완화

| 리스크 | 영향도 | 완화 |
|--------|-------|------|
| ~~npm org `@testably` 이미 점유됨~~ | ~~Blocker~~ | *(removed — revised 2026-04-23)* `@testably.kr` scope 확정 및 기배포 완료로 해소됨. |
| `publish-sdk.yml` 에 `id-token: write` permission 누락 | Medium | AC-G5 로 명시. 후속 릴리스 (provenance publish) 전 반드시 workflow 패치 필요. 현재는 alpha tag publish 가 provenance 없이 통과한 것으로 추정되며, stable 승격 시 provenance 를 요구하도록 정책 강화 |
| Playwright Reporter API breaking change (1.50+) | Medium | CI 에 Playwright 최신 버전과의 통합 스모크 테스트 추가 (후속) |
| 서버 upload-ci-results payload 스키마 변경 시 SDK도 깨짐 | Medium | `reporter-core` 에 버저닝된 payload 인터페이스 고정. 서버 변경 전 SDK 호환 체크 의무화 |
| API 토큰 CI 로그 leak | High | `buildHeaders` 결과를 **절대 로깅하지 않는다**. verbose 모드에서도 masking. CI workflow 문서에 `::add-mask::` 가이드 포함 |
| 첨부파일 업로드 요청이 몰리면 429 트래픽 폭주 | Medium | 현재 스펙은 첨부파일 미포함. Out of Scope. 후속 서버 확장 시 별도 rate-limit 버킷 |
| Pro 플랜 게이팅 정책이 바뀌어 Starter 까지 풀릴 경우 | Low | SDK 는 status code 만 본다 (plan tier 하드코딩 없음). 서버 정책 변경에 자동 추종 |

---

## 13. 예상 Quick Start 코드 (README 초안)

```ts
// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  reporter: [
    ['list'],
    ['@testably.kr/playwright-reporter', {
      testCaseIdSource: 'title',   // 테스트 제목 안 [TC-123] 패턴 사용
    }],
  ],
});
```

```yaml
# .github/workflows/e2e.yml
env:
  TESTABLY_URL:    ${{ secrets.TESTABLY_URL }}
  TESTABLY_TOKEN:  ${{ secrets.TESTABLY_TOKEN }}
  TESTABLY_RUN_ID: ${{ secrets.TESTABLY_RUN_ID }}
```

---

## 14. Designer 개입 필요? — **불필요**

- 산출물: npm 패키지 + CLI 로그 출력. UI 없음.
- README 내 코드 블록 톤앤매너는 Phase 6 Marketer 단계에서 리뷰 (Out of Scope of this spec).

---

## 개발 착수 전 체크리스트

- [x] 수용 기준이 전부 테스트 가능한 문장인가 (AC-A~G 모두 측정 가능)
- [x] DB 스키마 변경 명시 (없음 — 이유 포함)
- [x] RLS 정책 변경 명시 (없음 — 이유 포함)
- [x] 플랜별 제한 명시 (§4-4)
- [x] RBAC 권한 매트릭스 (§4-3)
- [x] 변경 파일 목록 구체적 (§7, 실제 경로 전수 확인)
- [x] 엣지 케이스 식별 (§8)
- [x] Out of Scope 명시 (§9)
- [x] i18n 키 — 본 기능은 CI 로그 only 이므로 해당 없음 표기 (§10)
- [x] 관련 디자인 명세 — Designer 불필요 명시 (§14)
- [x] ~~npm org `@testably` 점유 확인~~ *(removed — revised 2026-04-23)*: `@testably.kr` 확정 및 기배포 완료.
- [ ] `publish-sdk.yml` 에 `permissions.id-token: write` 추가 (AC-G5, 신규 열린 태스크)
- [ ] CEO 승인: 본체 private + SDK MIT 오픈소스화 OK?
