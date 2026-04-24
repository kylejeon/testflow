# QA Report: Site Content Audit — Cypress 1.0.1 LIVE 반영

> 검수일: 2026-04-24
> 커밋: `7c25726`
> 리서치: `docs/research/site-content-audit-2026-04-24.md`

---

## §1 판정

**Ship with minor fixes** — P0 차단 이슈 없음. 유저 혼동 우려 W 4건 추가 수정 권장.

- 총 검수 항목: 11 (P0 5 / P1 4 / P2 2)
- Pass: 11 / Warning: 4 / Fail: 0

---

## §2 리서치 §5 항목 vs 실제 커밋 대조

| # | 파일 | 상태 |
|---|------|------|
| P0-1 | roadmap/page.tsx | ✅ Completed 이동 + Selenium 제거 + Jest Planned 카드 신규 |
| P0-2 | changelog/page.tsx | ✅ Jest 제거 + 2026-05-11 / 05-13 stable entries 2건 신규 |
| P0-3 | f028-blog-ship-results-3-lines.md | ✅ Cypress "available today" 교체 |
| P0-4 | f028-changelog.md | ✅ "Also available now" 교체 |
| P0-5 | README.md | ✅ Cypress Stable (1.0.1) + npm 링크 |
| P1-1 | home/page.tsx EN+KO | ✅ 양쪽 Jest 제거 + coming soon |
| P1-2 | docs/integrations | ✅ Jest Coming Soon 배지 + Quick Install 주석 |
| P1-3 | docs/cicd | ✅ Jest 탭 amber preview 배너 |
| P1-4 | f028-twitter-thread.md | ✅ 5/13 reply draft 추가 |
| P2-1 | pricing/page.tsx | ✅ features + comparisonRows 교체 |
| P2-2 | docs/prd.md | ✅ reporter-core + cypress 추가 |

---

## §3 신규 발견 이슈 (Warning)

| # | 파일:라인 | 이슈 |
|---|----------|------|
| W-1 | `src/pages/home/page.tsx:278` | Professional 플랜 카드 features 배열에 "Test Automation Framework SDK" 구 표현 잔존. pricing 과 불일치. |
| W-2 | `src/pages/settings/page.tsx:125` | Professional 플랜 features 배열 동일 잔존. 앱 내 업그레이드 UI 에서 혼동 가능. |
| W-3 | `src/pages/changelog/page.tsx:77` | April 2026 entry `title` 필드가 "Test Automation Framework SDK" 유지. description/bullets 는 수정됐으나 제목만 미수정. |
| W-4 | `src/pages/docs/cicd/page.tsx:286` | 페이지 도입부 "Playwright, Cypress, and Jest" — Jest preview 배너와 메시지 불일치. |

---

## §4 회귀 검증

| 도구 | 결과 |
|-----|------|
| `npx tsc --noEmit` | ✅ 0 errors |
| `npm run test -- --run` | ✅ 255/255 |
| `npm run scan:i18n:parity` | ✅ 0 diff |
| `npm run scan:i18n:check` | ✅ 0 hardcoded |
| `npm run build` | ✅ 7.77s |

---

## §5 내부 정합성

| 체크 | 결과 |
|-----|------|
| EN/KO 동시 수정 (home) | ✅ |
| 3종 SDK 버전 1.0.1 일관 | ✅ |
| Jest "Planned/Coming soon" 일관 | ⚠ PARTIAL (W-3, W-4) |
| README ↔ pricing ↔ roadmap ↔ changelog 상태 일관 | ⚠ PARTIAL (W-1, W-2) |

---

## §6 CEO 후속 액션

### 런칭 전 수정 권장 (W-1 ~ W-4, 총 4줄 편집)

1. `src/pages/home/page.tsx:278` — features 배열 "Test Automation Framework SDK" → "Test Automation SDK (Playwright & Cypress)"
2. `src/pages/settings/page.tsx:125` — 동일 교체
3. `src/pages/changelog/page.tsx:77` — entry title "Test Automation Framework SDK" → "Test Automation SDK"
4. `src/pages/docs/cicd/page.tsx:286` — "Playwright, Cypress, and Jest" → "Playwright and Cypress (Jest in preview)"

각 1줄 텍스트 교체. 커밋 후 바로 머지 가능.

---

**최종 판정: Ship with minor fixes (W 4건 수정 후 깔끔)**
