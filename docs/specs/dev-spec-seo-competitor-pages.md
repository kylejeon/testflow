# Dev Spec: SEO Competitor Full-Coverage Pages

> **작성일:** 2026-05-13
> **작성자:** @planner
> **상태:** Draft → Review → Approved
> **관련 디자인:** `docs/specs/design-spec-seo-competitor-pages.md` (Phase 3 산출 예정, 5/14~5/15)
> **관련 리서치:** `docs/research/seo-competitor-strategy-brief.md`, `docs/research/seo-keyword-map.md`, `docs/research/competitor-*.md` × 10
> **타깃 산출:** ~45개 신규/보강 마케팅 페이지 (라우팅·데이터·prerender·sitemap 포함)

---

## 1. 개요

- **문제:** 현재 `/compare/{testrail,zephyr,qase}` 3개 페이지 + 블로그 1편으로는 "testrail alternative" (>10K/mo) 같은 상업적 의도 키워드를 거의 잡지 못한다. 경쟁사 10개 × 4개 패턴(=~45 페이지)의 콘텐츠 갭이 SEO 유입의 가장 큰 병목.
- **해결:** 데이터 주도 페이지 생성 구조를 도입하여 (a) 기존 `/compare/{slug}` 3개를 10개로 확장, (b) 신규 `/alternatives/{slug}` 10개를 추가, (c) 상위 6개 경쟁사 간 `/compare/{a}-vs-{b}` 매트릭스 15개, (d) 블로그 11편을 모두 동일한 빌드 파이프라인(라우터 + prerender + sitemap)으로 일괄 출시.
- **성공 지표:**
  - 12주 후 organic search session 300% 증가 (현재 baseline 대비, Google Search Console 기준)
  - "testrail alternative" / "zephyr alternative" 등 8개 핵심 키워드 SERP 1페이지 진입
  - 신규 페이지 group의 평균 Lighthouse SEO 점수 90+
  - prerender 빌드 시간 90초 이내 유지 (45개 추가 후)

---

## 2. 유저 스토리

- As a **TestRail 유저 (이탈 검토 중)**, I want to **"testrail alternative" 구글 검색 시 Testably 페이지를 1페이지에서 발견**, so that **flat-rate 가격 + AI + 마이그레이션 경로를 한 화면에서 파악하고 회원가입까지 갈 수 있다**.
- As a **Xray vs Zephyr 비교 중인 QA 매니저**, I want to **"xray vs zephyr" 검색 결과에서 양쪽 모두를 다루는 Testably의 vs-매트릭스 페이지를 발견**, so that **경쟁사 양자 비교 도중 자연스럽게 제3의 대안인 Testably를 인지할 수 있다**.
- As a **아직 도구를 결정하지 않은 QA 리더**, I want to **"best test management tool 2026" 검색 결과에서 종합 랭킹 블로그를 발견**, so that **시장 전체 옵션을 빠르게 비교한 뒤 Testably 트라이얼을 시작할 수 있다**.
- As a **Testably 마케터**, I want to **새 경쟁사를 추가할 때 데이터 파일 1개와 라우트 등록만으로 4종 페이지가 자동 생성되도록**, so that **운영 부담 없이 SEO 콘텐츠 확장이 가능하다**.
- As a **Testably 개발자**, I want to **prerender ROUTES와 sitemap.xml이 단일 데이터 소스에서 자동 생성되도록**, so that **누락·드리프트 없이 빌드만으로 SEO 자산이 동기화된다**.

---

## 3. 수용 기준 (Acceptance Criteria)

### 라우팅 / 페이지 산출

- [ ] **AC-1:** `/compare/{slug}` 10개 슬러그(`testrail`, `zephyr`, `qase`, `xray`, `practitest`, `testpad`, `kiwi-tcms`, `testmonitor`, `browserstack-tm`, `testiny`) 모두 200 OK 응답하고 각 페이지의 `<h1>`, `<title>`, canonical URL이 슬러그별로 고유하다.
- [ ] **AC-2:** `/alternatives/{slug}` 10개가 모두 200 OK이며 각 페이지에 `data.alternativePageData.h1` 텍스트가 `<h1>` 으로 렌더된다.
- [ ] **AC-3:** `/compare/{a}-vs-{b}` 15개(C(6,2)) 페이지가 모두 200 OK이며 `{a}`, `{b}`는 항상 알파벳 오름차순 슬러그 (예: `practitest-vs-testrail` O, `testrail-vs-practitest` X — 후자는 301 리다이렉트로 정렬형으로 보내거나 404).
- [ ] **AC-4:** `/blog/{slug}-alternatives-2026` 10편 + `/blog/best-test-management-tools-2026` 1편 = 총 11편이 200 OK이며 `BLOG_POSTS` 에 등록되어 `/blog` 인덱스에서 노출된다.
- [ ] **AC-5:** 잘못된 슬러그(예: `/compare/foo`, `/alternatives/bar`, `/compare/aaa-vs-bbb`) 접근 시 NotFound 페이지가 렌더되고 응답 코드 404 의미를 가지는 메타(`noindex`)를 가진다.

### 데이터 모델

- [ ] **AC-6:** `src/data/competitors/types.ts` 의 `CompetitorData` 인터페이스에 `alternativePageData`, `keyComparisons`, `migrationGuide` 필드가 옵셔널로 추가되고, 기존 testrail/zephyr/qase 3개 데이터는 새 필드를 채워서 빌드/타입체크 무에러로 통과한다.
- [ ] **AC-7:** 10개 경쟁사 데이터 파일이 `src/data/competitors/<slug>.ts` 로 모두 존재하며 `CompetitorData` 타입을 만족한다.
- [ ] **AC-8:** 15개 vs-매트릭스 데이터가 `src/data/vs-matrix/<a>-vs-<b>.ts` 로 존재하며 `VsMatrixData` 타입을 만족한다.

### SEO 자산

- [ ] **AC-9:** 모든 신규 페이지가 `<link rel="canonical">` 을 `https://testably.app/...` 절대 URL로 가지며 prerender 결과 HTML에 직렬화된다.
- [ ] **AC-10:** 모든 신규 페이지가 `og:title`, `og:description`, `og:url`, `twitter:card`, `og:image` 4종을 가진다.
- [ ] **AC-11:** `/compare/*`, `/alternatives/*`, `/compare/*-vs-*` 페이지는 `FAQPage` JSON-LD를 가지고, 블로그 11편은 `BlogPosting` JSON-LD를 가진다.
- [ ] **AC-12:** `public/sitemap.xml`이 빌드 타임에 자동 생성되어 신규 45개 URL을 모두 포함한다. 수동 편집은 더 이상 필요 없다.
- [ ] **AC-13:** `scripts/prerender.mjs` 의 ROUTES 배열이 동일한 single source of truth에서 자동 생성되어 sitemap과 prerender 대상이 100% 일치한다.

### 콘텐츠 고유성 (SEO 패널티 방지)

- [ ] **AC-14:** 각 `/alternatives/{slug}` 페이지의 H1, intro paragraph, 마이그레이션 가이드 섹션은 100% 고유 카피 (다른 슬러그 페이지와 텍스트 중복 0%).
- [ ] **AC-15:** 각 vs-매트릭스 페이지의 H1, intro, "왜 둘 다 한계인가" 섹션이 페이지별 고유 카피.
- [ ] **AC-16:** 11편 블로그는 각 페이지의 본문이 최소 1,500 단어 이상이며 다른 블로그/페이지와의 5-gram 중복 비율 30% 이하 (스크립트 검증 옵션).

### 빌드/성능

- [ ] **AC-17:** `npm run build` (vite build + prerender) 가 로컬 머신 기준 120초 이내에 완료된다.
- [ ] **AC-18:** Lighthouse SEO 점수가 신규 페이지 무작위 표본 5개에서 90점 이상.
- [ ] **AC-19:** 신규 페이지에서 발생하는 console error가 0건 (prerender 단계 pageerror 로그 기준).

---

## 4. 기능 상세

### 4-1. URL 라우팅 패턴

| 패턴 | URL 예시 | 페이지 수 | 라우터 정의 | 데이터 소스 |
|------|----------|----------|-------------|------------|
| 기존 Testably vs | `/compare/testrail` | 10 (3 보강 + 7 신규) | `/compare/:competitor` (이미 존재) | `src/data/competitors/<slug>.ts` |
| Alternative 페이지 | `/alternatives/testrail` | 10 (신규) | `/alternatives/:competitor` (신규) | `src/data/competitors/<slug>.ts` → `alternativePageData` |
| vs 매트릭스 | `/compare/practitest-vs-testrail` | 15 (신규) | `/compare/:matchup` (신규, `:competitor` 와 동일 path지만 슬러그에 `-vs-` 포함 여부로 분기) | `src/data/vs-matrix/<a>-vs-<b>.ts` |
| Alternative 인덱스 | `/alternatives` | 1 (신규) | `/alternatives` | `src/data/competitors/*` 동적 순회 |
| 블로그 — 경쟁사별 | `/blog/testrail-alternatives-2026` | 10 (신규) | `/blog/<slug>-alternatives-2026` (개별 등록) | 개별 `page.tsx` |
| 블로그 — 종합 랭킹 | `/blog/best-test-management-tools-2026` | 1 (신규) | `/blog/best-test-management-tools-2026` | 개별 `page.tsx` |

#### 4-1-1. `/compare/:competitor` 슬러그 분기 규칙 (중요)

기존 `/compare/:competitor` 라우트는 단일 경쟁사만 처리. 본 작업에서 동일 path가 두 가지 의미를 가지도록 분기.

```
:competitor 값에 "-vs-" 가 포함되어 있으면 → vs-매트릭스 페이지
:competitor 값에 "-vs-" 가 포함되어 있지 않으면 → Testably vs 경쟁사 (기존 동작)
```

**권장:** 동일 path 유지 (`/compare/:competitor`)하고 페이지 컴포넌트 내부에서 분기.

**사유:**
- 새 라우트 추가 시마다 router config 수정 안 해도 됨
- 기존 backlink 호환성 유지 (`/compare/testrail` 그대로 작동)
- React Router 의 `:competitor` 파라미터를 정규식으로 제약할 수도 있지만 (`/^[a-z-]+-vs-[a-z-]+$/`) v6 표준 라우팅으로는 정규식 제약이 깔끔하지 않음 → 컴포넌트 내부 분기가 더 단순

**vs-매트릭스 슬러그 정규화 규칙:**
- 알파벳 오름차순으로만 생성 (예: `practitest-vs-testrail` O, `testrail-vs-practitest` X)
- 빌드 타임 검증: `src/data/vs-matrix/` 파일명이 정렬 규칙을 위반하면 sitemap generator가 throw
- 잘못된 순서로 들어오는 URL은 페이지 컴포넌트에서 정렬형으로 301 redirect (`<Navigate to="/compare/{a}-vs-{b}" replace />`)

#### 4-1-2. `/alternatives/:competitor` 신규 라우트

```tsx
// src/router/config.tsx 에 추가
{ path: '/alternatives', element: <AlternativesIndexPage /> },
{ path: '/alternatives/:competitor', element: <AlternativePage /> },
```

기존 `/compare/:competitor` 와 동일한 데이터 (`CompetitorData`)를 사용하되 `alternativePageData` 필드만 별도로 렌더 (다른 H1, 다른 intro, 마이그레이션 가이드 섹션).

---

### 4-2. 동작 흐름 (Flow)

#### Happy Path — `/alternatives/testrail` 방문자

1. 유저가 구글에서 "testrail alternative" 검색 → SERP 1페이지 진입
2. `/alternatives/testrail` 클릭 → prerender된 HTML 1차 응답
3. `useParams` 가 `competitor='testrail'` 추출 → `COMPETITORS['testrail']` 데이터 로드
4. `data.alternativePageData` 가 있는지 확인 → 없으면 NotFound
5. SEO 메타 (title/description/canonical/og/twitter/JSON-LD) 주입
6. Hero (alt H1, 가격 비교 callout) → 비교 표 → 마이그레이션 가이드 → FAQ → CTA 순 렌더
7. "Start free" CTA → `https://app.testably.io/signup`

#### Alternative Path — vs-매트릭스 페이지

1. 유저가 "testrail vs zephyr" 검색
2. `/compare/testrail-vs-zephyr` 진입
3. 컴포넌트가 `competitor='testrail-vs-zephyr'` → `-vs-` 감지 → vs-매트릭스 분기
4. `vsMatrixData['testrail-vs-zephyr']` 로드 (없으면 NotFound)
5. 슬러그 순서 검증 (알파벳 오름차순 아니면 정렬형 URL로 redirect)
6. 페이지 렌더: "둘 다 한계가 있다 → Testably가 제3의 답"

#### Error Path

| 케이스 | 동작 |
|--------|------|
| `/compare/unknown` | NotFound + `noindex` |
| `/compare/testrail-vs-unknown` | NotFound + `noindex` |
| `/compare/zephyr-vs-testrail` (잘못된 정렬 순) | 301 → `/compare/testrail-vs-zephyr` |
| `/alternatives/unknown` | NotFound + `noindex` |

---

### 4-3. 비즈니스 규칙

| 규칙 ID | 규칙 | 비고 |
|---------|------|------|
| BR-1 | 신규 경쟁사 추가 시 `src/data/competitors/<slug>.ts` 1개 파일 추가 + `src/data/competitors/index.ts` 의 `COMPETITORS` 맵에 등록만으로 `/compare/<slug>`, `/alternatives/<slug>`, sitemap, prerender 4가지가 자동으로 활성화된다 | Single source of truth |
| BR-2 | vs-매트릭스 추가 시 `src/data/vs-matrix/<a>-vs-<b>.ts` 1개 파일 추가만으로 `/compare/<a>-vs-<b>` 가 자동 활성화된다 | 동일 |
| BR-3 | 슬러그는 lowercase + `-`(hyphen)만. underscore/공백/대문자 금지 | URL 정규화 |
| BR-4 | vs-매트릭스 슬러그는 알파벳 오름차순 정렬 강제. 빌드 타임 검증 | 중복 URL 방지 |
| BR-5 | 콘텐츠는 "as of YYYY-MM" 표기 필수. 가격/기능 정보의 책임 회피 조항 | 법적 리스크 |
| BR-6 | 모든 비교 데이터는 출처 표기 (페이지 하단 footer 또는 FAQ) | 비교 광고 규제 |
| BR-7 | Testably 와 직접 비교 항목은 우리에게 유리한 prismatic framing 사용. 단, 거짓 주장 금지 (legal safe harbor) | 윤리/법적 |

---

### 4-4. 권한 (RBAC)

본 작업은 **공개 마케팅 페이지**이므로 인증/권한 무관.

| 역할 | 접근 |
|------|------|
| 비로그인 (Guest) | 모든 신규 페이지 접근 가능 |
| Owner/Admin/Manager/Tester/Viewer | 동일 (마케팅 페이지) |

**Note:** 추후 admin 페이지에서 경쟁사 데이터를 CMS로 편집하는 기능은 Out of Scope. 본 작업은 코드 내 정적 데이터.

---

### 4-5. 플랜별 제한

본 작업은 마케팅 페이지이므로 **유저 플랜과 무관**. 단, 페이지에서 노출하는 Testably 플랜 정보는 항상 최신 가격 (Free / Hobby $19 / Starter $49 / Professional $99 / Enterprise S $249 · M $499 · L Custom) 을 기준으로 작성.

---

## 5. 데이터 설계

### 5-1. 신규 / 확장 타입 (`src/data/competitors/types.ts`)

```typescript
// 기존 타입 (변경 없음)
export interface FeatureRow { ... }
export interface PricingRow { ... }
export interface KeyDifference { ... }
export interface FAQ { ... }

// 기존 CompetitorData 에 옵셔널 필드 추가
export interface CompetitorData {
  // ─── 기존 필드 (그대로 유지) ───
  slug: string;
  name: string;
  tagline: string;
  description: string;
  savingsCallout: string;
  metaTitle: string;
  metaDescription: string;
  metaKeywords: string[];
  features: FeatureRow[];
  keyDifferences: KeyDifference[];
  pricingRows: PricingRow[];
  faqs: FAQ[];
  ctaText: string;
  ctaSubtext: string;

  // ─── 신규 필드 (모두 옵셔널, 점진적 채움) ───

  /** Alternative 페이지 (/alternatives/{slug}) 전용 카피 */
  alternativePageData?: AlternativePageData;

  /** 이 경쟁사와 자주 비교되는 다른 경쟁사들 (UI 추천 슬롯용) */
  relatedCompetitors?: string[]; // slug 배열

  /** 마이그레이션 가이드 (CSV import 등 단계) */
  migrationGuide?: MigrationGuide;

  /** Last reviewed date (콘텐츠 신선도 표기용) */
  lastReviewed?: string; // ISO yyyy-mm-dd
}

export interface AlternativePageData {
  /** Alternative 페이지 H1. 카피 hook 활용 */
  h1: string;
  /** Hero subhead, 2~3 문장 */
  subhead: string;
  /** 인트로 paragraph (페이지별 고유 카피, 200+ 단어) */
  introBody: string;
  /** "Why developers leave {Competitor}" 섹션 — 경쟁사 약점 3~5개 */
  whyLeave: { title: string; body: string }[];
  /** "Why Testably is the better alternative" 섹션 */
  whySwitch: { title: string; body: string }[];
  /** Alternative 페이지 전용 메타 (compare 페이지의 metaTitle/Description 와 분리) */
  metaTitle: string;
  metaDescription: string;
  /** Alternative 페이지에서 노출할 FAQ (compare 페이지 faqs와 별도 또는 일부 공유 가능) */
  faqs?: FAQ[];
}

export interface MigrationGuide {
  /** "5분 안에 옮기는 법" 같은 sub-title */
  title: string;
  /** 단계 리스트 (CSV export → 매핑 → import → 검증) */
  steps: { num: number; title: string; body: string }[];
  /** 호환 import 포맷 (CSV / API) */
  importFormats: string[];
  /** 도구 매핑 표 (경쟁사 필드 → Testably 필드) */
  fieldMapping?: { from: string; to: string; note?: string }[];
}

// ─── vs-매트릭스 전용 데이터 ───
export interface VsMatrixData {
  /** "practitest-vs-testrail" 형식의 슬러그 (알파벳 오름차순) */
  slug: string;
  /** 두 경쟁사 슬러그 (a < b, 알파벳 오름차순) */
  a: string;
  b: string;
  /** 페이지 H1 */
  h1: string;
  /** subhead */
  subhead: string;
  /** intro paragraph (페이지별 고유) */
  introBody: string;
  /** A vs B vs Testably 3-way feature matrix */
  featureMatrix: ThreeWayFeatureRow[];
  /** A vs B vs Testably 3-way pricing matrix */
  pricingMatrix: ThreeWayPricingRow[];
  /** "왜 A 도 B 도 한계가 있나" — 양쪽 약점 요약 */
  bothLimitations: { competitor: 'a' | 'b'; title: string; body: string }[];
  /** "왜 Testably 가 더 나은 선택인가" */
  testablyWins: { title: string; body: string }[];
  /** 페이지 메타 */
  metaTitle: string;
  metaDescription: string;
  metaKeywords: string[];
  /** FAQ */
  faqs: FAQ[];
  /** Last reviewed */
  lastReviewed: string;
}

export interface ThreeWayFeatureRow {
  feature: string;
  testably: boolean | string;
  a: boolean | string;
  b: boolean | string;
}

export interface ThreeWayPricingRow {
  plan: string;
  testably: { price: string; detail: string };
  a: { price: string; detail: string };
  b: { price: string; detail: string };
}
```

#### 결정 — vs-매트릭스 데이터 모듈 구조

**권장:** `src/data/vs-matrix/<a>-vs-<b>.ts` 개별 파일 + `src/data/vs-matrix/index.ts` 자동 export

**사유:**
- 각 vs-매트릭스 페이지의 콘텐츠가 1KB+ → 파일 분리하면 lazy-load 시 청크 분할 효율
- git diff 가독성: 1개 페이지 수정 시 1개 파일만 바뀜
- 단일 통합 파일 (`src/data/vs-matrix.ts`)은 15개 페이지 합치면 ~20KB 가 되어 마케팅 페이지 초기 로드 부담
- 기존 `src/data/competitors/` 패턴과 일관

```
src/data/vs-matrix/
├── index.ts                          ← 자동 export (Vite import.meta.glob)
├── practitest-vs-testrail.ts
├── practitest-vs-xray.ts
├── practitest-vs-zephyr.ts
├── practitest-vs-qase.ts
├── practitest-vs-testpad.ts
├── qase-vs-testrail.ts
├── qase-vs-testpad.ts
├── qase-vs-xray.ts
├── qase-vs-zephyr.ts
├── testpad-vs-testrail.ts
├── testpad-vs-xray.ts
├── testpad-vs-zephyr.ts
├── testrail-vs-xray.ts
├── testrail-vs-zephyr.ts
└── xray-vs-zephyr.ts
```

#### 5-2. 경쟁사 데이터 인덱스 (`src/data/competitors/index.ts`, 신규)

```typescript
import type { CompetitorData } from './types';

// Vite glob import: 새 파일만 추가하면 자동 등록
const modules = import.meta.glob<{ default: CompetitorData }>(
  './*.ts',
  { eager: true, import: 'default' }
);

export const COMPETITORS: Record<string, CompetitorData> = Object.fromEntries(
  Object.entries(modules)
    .filter(([path]) => !path.endsWith('/index.ts') && !path.endsWith('/types.ts'))
    .map(([, mod]) => [mod.slug, mod])
);

export const COMPETITOR_SLUGS = Object.keys(COMPETITORS).sort();
```

> **주의:** `import.meta.glob` 은 prerender 환경(Node)에서는 직접 안 됨. 이 인덱스는 **클라이언트 빌드 전용**. sitemap generator (Node) 는 별도로 파일 시스템 scan으로 슬러그 추출 (5-4 참조).

#### 5-3. 라우트 단일 소스 (`src/data/seo-routes.ts`, 신규)

```typescript
// 모든 SEO 페이지 라우트의 single source of truth.
// prerender.mjs 와 generate-sitemap.mjs 가 이 파일을 직접 import 하거나,
// 빌드 스크립트가 동일 알고리즘으로 파일 시스템을 scan.

export interface SeoRouteMeta {
  path: string;
  lastmod: string;       // ISO yyyy-mm-dd
  changefreq: 'weekly' | 'monthly' | 'yearly';
  priority: number;      // 0.1 ~ 1.0
}

export const STATIC_ROUTES: SeoRouteMeta[] = [
  { path: '/', lastmod: '2026-05-13', changefreq: 'weekly', priority: 1.0 },
  { path: '/pricing', lastmod: '2026-05-13', changefreq: 'monthly', priority: 0.9 },
  // ... (기존 정적 라우트 그대로 이전)
  { path: '/alternatives', lastmod: '2026-05-13', changefreq: 'monthly', priority: 0.9 },
];
```

> sitemap generator 와 prerender 가 이 모듈을 import 한 뒤, 추가로 `src/data/competitors/` 와 `src/data/vs-matrix/` 디렉토리를 fs.readdir 로 scan 하여 동적 라우트를 합친다.

### 5-4. DB / RLS

본 작업은 **정적 데이터 + 마케팅 페이지** 이므로 **DB 변경 없음, RLS 변경 없음**.

향후 admin CMS 가 도입되면 별도 dev spec.

---

## 6. API 설계

본 작업은 **클라이언트 사이드 정적 데이터만 사용** → Supabase API 없음.

### 6-1. 빌드 타임 스크립트 인터페이스

#### `scripts/generate-sitemap.mjs` (신규)

```js
// 1. STATIC_ROUTES 로딩 (src/data/seo-routes.ts → dynamic import 또는 별도 JSON)
// 2. src/data/competitors/*.ts 파일 명 scan → 슬러그 추출
// 3. src/data/vs-matrix/*.ts 파일 명 scan → 슬러그 추출
// 4. src/pages/blog/posts.ts 의 BLOG_POSTS 로드 → 블로그 슬러그 추출
// 5. 통합 라우트 리스트 생성:
//    - /compare/<slug>            (10개, COMPETITOR_SLUGS)
//    - /alternatives/<slug>       (10개)
//    - /compare/<a>-vs-<b>        (15개, VS_MATRIX_SLUGS)
//    - /blog/<post.slug>          (11개 + 기존 3개)
// 6. lastmod = competitor.lastReviewed 또는 vs.lastReviewed 사용
// 7. public/sitemap.xml 으로 출력 (XML format with proper escaping)
//
// 실행: npm run prebuild (package.json scripts에 추가)
//   "prebuild": "node scripts/generate-sitemap.mjs && node scripts/generate-routes.mjs"
```

#### `scripts/generate-routes.mjs` (신규, 또는 prerender.mjs 내부에 통합)

```js
// generate-sitemap.mjs 와 동일 데이터 소스로 ROUTES 배열을 생성.
// 출력 방식 두 가지 옵션:
//
// (A) prerender.mjs 가 직접 동일 scan 함수를 호출 (권장)
//     → 별도 generated 파일 없음, ROUTES 가 런타임에 계산됨
//     → prerender.mjs 의 ROUTES 하드코딩 배열 제거
//
// (B) scripts/routes.generated.json 으로 출력 후 prerender 가 읽음
//     → generated 파일 .gitignore 필요
//
// 권장: (A). 파일 1개 줄고 sync 이슈 없음.
```

#### `scripts/prerender.mjs` (수정)

```diff
- const ROUTES = [
-   '/',
-   '/pricing',
-   // ... 46개 하드코딩
- ];
+ import { computeAllRoutes } from './seo-routes-scanner.mjs';
+ const ROUTES = await computeAllRoutes(ROOT);
+ // ROUTES.length ≈ 90 (기존 46 + 신규 ~45)
```

---

## 7. 영향 범위 (변경 파일 목록)

### 신규 파일 (코드)

| 파일 | 역할 |
|------|------|
| `src/data/competitors/index.ts` | 자동 export 인덱스 (import.meta.glob) |
| `src/data/competitors/xray.ts` | Xray 데이터 |
| `src/data/competitors/practitest.ts` | PractiTest 데이터 |
| `src/data/competitors/testpad.ts` | TestPad 데이터 |
| `src/data/competitors/kiwi-tcms.ts` | Kiwi TCMS 데이터 |
| `src/data/competitors/testmonitor.ts` | TestMonitor 데이터 |
| `src/data/competitors/browserstack-tm.ts` | BrowserStack TM 데이터 |
| `src/data/competitors/testiny.ts` | Testiny 데이터 |
| `src/data/vs-matrix/index.ts` | 자동 export 인덱스 |
| `src/data/vs-matrix/<a>-vs-<b>.ts` × 15 | 15개 vs-매트릭스 데이터 |
| `src/data/seo-routes.ts` | 정적 SEO 라우트 메타 (lastmod / priority) |
| `src/pages/alternatives/page.tsx` | `/alternatives/:competitor` 페이지 컴포넌트 |
| `src/pages/alternatives/index.tsx` | `/alternatives` 인덱스 페이지 |
| `src/pages/compare/vs-matrix.tsx` | `/compare/:a-vs-:b` 페이지 컴포넌트 (compare/page.tsx 에서 분기로 호출) |
| `src/pages/blog/testrail-alternatives-2026/page.tsx` | 블로그 |
| `src/pages/blog/zephyr-alternatives-2026/page.tsx` | 블로그 |
| `src/pages/blog/qase-alternatives-2026/page.tsx` | 블로그 |
| `src/pages/blog/xray-alternatives-2026/page.tsx` | 블로그 |
| `src/pages/blog/practitest-alternatives-2026/page.tsx` | 블로그 |
| `src/pages/blog/testpad-alternatives-2026/page.tsx` | 블로그 |
| `src/pages/blog/kiwi-tcms-alternatives-2026/page.tsx` | 블로그 |
| `src/pages/blog/testmonitor-alternatives-2026/page.tsx` | 블로그 |
| `src/pages/blog/browserstack-tm-alternatives-2026/page.tsx` | 블로그 |
| `src/pages/blog/testiny-alternatives-2026/page.tsx` | 블로그 |
| `src/pages/blog/best-test-management-tools-2026/page.tsx` | 블로그 (종합 랭킹) |
| `scripts/generate-sitemap.mjs` | 빌드 타임 sitemap.xml 생성 |
| `scripts/seo-routes-scanner.mjs` | 공통 라우트 scan 유틸 (prerender + sitemap 공유) |

### 수정 파일

| 파일 | 변경 내용 |
|------|---------|
| `src/data/competitors/types.ts` | `AlternativePageData`, `MigrationGuide`, `VsMatrixData`, `ThreeWayFeatureRow`, `ThreeWayPricingRow` 인터페이스 추가. `CompetitorData` 에 옵셔널 필드 4개 추가 |
| `src/data/competitors/testrail.ts` | `alternativePageData`, `migrationGuide`, `lastReviewed` 채움 |
| `src/data/competitors/zephyr.ts` | 동일 |
| `src/data/competitors/qase.ts` | 동일 |
| `src/router/config.tsx` | `/alternatives`, `/alternatives/:competitor`, `/blog/*-alternatives-2026` × 10, `/blog/best-test-management-tools-2026` 라우트 추가. `/compare/:competitor` 라우트는 그대로 (페이지 내부에서 `-vs-` 분기) |
| `src/pages/compare/page.tsx` | `:competitor` 슬러그에 `-vs-` 포함 시 vs-매트릭스 컴포넌트로 분기. COMPETITORS 맵을 `src/data/competitors/index.ts` 의 자동 export 로 교체 (수동 import 3개 제거) |
| `src/pages/compare/index.tsx` | 경쟁사 카드 3개 → 10개로 확장. `featureMatrix` 4-열 → 11-열 (Testably + 10개 경쟁사) 또는 핵심 6열로 압축 (디자인 결정) |
| `src/pages/blog/posts.ts` | `BLOG_POSTS` 에 신규 11편 메타 추가 |
| `scripts/prerender.mjs` | 하드코딩된 ROUTES 배열 제거 → `seo-routes-scanner.mjs` 의 `computeAllRoutes()` 호출 |
| `package.json` | `"prebuild": "node scripts/generate-sitemap.mjs"` 스크립트 추가. 기존 `build` 가 prebuild → vite build → postbuild(prerender) 순으로 실행되도록 |
| `public/sitemap.xml` | **자동 생성 대상으로 전환** — 기존 수동 편집 파일 제거 후 .gitignore 추가 또는 generator 결과로 덮어쓰기 (둘 중 결정: 권장 = git 추적 유지하되 generator 가 매 빌드마다 덮어쓰기) |

### 변경 없음 (확인용)

- `src/components/SEOHead.tsx` — 그대로 사용 (이미 canonical absolute URL 지원, 5/13 픽스 반영됨)
- `src/components/marketing/MarketingLayout.tsx` — 그대로 사용
- Supabase migration / RLS — 변경 없음
- locales/en.json / locales/ko.json — 변경 없음 (Out of Scope: i18n)

---

## 8. SEO 메타 패턴 표준화

### 8-1. 페이지 유형별 메타 매트릭스

| 페이지 유형 | `<title>` 패턴 | description 패턴 | canonical | og:type | JSON-LD `@type` |
|------------|----------------|------------------|-----------|---------|------------------|
| `/compare/{slug}` | `Testably vs {Name} (2026) \| Affordable Test Management Alternative` | 기존 `metaDescription` 사용 | `https://testably.app/compare/{slug}` | `website` | `FAQPage` (기존 유지) |
| `/alternatives/{slug}` | `Best {Name} Alternative in 2026 — Testably` | `alternativePageData.metaDescription` | `https://testably.app/alternatives/{slug}` | `website` | `FAQPage` + `SoftwareApplication` (Testably) |
| `/compare/{a}-vs-{b}` | `{NameA} vs {NameB} (2026): Pricing, Features & a Better Alternative` | `vsMatrixData.metaDescription` | `https://testably.app/compare/{a}-vs-{b}` | `website` | `FAQPage` |
| `/blog/{slug}-alternatives-2026` | `Best {Name} Alternatives in 2026: 5 Tools Compared` | post.description | `https://testably.app/blog/{slug}-alternatives-2026` | `article` | `BlogPosting` |
| `/blog/best-test-management-tools-2026` | `Best Test Management Tools in 2026: 10 Tools Compared` | post.description | `https://testably.app/blog/best-test-management-tools-2026` | `article` | `BlogPosting` |
| `/alternatives` (인덱스) | `Test Management Alternatives — Testably` | "Compare Testably to TestRail, Zephyr, Qase, and 7 more..." | `https://testably.app/alternatives` | `website` | 없음 |

### 8-2. JSON-LD `SoftwareApplication` (alternative 페이지에서 Testably 자체 마킹)

```json
{
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "Testably",
  "applicationCategory": "DeveloperApplication",
  "operatingSystem": "Web",
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "USD"
  },
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.8",
    "ratingCount": "120"
  }
}
```

> **주의:** `aggregateRating` 은 실제 리뷰 데이터가 있을 때만 사용 (Google 가짜 평점 패널티 위험). 초기 출시 시 G2/Capterra 리뷰가 부족하면 이 필드는 **제외**. 추후 리뷰 누적되면 추가.

### 8-3. 콘텐츠 고유성 검증 (선택, 권장)

빌드 타임에 `scripts/check-content-uniqueness.mjs` 실행하여 페이지 간 5-gram 중복 비율 측정. 30% 초과하는 페이지가 있으면 빌드 실패. (Phase 5 QA 와 협의 후 도입 결정)

---

## 9. 엣지 케이스

| 케이스 | 예상 동작 |
|--------|---------|
| `/compare/foo` (등록 안 된 슬러그) | `COMPETITORS[foo]` undefined → NotFound, `noindex` 메타 |
| `/compare/testrail-vs-foo` (한쪽만 등록) | `vsMatrixData['testrail-vs-foo']` undefined → NotFound |
| `/compare/zephyr-vs-testrail` (잘못 정렬된 vs URL) | 페이지 컴포넌트가 두 슬러그 정렬 후 정렬형 URL로 `<Navigate replace />` |
| `/compare/TESTRAIL` (대문자) | React Router default case-sensitive. NotFound 처리 OR 소문자로 redirect (권장: NotFound, sitemap에는 소문자만 노출) |
| `/alternatives/testrail/` (trailing slash) | Vercel 가 자동 정규화. 신경 안 써도 됨 |
| sitemap.xml 생성 시 디렉토리 비어있음 | scanner 가 0건이면 generator 가 warning 출력 후 STATIC_ROUTES 만으로 sitemap 생성 |
| vs-매트릭스 슬러그 파일명이 정렬 규칙 위반 (예: `zebra-vs-alpha.ts`) | generate-sitemap.mjs 가 `throw` → 빌드 실패 |
| 두 슬러그가 같음 (예: `testrail-vs-testrail.ts`) | 빌드 실패 |
| prerender 도중 puppeteer pageerror | 기존 로직대로 warning 만 출력하고 계속 진행 (현재 동작 유지). 단, 모든 신규 페이지에서 pageerror 0건이 AC-19 |
| 빌드 시간이 120초 초과 (AC-17 위반) | manualChunks 검토. 데이터 파일은 별도 청크로 묶어 lazy-load. prerender 페이지 단위 concurrency 도입 검토 (현재는 직렬) |
| `alternativePageData` 가 비어있는 슬러그를 `/alternatives/<slug>` 로 접근 | NotFound (graceful degradation 대신 명시적 차단) — 운영자가 alternative 페이지 준비 안 됐을 때 노출 방지 |
| 동시 편집 (마케터 + 개발자 같은 데이터 파일 수정) | Git merge conflict. 기능 단위로 PR 분리 권장 |
| 콘텐츠 중복 30% 초과 | (옵션) check-content-uniqueness.mjs 가 빌드 실패 시키거나 warning 로그 |
| 잘못된 슬러그가 sitemap에 포함됨 | NotFound 페이지가 200 응답 (SPA fallback 문제). Vercel에서 404 상태 코드 반환하도록 NotFound 페이지에서 추가 처리 필요 (별도 dev spec) |

---

## 10. 마일스톤 / 구현 단계

> Phase 4 (developer) 가 이 순서로 진행. 각 마일스톤이 독립적으로 빌드/타입체크 통과 가능.

### M1 — 데이터 모델 + 신규 경쟁사 데이터 (2일)

**산출:**
- `src/data/competitors/types.ts` 확장
- `src/data/competitors/index.ts` 자동 export 도입
- 신규 7개 경쟁사 데이터 파일 작성 (xray, practitest, testpad, kiwi-tcms, testmonitor, browserstack-tm, testiny)
- 기존 3개 데이터 (testrail/zephyr/qase) 에 `alternativePageData`, `migrationGuide`, `lastReviewed` 채움
- 데이터 소스: `docs/research/competitor-*.md` 의 §3 Differentiation + §5 Copy Hooks

**AC (M1 종료 시점):**
- [ ] `npm run typecheck` 통과
- [ ] `npm run build` 가 type-error 없이 통과 (sitemap/prerender 변경 없으므로 기존 ROUTES 만 빌드됨)
- [ ] 10개 슬러그 모두 `COMPETITORS` 맵에서 조회 가능 (단위 테스트 또는 페이지 임시 접근 검증)
- [ ] 카피 문구가 페이지별 고유 (`alternativePageData.h1`, `introBody` 5-gram 중복 30% 이하)

**의존성:** 없음. 마케터 카피 작성과 병렬 가능 (마케터가 docs/marketing/copy-* 에 영문 카피 미리 작성하면 개발자는 그대로 데이터 파일에 옮김).

---

### M2 — `/alternatives/:competitor` 라우트 + 페이지 (2일)

**산출:**
- `src/pages/alternatives/page.tsx` 신규
- `src/pages/alternatives/index.tsx` 신규
- `src/router/config.tsx` 에 2개 라우트 추가
- 페이지 구조 (디자인 명세 참조 필수):
  1. Hero (alternativePageData.h1 + subhead + 가격 비교 callout)
  2. Why Leave 섹션 (whyLeave 배열)
  3. Why Switch 섹션 (whySwitch 배열)
  4. Feature Comparison 표 (기존 features 재사용)
  5. Pricing Comparison 표 (기존 pricingRows 재사용)
  6. Migration Guide (migrationGuide.steps)
  7. FAQ (alternativePageData.faqs ?? data.faqs)
  8. CTA

**AC (M2 종료 시점):**
- [ ] `/alternatives` 인덱스에 10개 카드 노출
- [ ] `/alternatives/testrail` 등 10개 URL이 dev 서버에서 200 OK
- [ ] 각 페이지에 H1/canonical/JSON-LD 가 슬러그별로 다름
- [ ] `/alternatives/unknown` 은 NotFound
- [ ] alternativePageData 가 없는 슬러그는 NotFound (graceful 차단)

**의존성:** M1 완료. 디자인 명세 (Phase 3) Approved 필요.

---

### M3 — vs-매트릭스 15개 페이지 (3일)

**산출:**
- `src/data/vs-matrix/index.ts` + 15개 데이터 파일
- `src/pages/compare/vs-matrix.tsx` (또는 `src/pages/compare/page.tsx` 내부 분기)
- `/compare/:competitor` 슬러그에 `-vs-` 포함 시 분기 로직
- 잘못된 정렬 URL 301 redirect
- 페이지 구조 (디자인 명세 참조):
  1. Hero (vsMatrixData.h1: "TestRail vs Zephyr in 2026 — and why teams pick Testably instead")
  2. 3-way Feature Matrix
  3. 3-way Pricing Matrix
  4. "Both have limitations" (bothLimitations)
  5. "Why Testably wins" (testablyWins)
  6. FAQ
  7. CTA

**AC (M3 종료 시점):**
- [ ] 15개 슬러그 URL 모두 200 OK
- [ ] 잘못 정렬된 URL (`/compare/zephyr-vs-testrail`) 이 301 redirect
- [ ] 모든 페이지의 H1/canonical 고유
- [ ] 3-way 비교 표가 정확히 3개 컬럼 (Testably, A, B) 노출
- [ ] Lighthouse SEO 점수 90+ (무작위 3개 페이지)

**의존성:** M1 완료.

---

### M4 — 블로그 11편 (3~4일)

**산출:**
- `src/pages/blog/<slug>/page.tsx` × 11
- `src/pages/blog/posts.ts` 의 BLOG_POSTS 에 11개 추가
- `src/router/config.tsx` 에 11개 라우트 추가
- 각 페이지 최소 1,500 단어 (마케터가 카피 제공)
- 기존 `choosing-test-management-tool` 패턴 따라 BlogPosting JSON-LD 포함

**AC (M4 종료 시점):**
- [ ] 11편 URL 모두 200 OK
- [ ] `/blog` 인덱스에서 11편이 publishDate 기준으로 정렬되어 노출
- [ ] 각 페이지에 BlogPosting JSON-LD 존재
- [ ] 모든 블로그가 publish date 가 `2026-05-XX` 로 sitemap lastmod 와 일치

**의존성:** 마케터 카피 11편 완료. M1~M3 와 병렬 가능.

---

### M5 — sitemap 자동화 + prerender 통합 + 빌드 검증 (2일)

**산출:**
- `scripts/seo-routes-scanner.mjs` — 공통 라우트 scan 유틸
- `scripts/generate-sitemap.mjs` — sitemap.xml 자동 생성
- `scripts/prerender.mjs` — ROUTES 하드코딩 제거, scanner 호출
- `package.json` 에 `prebuild` 스크립트 추가
- `public/sitemap.xml` — 빌드 결과로 자동 생성

**AC (M5 종료 시점):**
- [ ] `npm run build` 가 sitemap.xml 을 자동 생성 (현재 신규 페이지 45개 포함, 기존 정적 라우트 모두 포함 → 총 ~90 URL)
- [ ] prerender 가 신규 페이지 모두를 HTML 로 출력 (`dist/alternatives/testrail/index.html` 등 존재)
- [ ] 빌드 시간 120초 이내
- [ ] sitemap.xml 의 모든 URL 이 실제 page (dist/.../index.html) 존재
- [ ] 모든 prerendered HTML 의 canonical 이 `https://testably.app/...` 절대 URL
- [ ] 신규 페이지의 pageerror 0건 (prerender 로그)
- [ ] 잘못된 vs-매트릭스 슬러그 파일 (예: `testrail-vs-foo.ts` where foo 미등록 또는 정렬 위반) 시 빌드 실패

**의존성:** M1~M4 완료.

---

### M6 — QA 핸드오프 (1일)

**산출:** Phase 5 (@qa) 가 수행. 본 dev spec 범위는 M1~M5 의 개발 완료.

---

## 11. 빌드 / 운영 임팩트

| 항목 | 현재 | 예상 (45개 추가 후) |
|------|------|---------------------|
| ROUTES 개수 (prerender) | 46 | ≈91 |
| prerender 빌드 시간 | ~25s | ~50~60s |
| `npm run build` 전체 시간 | ~40s | ~75~95s |
| Vercel 빌드 timeout (기본 45분) | 충분 | 충분 |
| dist/ 크기 (prerender HTML) | ~3MB | ~7MB |
| Vercel deployment 부담 | 정상 | 정상 (정적 파일 추가만) |
| 운영자 새 경쟁사 추가 부담 | 5개 파일 (data + router + ROUTES + sitemap + index 카드) | 1~2개 파일 (data + index 카드 — 라우터/sitemap/prerender 자동) |

---

## 12. 리스크 + 완화

| 리스크 | 영향도 | 완화 |
|--------|--------|------|
| 콘텐츠 중복으로 SEO 패널티 | High | 각 페이지 H1/intro/marketing 카피 60%+ 고유. 비교 표 자체는 공통이어도 surrounding paragraph 차별화. (옵션) 5-gram check 빌드 가드 |
| 비교 광고 법적 클레임 | Medium | 모든 가격/기능 정보에 "as of 2026-05" 표기. 출처 footer (각 경쟁사 공식 페이지 링크). 거짓/과장 표현 금지 — 리서치 문서의 사실 인용만 |
| 빌드 시간 증가로 Vercel timeout | Low | 현재 25s → 60s 예상. 45분 limit 대비 여유. 만약 timeout 위험 시 prerender 페이지 단위 concurrency 도입 (puppeteer page 풀) |
| 운영 부담 (ROUTES + sitemap 동기화) | High | M5 의 자동화로 해결. single source of truth (파일 시스템 scan + STATIC_ROUTES) |
| 잘못된 슬러그가 sitemap에 포함되어 404 응답 | Medium | NotFound 페이지가 SPA fallback 으로 200 응답 → Vercel rewrite 에서 404 처리 별도 필요 (별도 spec 으로 분리 가능) |
| 디자인 명세 미완성 상태에서 개발 시작 | Medium | M2/M3 는 디자인 명세 Approved 필요. M1/M4(데이터+블로그)는 디자인 없어도 가능 — 병렬 진행 |
| 카피 11편 작성 지연 (마케터 의존) | Medium | M4 가 카피 의존. 마케터 5/16~22 작업 일정과 sync. 카피 4편씩 batch 전달 → 개발자 incremental merge |
| Google 가짜 평점 패널티 (JSON-LD aggregateRating) | Low | 실제 리뷰 누적 전까지 `aggregateRating` 필드 제외 (8-2 참조) |

---

## 13. Out of Scope (이번에 안 하는 것)

- [ ] **i18n (한국어 버전)** — 영어 페이지만. Phase 6 launch 후 시장 신호 보고 결정
- [ ] **Admin CMS for competitor data** — 코드 내 정적 데이터 유지. 향후 별도 spec
- [ ] **광고 / 메타 광고 카피** — SEO 콘텐츠만
- [ ] **자동 마이그레이션 도구** — CSV import 외 별도 트랙
- [ ] **NotFound 페이지의 404 상태 코드 반환 처리** — Vercel rewrite 변경 필요. 본 작업에서는 SPA fallback 200 유지 (별도 spec)
- [ ] **콘텐츠 중복 검증 자동화 (5-gram check)** — 권장 사항이지만 필수 아님. QA 단계에서 수동 검증으로 갈음 가능
- [ ] **G2 / Capterra 리뷰 임베드** — 별도 spec
- [ ] **A/B 테스트 인프라** — 카피 변형 테스트는 추후
- [ ] **Lighthouse CI 가드** — QA 단계에서 수동 측정. 자동 게이트는 추후
- [ ] **블로그 RSS feed 업데이트** — 기존 RSS 가 없으므로 N/A. 추후 도입 시 별도 spec

---

## 14. i18n 키

본 작업은 **영어 전용 마케팅 페이지** 이므로 `locales/en.json` / `locales/ko.json` 변경 **없음**.

페이지 내 모든 텍스트는 데이터 파일 (`src/data/competitors/*.ts`, `src/data/vs-matrix/*.ts`) 또는 페이지 컴포넌트 내 영문 하드코딩.

향후 i18n 도입 시 별도 spec.

---

## 15. 의존성 / 외부 자산

- 카피 (Phase 4 마케터 산출):
  - `docs/marketing/alternative-copy-{slug}.md` × 10 (M2 입력)
  - `docs/marketing/vs-matrix-copy-{a}-vs-{b}.md` × 15 (M3 입력)
  - `docs/marketing/blog-copy-{slug}-alternatives-2026.md` × 10 (M4 입력)
  - `docs/marketing/blog-copy-best-test-management-tools-2026.md` × 1 (M4 입력)
- 디자인 명세 (Phase 3 산출): `docs/specs/design-spec-seo-competitor-pages.md` (M2, M3 입력)
- 리서치 (Phase 1 산출, 이미 완료): `docs/research/competitor-*.md` × 10 (M1 입력)

---

## 16. 검증 / 출시 체크리스트

> Phase 5 (@qa) 가 본 spec 의 AC 와 대조하여 수행.

- [ ] 모든 AC-1 ~ AC-19 통과
- [ ] `npm run typecheck` 무에러
- [ ] `npm run lint` 무에러
- [ ] `npm run build` 통과 + 빌드 시간 120초 이내
- [ ] dist/ 의 신규 페이지 45개 모두 존재 + canonical absolute URL
- [ ] sitemap.xml 에 91 URL 포함, XML schema validation 통과
- [ ] Lighthouse SEO 점수 90+ (무작위 5개 페이지)
- [ ] Lighthouse Accessibility 90+ (alt text, semantic HTML)
- [ ] 모바일 반응형 검증 (375 / 768 / 1280 width)
- [ ] 콘텐츠 출처 footer 모든 신규 페이지에 노출
- [ ] Google Search Console 사이트맵 제출 준비 (Phase 6)

---

## 개발 착수 전 체크리스트

> 아래 항목을 모두 통과해야 Phase 4 (개발) M1 시작

- [x] 수용 기준이 전부 테스트 가능한 문장인가 (AC-1~AC-19)
- [x] 데이터 모델 / 타입 확장 명시되었는가 (Section 5)
- [x] 라우팅 패턴 명세 (Section 4-1)
- [x] 라우트 단일 소스 정의 (Section 5-3, 6-1)
- [x] 마일스톤 분할 + 의존성 명시 (Section 10)
- [x] 변경 파일 목록이 실제 경로로 구체적인가 (Section 7)
- [x] 엣지 케이스가 식별되었는가 (Section 9)
- [x] Out of Scope 명시 (Section 13)
- [x] 리스크 + 완화 (Section 12)
- [ ] 디자인 명세 (Phase 3) Approved 상태인가 — M2/M3 시작 전 필요
- [ ] 마케터 카피 11편 + 25개 페이지 카피 준비 — M4 시작 전 필요

---

## 부록 A — 15개 vs-매트릭스 슬러그 (확정 리스트)

상위 6개 경쟁사: `practitest`, `qase`, `testpad`, `testrail`, `xray`, `zephyr` (알파벳 오름차순).

C(6,2) = 15 조합 모두 알파벳 오름차순으로 슬러그화:

| # | 슬러그 | URL |
|---|--------|-----|
| 1 | `practitest-vs-qase` | `/compare/practitest-vs-qase` |
| 2 | `practitest-vs-testpad` | `/compare/practitest-vs-testpad` |
| 3 | `practitest-vs-testrail` | `/compare/practitest-vs-testrail` |
| 4 | `practitest-vs-xray` | `/compare/practitest-vs-xray` |
| 5 | `practitest-vs-zephyr` | `/compare/practitest-vs-zephyr` |
| 6 | `qase-vs-testpad` | `/compare/qase-vs-testpad` |
| 7 | `qase-vs-testrail` | `/compare/qase-vs-testrail` |
| 8 | `qase-vs-xray` | `/compare/qase-vs-xray` |
| 9 | `qase-vs-zephyr` | `/compare/qase-vs-zephyr` |
| 10 | `testpad-vs-testrail` | `/compare/testpad-vs-testrail` |
| 11 | `testpad-vs-xray` | `/compare/testpad-vs-xray` |
| 12 | `testpad-vs-zephyr` | `/compare/testpad-vs-zephyr` |
| 13 | `testrail-vs-xray` | `/compare/testrail-vs-xray` |
| 14 | `testrail-vs-zephyr` | `/compare/testrail-vs-zephyr` |
| 15 | `xray-vs-zephyr` | `/compare/xray-vs-zephyr` |

## 부록 B — 11편 블로그 슬러그 (확정 리스트)

| # | 슬러그 | URL | 타깃 키워드 |
|---|--------|-----|------------|
| 1 | `testrail-alternatives-2026` | `/blog/testrail-alternatives-2026` | best testrail alternatives 2026 |
| 2 | `zephyr-alternatives-2026` | `/blog/zephyr-alternatives-2026` | best zephyr alternatives 2026 |
| 3 | `qase-alternatives-2026` | `/blog/qase-alternatives-2026` | best qase alternatives 2026 |
| 4 | `xray-alternatives-2026` | `/blog/xray-alternatives-2026` | best xray alternatives 2026 |
| 5 | `practitest-alternatives-2026` | `/blog/practitest-alternatives-2026` | best practitest alternatives 2026 |
| 6 | `testpad-alternatives-2026` | `/blog/testpad-alternatives-2026` | best testpad alternatives 2026 |
| 7 | `kiwi-tcms-alternatives-2026` | `/blog/kiwi-tcms-alternatives-2026` | open source test management alternative |
| 8 | `testmonitor-alternatives-2026` | `/blog/testmonitor-alternatives-2026` | testmonitor alternative |
| 9 | `browserstack-tm-alternatives-2026` | `/blog/browserstack-tm-alternatives-2026` | browserstack test management alternative |
| 10 | `testiny-alternatives-2026` | `/blog/testiny-alternatives-2026` | testiny alternative |
| 11 | `best-test-management-tools-2026` | `/blog/best-test-management-tools-2026` | best test management tool 2026 |

---

**문서 끝.**
