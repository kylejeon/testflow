# SEO 경쟁사 커버리지 전략 — 풀 파이프라인 브리핑 (Option C)

> **상태:** Phase 1 (researcher) 착수 대기 — 2026-05-12 아침 시작 예정
> **결정 일자:** 2026-05-10 (CEO 결정)
> **착수 사유:** 구글 검색에서 경쟁사 키워드(예: "testrail alternative")로 들어오는 유입을 확보하기 위함
> **현 상태:** `/compare/{testrail,zephyr,qase}` 3개 페이지 + `choosing-test-management-tool` 블로그 1편 운영 중. SEO 키워드 커버리지 매우 빈약.

---

## 1. 스코프 결정 사항

### 1.1 경쟁사 10개 (우선순위 순)

| # | 경쟁사 | 슬러그 | 우선순위 사유 | 기존 데이터 |
|---|---|---|---|---|
| 1 | TestRail | `testrail` | 검색량 최대 (1.5K~3K/mo "testrail alternative") | ✅ 있음 |
| 2 | Zephyr (Squad/Scale) | `zephyr` | Atlassian 생태계, 500~1K/mo | ✅ 있음 |
| 3 | Qase | `qase` | 모던 SaaS 직접 경쟁자 | ✅ 있음 |
| 4 | Xray | `xray` | Jira 마켓 1위 test management 앱 | ❌ 신규 |
| 5 | PractiTest | `practitest` | Enterprise QA 시장 | ❌ 신규 |
| 6 | TestPad | `testpad` | 가벼운 SMB 시장 | ❌ 신규 |
| 7 | Kiwi TCMS | `kiwi-tcms` | 오픈소스 대안 검색자 | ❌ 신규 |
| 8 | TestMonitor | `testmonitor` | 유럽 중심 사용자 | ❌ 신규 |
| 9 | BrowserStack Test Management | `browserstack-tm` | 브라우저 테스트와 통합 검색 | ❌ 신규 |
| 10 | Testiny | `testiny` | 신규 부상 SaaS | ❌ 신규 |

### 1.2 페이지 산출 (목표 ~45 페이지)

| 패턴 | URL | 키워드 타겟 | 개수 |
|---|---|---|---|
| 기존 비교 페이지 | `/compare/{slug}` | "testably vs X" | 10개 |
| Alternative 페이지 | `/alternatives/{slug}` | "X alternative" | 10개 |
| 경쟁사간 vs-매트릭스 (상위 6개만) | `/compare/{a}-vs-{b}` | "X vs Y" | C(6,2)=15개 |
| 블로그 — 경쟁사당 1편 | `/blog/{slug}-alternatives-2026` | "best X alternatives" | 10편 |
| 블로그 — 종합 랭킹 1편 | `/blog/best-test-management-tools-2026` | "best test management tool" | 1편 |

### 1.3 NOT in scope
- 한국어 버전 (i18n) — 일단 영어만. 시장 신호 본 후 결정
- 광고 카피/메타 광고 변환 — SEO 콘텐츠만
- 자동 마이그레이션 도구 (CSV import 외) — 별도 트랙

---

## 2. 파이프라인 계획

### Phase 1 — Researcher (5/12 ~ 5/13, 2일)
**산출물:** `docs/research/competitor-{slug}.md` × 10개 + `docs/research/seo-keyword-map.md`

각 경쟁사당 조사 항목:
1. **공식 정보** — 가격(플랜별), 주요 기능, 무료 플랜 여부, 트라이얼, API/CI 지원
2. **사용자 불만 신호** — Reddit/G2/Trustradius 리뷰에서 자주 등장하는 단점 5개
3. **Testably 우위 포지셔닝** — 우리가 명확히 우월한 3가지 (가격/AI/UX/기능 중에서)
4. **핵심 키워드** — 각 경쟁사별 검색량 추정 키워드 5~10개 (alternative, vs, pricing, free, review 패턴)
5. **차별화 메시지 후보** — 카피 작성용 hook 3개

**참고할 기존 자산:**
- 기존 testrail/zephyr/qase 데이터 ([src/data/competitors/](../../src/data/competitors/)) — 업데이트 대상
- `choosing-test-management-tool` 블로그 — 톤/접근법 참조

### Phase 2 — Planner (5/14, 1일)
**산출물:** `docs/specs/dev-spec-seo-competitor-pages.md`

- URL 라우팅 패턴 명세 (router/config.tsx 변경 사항)
- 데이터 모델 확장 (`src/data/competitors/types.ts` 의 신규 필드: alternativePagePositioning, vsMatrixPairs 등)
- 페이지 컴포넌트 재사용 vs 신규 분기 결정
- SEO 메타 패턴 표준화 (canonical, og:url, structured data Product/SoftwareApplication 스키마)
- sitemap.xml 자동 생성 정책

### Phase 3 — Designer (5/14 ~ 5/15, 2일)
**산출물:** `docs/specs/design-spec-seo-competitor-pages.md`

- `/alternatives/{slug}` 페이지 레이아웃 (히어로 + 비교 표 + 마이그레이션 가이드 + FAQ)
- vs-매트릭스 페이지 레이아웃 (TestRail vs Zephyr 등 — 우리가 권장 대안으로 등장하는 톤)
- 블로그 포스트 템플릿 (랭킹 형식, 비교 카드, CTA 위치)
- 컴포넌트 재사용 가이드 (기존 `/compare/:competitor` 페이지 vs 신규 패턴)

### Phase 4 — Marketer + Developer (5/16 ~ 5/22, 1주)
**병렬 진행 가능:**
- **Marketer:** 11편 블로그 카피 작성 + 각 페이지별 메타 카피 + FAQ 카피
- **Developer:** 데이터 모듈 7개(신규 경쟁사) + 라우팅 + 페이지 컴포넌트 + sitemap

병렬 가능 근거: marketer 는 `docs/marketing/` 만 만지고, developer 는 `src/` + `src/data/` 를 만짐. 파일 충돌 없음.

### Phase 5 — QA (5/23, 1일)
- 라우팅 / 빌드 / 타입체크
- SEO 메타 정합성 체크 (canonical, og, schema)
- sitemap.xml 검증 (Google Search Console 제출 형식)
- 모든 내부 링크 200 응답 확인
- 모바일 반응형 + Lighthouse SEO 점수 90+

### Phase 6 — Marketer (5/24 ~ , 발사)
- Google Search Console 사이트맵 제출
- 일부 핵심 페이지에 대해 indexing API 직접 요청
- 4주 후 검색 순위 모니터링 첫 리포트

**총 예상 기간: 12~14일 (5/12 ~ 5/24)**

---

## 3. 5/12 researcher 착수 시 즉시 입력할 프롬프트 (드래프트)

```
@researcher

Phase 1 — 경쟁사 풀-커버리지 조사 (10개 경쟁사)

배경: docs/research/seo-competitor-strategy-brief.md 의 §1 / §2.Phase 1 참조

작업:
1. 10개 경쟁사 각각에 대해 docs/research/competitor-{slug}.md 작성
2. 종합 키워드 맵 docs/research/seo-keyword-map.md 작성

각 경쟁사 문서 섹션:
- ## 1. Product Snapshot (가격/플랜/기능)
- ## 2. User Pain Points (리뷰 분석 5개)
- ## 3. Testably Differentiation (우리 우위 3개)
- ## 4. Target Keywords (5~10개, 검색량 추정 포함)
- ## 5. Copy Hooks (3개)

기존 자산 (testrail/zephyr/qase) 는 src/data/competitors/ 의 정보를 베이스로
추가 리서치하여 보강. 신규 7개는 0부터 작성.

WebFetch + WebSearch 적극 활용. G2/Trustradius/Reddit 리뷰 우선.
```

---

## 4. 리스크 + 완화

| 리스크 | 완화책 |
|---|---|
| 페이지 45개의 콘텐츠 중복으로 SEO 패널티 | 각 페이지 H1/메타/intro 60% 이상 고유 카피, 비교 표는 공통이지만 surrounding 콘텐츠 차별화 |
| 경쟁사로부터 법적 클레임 (비교 광고 규제) | 모든 비교 데이터는 공식 페이지/공개 가격 기준으로만, 출처 표기 필수, "as of 2026-05" 기준 명시 |
| 라우터 매시브 추가로 빌드 시간 증가 | lazy-load 유지, manualChunks 검토 (이미 큰 청크 경고 있음) |
| sitemap.xml 동적 생성 vs 정적 | 정적 권장 (Vercel/Netlify 배포 단순). 빌드 타임에 src/data/competitors 순회로 생성 |
| 기존 /compare/* 라우트와 충돌 | 기존 데이터 모듈 확장하여 backward compatible 유지. 기존 URL 깨지면 안 됨 |

---

## 5. 트래킹

진행 상황은 `progress.txt` 와 본 문서의 §2 Phase 체크박스로 트래킹.

- [ ] Phase 1 — Researcher (5/12 ~ 5/13)
- [ ] Phase 2 — Planner (5/14)
- [ ] Phase 3 — Designer (5/14 ~ 5/15)
- [ ] Phase 4 — Marketer + Developer 병렬 (5/16 ~ 5/22)
- [ ] Phase 5 — QA (5/23)
- [ ] Phase 6 — Launch / Search Console 제출 (5/24)

---

## 6. 참고

- 기존 `/compare/:competitor` 페이지: [src/pages/compare/page.tsx](../../src/pages/compare/page.tsx)
- 기존 경쟁사 데이터: [src/data/competitors/](../../src/data/competitors/)
- 기존 블로그 종합글: [src/pages/blog/choosing-test-management-tool/](../../src/pages/blog/choosing-test-management-tool/)
- 블로그 메타 모듈: [src/pages/blog/posts.ts](../../src/pages/blog/posts.ts)
- 라우터 설정: [src/router/config.tsx](../../src/router/config.tsx)
