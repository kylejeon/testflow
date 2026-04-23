# QA Report: Cypress Reporter SDK (`@testably.kr/cypress-reporter@1.0.1`)

> 검수일: 2026-04-23
> 개발지시서: `docs/specs/dev-spec-cypress-reporter.md`
> 검수 대상: Branch `claude`, Commit `0e288c0`

---

## 1. 요약 판정

**Ship with fixes** — P1 3건(모두 테스트 커버리지 미달) 수정 후 재검수 필요. 코어 기능은 견고.

- 총 AC: 47개
- Pass: 38개
- Partial: 5개
- Missing: 4개
- P0: **0개**
- P1: **3개** (AC-H2, AC-H3, AC-I2)
- P2: **5개**

---

## 2. AC 47개 대조 테이블 (요약)

### AC-A 패키지 메타 (9/9 Pass)
- A1~A9: 전부 Pass. `@testably.kr/cypress-reporter@1.0.1`, `reporter-core@1.0.1` pin, peer `cypress>=12`, engines `>=18`, publishConfig public, files 3종, repo/homepage/bugs/author, dist 3 포맷, pack 8.7KB 통과

### AC-B Plugin API (4/4 Pass)
- default+named export, 시그니처 정확, `annotation` 부재 + JSDoc 이유, config 우선순위 4케이스 테스트

### AC-C TC ID 매핑 (5/5 Pass)
- title 대소문자/UUID, tag email 오매칭 방지 (`/(^|\s)@(TC-\d+)/`), custom, skip+verbose 로그, 요약 로그 포맷

### AC-D Status 매핑 (3/3 Pass)
- 4 상태 + default untested, retry prefix + 800자 절단, passed → undefined

### AC-E 업로드 & 에러 (6/6 Pass)
- after:run 1회, 100개 배치, withRetry 재사용, failOnUploadError 분기, 403/401/404/400 각각 메시지, 207 partial_failure

### AC-F dryRun (3/3 Pass)
- options/env/config.env 3소스, 성공 로그 포맷, 실패 에러 재사용

### AC-G 환경변수 & SDK 헤더 (2 Pass / 1 Partial)
- G1 User-Agent + X-Testably-SDK-Version Pass
- **G2 ConfigError 3종(URL/TOKEN/RUN_ID) 개별 unit test 요구 → 통합 1케이스만** (P2-2)
- G3 source='cypress' 서버 구분 Pass

### AC-H TS / 듀얼 번들 (1/3)
- H1 tsup 듀얼 번들 Pass
- **H2 `tests/integration/ts-config.test.ts` + `cjs-config.test.js` 누락** (P1-1)
- **H3 `tests/fixtures/strict-tsconfig/cypress.config.ts` 누락** (P1-2)

### AC-I 테스트 커버리지 (2 Pass / 2 Partial)
- I1 plugin.test.ts 14개 (요구 15+) — 1개 부족 (P2-3)
- **I2 retry.test.ts 3개 (요구 8+), 429 rate-limit 누락** (P1-3)
- I3 fallback.test.ts 9케이스 Pass
- I4 전체 54/54 PASS

### AC-J 문서 (3 Pass / 1 Missing)
- J1 README 10 섹션 — Badges 누락 (Playwright와 동일 패턴이라 컨벤션 통일)
- J2 CHANGELOG `[1.0.1] - 2026-05-13` Pass
- J3 LICENSE MIT Pass (Playwright 동일)
- **J4 루트 README SDK 테이블에 cypress 여전히 "Planned"** (P2-1, 런칭 당일 PR 로 예정)

### AC-K CI/CD & 배포 (1 Pass / 2 N/A)
- K1 publish-sdk.yml cypress 분기 Pass
- K2/K3 실제 태그 push 이후에만 검증 가능

---

## 3. 이슈 리스트

### P1 — 릴리즈 전 수정

| # | AC | 이슈 | 제안 수정 |
|---|----|----|---------|
| P1-1 | AC-H2 | TS/CJS integration 테스트 부재 | `tests/integration/ts-config.test.ts` + `cjs-config.test.js` 추가 |
| P1-2 | AC-H3 | strict tsconfig fixture 부재 | `tests/fixtures/strict-tsconfig/cypress.config.ts` + tsc --noEmit 통과 검증 테스트 |
| P1-3 | AC-I2 | retry.test.ts 3개 (8+ 요구), 429 누락 | 429 rate-limit wait + 401/403/404 non-retry 케이스 보강 |

### P2 — 가능하면 런칭 전

| # | 이슈 |
|---|----|
| P2-1 | 루트 README "Planned" → "Stable 1.0.1" + npm 링크 업데이트 (런칭 당일 PR 로 계획됨) |
| P2-2 | ConfigError 3종 개별 unit test |
| P2-3 | plugin.test.ts 14 → 15 |
| P2-4 | SDK_AGENT 하드코딩 → package.json 자동 읽기 (Playwright 동일 패턴, 개선 옵션) |
| P2-5 | Dev Spec 헤더 "28 ACs" 오기 (실제 47) |

---

## 4. 보안 리뷰

| 항목 | 판정 |
|-----|------|
| 토큰 로깅 위험 | Safe — console.log 전수 검사, token 노출 경로 없음 |
| config.env 토큰 노출 | Safe |
| error.message note (PII) | Low risk — 유저 assertion 메시지 전송, Security 섹션 명시 |
| peer dep 미충족 동작 | Soft warning (npm 기본) — README 에 v10/11 EOL 명시 |
| NonRetryableUploadError.body → console | Safe (서버가 토큰 echo 하지 않는 전제) |
| XSS / SQL Injection | 해당 없음 (CLI 전용) |

**BR-6 (토큰 로그 금지) 완전 준수 확인.**

---

## 5. 에러 시나리오 검증

| 시나리오 | 판정 |
|---------|------|
| 401 Invalid token → warn + exit 0 | ✅ |
| 403 Plan gate → upgrade notice | ✅ |
| 404 Run not found → warn + exit 0 | ✅ |
| 500+ → withRetry 3회 | ✅ |
| 네트워크 timeout → failOnUploadError 분기 | ✅ |
| ConfigError (env 누락) → plugin 로드 실패 | ✅ |
| 429 rate-limit → Retry-After 대기 | ⚠️ 테스트 없음 (P1-3) |
| 207 partial_failure → warn | ✅ |

---

## 6. 테스트 커버리지 (54/54 PASS)

| 파일 | 케이스 |
|------|------|
| plugin.test.ts | 14 |
| extractTestCaseId.test.ts | 15 |
| mapCypressStatus.test.ts | 6 |
| extractNote.test.ts | 7 |
| retry.test.ts | **3** (↑ 8+ 필요) |
| fallback.test.ts | 9 |

---

## 7. publish-sdk.yml 변경

- `sdk-cypress-v*` 태그 트리거 추가 ✅
- `cypress` workflow_dispatch 옵션 추가 ✅
- case 분기 추가 ✅
- dist-tag 판정 재사용 (alpha/beta/rc/latest) ✅
- id-token: write permission 기존 재사용 ✅
- "Unit tests (root)" 는 `src/**`만 커버, "SDK package tests" step 이 cypress 별도 실행 — 구조 정상 ✅

---

## 8. README 품질

- Playwright README 와 톤/구조 완전 일관
- 5분 quick start 실제 작동 (TS + JS 양쪽)
- TC ID 3 modes + annotation 미지원 이유 명시
- Cypress 12/13/14 호환성 테이블
- Troubleshooting 6 시나리오
- Badges 부재 — Playwright 도 없어 컨벤션 통일 OK

---

## 9. 회귀 리스크

| 항목 | 평가 |
|-----|------|
| packages/core 변경 | 없음 |
| packages/playwright 변경 | 없음 |
| package-lock.json 갱신 | 낮음 (19줄, npm ci 정상) |

---

## 10. OOS 준수 (10/10 미구현 확인)

Cypress Cloud / component test / realtime multi-spec / screenshot video / JUnit XML / retry override / auto TC / annotation polyfill / i18n logs / SIGINT recovery — 전부 의도적 미구현 확인.

---

## 11. 런칭 준비도 (2026-05-13 기준)

**B 옵션(5/13 Cypress 단독 런칭): 조건부 YES**

P1 3건 수정 + 재검수 통과 후 배포 가능.

---

## 12. CEO 실행 액션

1. Developer 에게 P1 3건 수정 요청
2. P1 수정 완료 + QA 재검수 통과
3. claude → main 수동 머지
4. (선택) 5/3 RC 태그: `git tag sdk-cypress-v0.9.0-rc.1 && git push`
5. 5/11 Playwright 런칭 + 48h 관측
6. 5/13 00:01 PST — 루트 README 업데이트 PR + 마케팅 플립 PR merge → 최종 태그:
   ```bash
   git tag sdk-cypress-v1.0.1 -m 'release: cypress-reporter 1.0.1'
   git push origin sdk-cypress-v1.0.1
   ```
7. 배포 검증: `npm view @testably.kr/cypress-reporter dist-tags.latest` → 1.0.1

---

**최종 판정: Ship with fixes — P1 3개 수정 후 재검수 필요**
