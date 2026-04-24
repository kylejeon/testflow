# Research: Site Content Audit — SDK 런칭 이후 Stale 콘텐츠 전수 조사

> 작성일: 2026-04-24
> 계기: 2026-04-24 오후 `@testably.kr/cypress-reporter@1.0.1` stable LIVE.
>       Playwright 1.0.1 + reporter-core 1.0.1 도 동일일 publish.
>       런칭 이벤트: 5/11 Playwright PH + 5/13 Cypress sub-launch.

---

## §1 요약

- 총 발견: **11건** (P0 5 / P1 4 / P2 2)
- 범주: SDK 상태 오표기 / 타임라인 불일치 / Jest 동급 기술 / 마케팅 "Coming soon" stale

---

## §2 페이지별 Findings

### A. `README.md` (루트)
- **현재 (line 23-27)**: `@testably.kr/cypress-reporter — — Planned`
- **권장**: Cypress 행 → `Stable (1.0.1)` + npm 링크 추가. Jest 행은 유지.
- **우선순위**: **P0** (5/13 Cypress 런칭 플립 시)

### B. `src/pages/roadmap/page.tsx`
- **현재 (line 175-183)**: SDK 카드가 "Considering / TBD" 컬럼, desc 에 Selenium 언급
- **권장**: Playwright+Cypress → Completed / Q2 2026 컬럼으로 이동, Selenium 제거, desc 재작성 ("Native npm reporters for Playwright and Cypress.")
- **우선순위**: **P0** (5/11 런칭 전)

### C. `src/pages/changelog/page.tsx`
- **현재 (line 49-59)**: "April 2026" date 의 "Test Automation Framework SDK" entry 가 Jest 를 Playwright/Cypress 와 동급 기술
- **권장**: (1) Jest 문구 제거 또는 "Planned" 명시, (2) 2026-05-11 Playwright 1.0.1 stable entry 신규, (3) 2026-05-13 Cypress 1.0.1 stable entry 신규
- **우선순위**: **P0** (5/11)

### D. `src/pages/docs/cicd/page.tsx`
- **현재**: Playwright/Cypress/Jest 3 탭 모두 완전 문서화. Jest 탭에 preview 경고 없음.
- **권장**: Jest 탭 상단 info 배너 "preview / not officially supported"
- **우선순위**: P1

### E. `src/pages/docs/integrations/page.tsx`
- **현재 (line 278-318)**: Jest 카드가 Playwright/Cypress 와 동일 수준 노출
- **권장**: Jest 카드에 `Coming Soon` 배지 + Quick Install 에서 Jest 행 제거 or 주석
- **우선순위**: P1

### F. `src/pages/pricing/page.tsx`
- **현재 (line 106)**: Professional 기능 리스트에 "Test Automation Framework SDK" generic 표기
- **권장**: `'Test Automation SDK (Playwright & Cypress)'` 로 구체화
- **우선순위**: P2

### G. `src/pages/home/page.tsx`
- **현재 (line 165 EN, 585 KO)**: "Playwright, Cypress, **and Jest**" 동급 기술
- **권장**: Jest 제거 또는 "(Jest coming soon)" 명시. EN/KO 양쪽.
- **우선순위**: P1

### H. `docs/marketing/f028-changelog.md`
- **현재 (line 109)**: "Coming soon: Cypress Reporter"
- **권장**: "Available now: Cypress 1.0.1 stable" 로 교체 (5/13 퍼블리시 전)
- **우선순위**: **P0**

### I. `docs/marketing/f028-blog-ship-results-3-lines.md`
- **현재 (line 186)**: "Cypress and Jest reporter support is coming soon"
- **권장**: "Cypress 1.0.1 is also available today. Jest coming soon."
- **우선순위**: **P0** (5/11 blog publish 전)

### J. `docs/marketing/f028-twitter-thread.md`
- **현재 (line 102)**: "Cypress and Jest reporters are coming next"
- **권장**: 5/11 트윗 = 현재 유지 OK ("Cypress coming May 13"), 5/13 reply thread 에 "Cypress now live" 추가
- **우선순위**: P1

### K. `docs/prd.md`
- **현재 (line 468-473)**: 자사 SDK 테이블에 playwright-reporter 만 있음
- **권장**: reporter-core 1.0.1, cypress-reporter 1.0.1 추가. jest-reporter "Planned" 명시.
- **우선순위**: P2 (내부 문서)

---

## §3 카테고리 롤업

| 카테고리 | 건수 | P0 |
|---------|------|----|
| SDK 상태 오표기 | 7 | 2 |
| 마케팅 "Coming soon" stale | 3 | 2 |
| 버전 하드코딩 | 0 | 0 |
| 타임라인 불일치 | 2 | 2 |
| 링크 유효성 | 0 | 0 |

---

## §4 i18n

별도 `src/i18n/local/{en,ko}/*.ts` 파일엔 SDK 카피 없음. 마케팅 문구는 페이지 컴포넌트 내부에 EN/KO 객체 하드코딩 (home/page.tsx 등). 각 페이지별 수정 시 EN/KO 쌍 동시 처리 필요.

---

## §5 우선순위 매트릭스

### P0 — 런칭 전 필수 (≤ 5/11)
1. `src/pages/roadmap/page.tsx` — SDK Completed 컬럼 이동 + desc 수정
2. `src/pages/changelog/page.tsx` — Jest 문구 정리 + May 2026 stable entries
3. `docs/marketing/f028-blog-ship-results-3-lines.md` — Cypress "coming soon" 제거
4. `docs/marketing/f028-changelog.md` — Cypress available now

### P0 — 5/13 플립
5. `README.md` — Cypress "Planned" → Stable (1.0.1)

### P1 — 런칭 후 1주 (≤ 5/18)
6. `src/pages/home/page.tsx` — Jest 동급 기술 수정 (EN+KO)
7. `src/pages/docs/integrations/page.tsx` — Jest Coming Soon 배지
8. `src/pages/docs/cicd/page.tsx` — Jest 탭 preview 배너
9. `docs/marketing/f028-twitter-thread.md` — 5/13 reply draft

### P2 — nice-to-have
10. `src/pages/pricing/page.tsx` — SDK 구체 프레임워크명
11. `docs/prd.md` — 자사 SDK 테이블 확장

---

## §6 Planner 전달

모두 텍스트 교체 수준 — 별도 Dev Spec 불필요. Developer 에게 직접 전달 가능.
작업 단위:
- `SPEC-CONTENT-001`: Roadmap SDK 카드 재구성
- `SPEC-CONTENT-002`: Changelog SDK entries 업데이트
- `SPEC-CONTENT-003`: README.md Cypress 플립
- `SPEC-CONTENT-004`: Home/integrations/cicd Jest 상태 표시
- `SPEC-CONTENT-005`: Marketing docs Cypress "coming soon" 제거
- `SPEC-CONTENT-006`: Pricing + PRD SDK 명시 (P2)

---

## §7 데이터 소스

- `README.md`
- `src/pages/{home,pricing,roadmap,changelog}/page.tsx`
- `src/pages/docs/{cicd,integrations}/page.tsx`
- `docs/prd.md`
- `docs/marketing/f028-{changelog,blog-ship-results-3-lines,twitter-thread,product-hunt-launch,launch-plan-may11}.md`
