# Design Spec: i18n 커버리지 — 카피 가이드라인 (1차: Milestone Overview + Issues + AIRunSummaryPanel 레이블)

> **작성일:** 2026-04-21
> **작성자:** @designer
> **상태:** Draft → Review → Approved
> **관련 개발지시서:** `docs/specs/dev-spec-i18n-coverage.md`
> **Figma 링크:** N/A (레이아웃 무변경, 카피만 교체)

---

## 0. 이 문서의 목적과 읽는 법

이 문서는 **새 UI 디자인이 아닙니다**. 이미 확정된 20개 파일(dev-spec §4-1 A)의 하드코딩 영문을 i18next 번들로 옮기고 한국어를 추가할 때 **Developer가 옆에 띄워놓고 복사-붙여넣기 할 수 있는 치팅시트**입니다.

**Developer 워크플로우:**
1. `§2 톤앤매너 원칙`으로 문체 감 잡기 → `§3 고유명사 표` 외우기 → `§4 표기 규칙` 숙지
2. 파일별 치팅시트 (§7.1 ~ §7.20) 를 펼쳐, **EN 컬럼 그대로 `src/i18n/local/en/<ns>.ts` 에 붙여넣고 KO 컬럼은 `src/i18n/local/ko/<ns>.ts` 에 붙여넣기**
3. 소스 파일에서 하드코딩 영문을 `t('키')` 로 치환
4. `npm run scan:i18n` → `npm run scan:i18n:parity` 로 누락 확인
5. 애매한 한국어 선택은 §8 "판단 트리" 참고

---

## 1. 레이아웃

**레이아웃 변경 없음.** 이번 Dev Spec은 순수 텍스트 교체 리팩토링이며, 모든 DOM 구조·여백·폰트 사이즈·color token·반응형 중단점은 **기존 v3 Milestone Overview 레이아웃과 동일하게 유지**한다.

다만 한국어 텍스트 전환 시 자연스럽게 늘어나는 **텍스트 길이 변화가 기존 레이아웃을 깨지 않는지** 확인해야 할 체크포인트가 존재한다 (아래 §1-1).

### 1-1. 텍스트 길이 리스크 체크포인트

| 위치 | EN 기준 | KO 예상 | 변동 | 완화 |
|------|--------|---------|-----|-----|
| KPI 카드 label (`Pass Rate`) | 9 char | `통과율` 3 char | 단축 | OK |
| KPI 카드 label (`Velocity`) | 8 char | `속도` 2 char | 단축 | OK |
| KPI 카드 sub (`TCs / day`) | 9 char | `TC / 일` 7 char | 동급 | OK |
| KPI 카드 sub (`of {n}`) | `of 125` | `125 중` | 동급 | OK |
| ETA sub (`on track · {days}d proj`) | ~22 char | `정상 · {days}일 예상` ~13 char | 단축 | OK |
| Burndown 범례 (`Projected`) | 9 char | `예상` 2 char | 단축 | OK |
| AI CTA (`Analyze with AI →`) | 16 char | `AI로 분석하기 →` 9 char | 단축 | OK |
| Velocity sub (`no executions`) | 13 char | `실행 없음` 5 char | 단축 | OK |
| Risk pill (`On track`) | 8 char | `정상 진행` 4 char | 비슷 | OK |
| FailedBlocked empty (`No failed or blocked TCs 🎉`) | 25 char | `실패·차단된 TC 없음 🎉` 13 char | 단축 | OK |
| Activity24h strip b 태그 (`Someone`) | 7 char | `누군가` 3 char | 단축 | OK |
| IssuesList KPI (`Total Issues`) | 12 char | `전체 이슈` 5 char | 단축 | OK |
| Run Badge (`Milestone-direct`) | 16 char | `마일스톤 직접` 7 char | 단축 | OK |
| Plan label (`Plan: (deleted)`) | 15 char | `플랜: (삭제됨)` 9 char | 비슷 | OK |
| Toast (`Monthly AI credits exhausted (10/10).`) | 37 char | `월 AI 크레딧 소진 (10/10)` 18 char | 단축 | OK |

> **결론:** 한국어는 일반적으로 영문 대비 **30~50% 짧음**. 레이아웃 오버플로 리스크는 없음. 예외: 일부 에러 토스트에서 "잠시 후 다시 시도해 주세요"처럼 정중한 표현을 쓰면 영문과 길이가 유사해짐 — 모바일 (< 768px) 에서 2줄 wrap 되더라도 현재 sonner 토스트 박스가 자동 wrap 지원하므로 안전.

---

## 2. KO vs EN 톤앤매너 원칙

### 2-1. 기본 원칙

| 축 | EN | KO |
|----|----|----|
| 문체 | **Imperative mood** (명령형). "View details", "Retry", "Refresh now" | **존댓말** ("~합니다 / ~하세요 / ~해 주세요"). 반말·은어 금지 |
| 간결성 | 3~5 단어 이내 버튼·레이블. 관사 (a/the) 생략 가능 | 조사는 필수 유지. "통과 {{count}}" 같은 단답형 OK |
| 대상 | **QA 엔지니어 / 개발자** — 도메인 전문용어 그대로 사용 (burndown, retest, run, plan) | 동일. 전문용어는 **번역보다 원어 유지** 우선 — 예: "Burndown" → "번다운" (음역), "Velocity" → "속도" 또는 "벨로시티" 중 선택 시 이미 기존 번들 `detail.overview.burndown='번다운'` 이 있으므로 따른다. |
| 이모지 | 현재 코드에 박힌 것 (🎉, ⚠️, ✅, ❌) 만 유지. **신규 이모지 추가 금지** | 동일 |
| 느낌표 | 축하 메시지 ("No failed or blocked TCs 🎉")에만 허용 | 동일. 가급적 마침표로 차분하게 |
| 물음표 | 설정/확인 다이얼로그 ("Are you sure?") 에만 | 동일 |

### 2-2. 문장 종결 컨벤션 (KO)

| 컨텍스트 | 종결 | 예시 |
|---------|------|------|
| 정보성 레이블 (label) | 무조건어 | `전체 이슈`, `통과율`, `속도` |
| 상태 뱃지 / 배지 | 명사 또는 `~됨` / `~중` | `통과`, `실패`, `차단됨`, `진행 중`, `완료` |
| 버튼 / CTA | `~하기` or 명사 | `AI로 분석하기`, `지금 새로고침`, `재시도`, `모두 보기 →` |
| Empty state 1줄 설명 | `~합니다` 또는 `~없음` | `연결된 이슈가 없습니다.`, `최근 24시간 활동 없음` |
| Empty state 힌트 (2줄째) | `~하세요` / `~해 주세요` | `실패한 테스트 결과에 Jira 또는 GitHub 이슈를 연결하면 여기에 표시됩니다.` |
| 토스트 success | `~되었습니다` / `~완료` | `이슈 {{count}}건 동기화됨`, `분석이 갱신되었습니다` |
| 토스트 error | `~에 실패했습니다` / `~해 주세요` | `이슈 새로고침에 실패했습니다. 잠시 후 다시 시도해 주세요.` |
| 에러 배너 (중대) | `~해 주세요` / `~가 필요합니다` | `관리자에게 AI 분석 실행을 요청하세요.` |
| 제한 안내 (limit banner) | `~이 필요합니다 / ~해 주세요` | `AI 분석을 사용하려면 Hobby 플랜으로 업그레이드하세요.` |

### 2-3. 문장 종결 컨벤션 (EN)

| 컨텍스트 | 형태 | 예시 |
|---------|------|------|
| 정보성 레이블 | Noun phrase | `Total Issues`, `Pass Rate`, `Velocity` |
| 상태 뱃지 | Past participle / present participle | `Passed`, `Failed`, `Blocked`, `In Progress`, `Completed` |
| 버튼 / CTA | **Imperative verb** | `Analyze with AI`, `Refresh now`, `Retry`, `View all →` |
| Empty state 1줄 | Short declarative | `No issues linked yet.`, `No activity in the last 24 hours` |
| Empty state 힌트 | Declarative/instruction | `Issues appear here once you link Jira or GitHub issues from failed test results.` |
| 토스트 success | Past tense / past participle | `Synced {{count}} issues`, `Analysis refreshed` |
| 토스트 error | `Failed to X` / imperative | `Failed to refresh issues. Retry later.` |
| 에러 배너 | `Please X` / imperative | `Ask your admin to run AI analysis.` |
| 제한 안내 | `Upgrade to X` / imperative | `Upgrade to Hobby to unlock AI analysis.` |

### 2-4. 피해야 할 표현

| ❌ 지양 | ✅ 선호 | 이유 |
|--------|--------|-----|
| KO: "오류났어요" | "오류가 발생했습니다" | 반말 금지 |
| KO: "리프레시" (외래어 남용) | "새로고침" | 한국어 UX 표준 (iOS/Android/macOS) |
| KO: "로딩중..." | "불러오는 중…" | "로딩"은 음역. "불러오는 중"이 kor-natural |
| KO: "유저" | "사용자" | 서비스 전반 톤과 정렬 |
| KO: "삭제됐어요" | "삭제되었습니다" | 공식체 유지 |
| KO: "?" | "하시겠습니까?" or "하시겠어요?" | 존댓말 유지 |
| EN: "Deletion complete" | "Deleted successfully" | imperative/past-simple 선호 |
| EN: "You have no issues" | "No issues yet." | 관사 생략, 간결 |
| EN: "The analysis is ready for you now" | "Analysis ready" | QA tool tone |
| EN: "Sorry, we couldn't load the plans." | "Failed to load plans." | Engineer 대상, 직설적 |

---

## 3. 고유명사 처리 (번역 금지 / 고정 번역)

### 3-1. 브랜드명 (절대 번역 금지 — EN·KO 동일)

| 용어 | 근거 |
|------|-----|
| `Testably` | 자사 브랜드 |
| `Jira` | Atlassian 공식 |
| `GitHub` | 소유자 대소문자 고정 |
| `Claude` | Anthropic 공식 |
| `Slack` | 공식 |
| `Paddle`, `LemonSqueezy`, `Stripe` | 결제 브랜드 |
| `Supabase` | 인프라 |
| `Recharts`, `TipTap`, `Sonner` | 의존성 라이브러리 (일반적으로 UI 미노출) |

> 이 값들이 JSX 안에 그대로 있어도 `scan:i18n` 가 `.i18nignore` 로 통과시킴 (dev-spec §4-5).

### 3-2. 도메인 용어 — EN/KO 고정 번역 (한번 확정된 용어는 서비스 전역에서 재사용)

| EN | KO 확정 번역 | 대체 후보(NG) | 사용 위치 |
|----|-------------|--------------|---------|
| **Milestone** | `마일스톤` | ~~이정표~~ | 기존 번들 확정 |
| **Sub Milestone** | `하위 마일스톤` | ~~서브 마일스톤~~, ~~Sub 마일스톤~~ (기존 `milestones.subMilestones:'Sub 마일스톤'` 은 **레거시, 이번 기회에 통일 권장하되 리그레션 리스크로 유지**. **신규 키 `detail.overview.sections.subMilestones` 는 이미 `'하위 마일스톤'`** 이므로 dev-spec 1차 스코프에는 후자만 적용) | ExecutionSections |
| **Test Plan / Plan** | `테스트 플랜` (전체 명칭) / `플랜` (축약) | ~~계획~~ | 전역 |
| **Test Case / TC** | `테스트 케이스` / `TC` (약어 그대로) | ~~시험사례~~ | 전역 |
| **Run** | `실행` (본문) / `런` (기존 `detail.overview.sections.runs='런'` 존재) | — | **주의: 기존 번들이 "런"과 "실행" 혼재.** 이번 스코프 `detail.overview.sections.runs` 는 **기존 값 유지**. 신규 키 (`common.issues.fromRuns_*`) 는 `실행 {{count}}건에서` 로 "실행" 사용 |
| **Burndown** | `번다운` (음역 고정 — 기존 번들 확정) | ~~소진 차트~~ | BurndownChart |
| **Velocity** | `속도` (기존 번들) — 단, "Velocity (last 7 days)" 처럼 기술적 맥락에서는 **"속도"** 유지 | ~~벨로시티~~ | VelocitySparkline, KpiStrip |
| **Pass Rate** | `통과율` | ~~합격률~~ | 전역 |
| **Retest** | `재테스트` (기존) | ~~재시도~~ | Activity24h 의 `retested` 는 문맥상 **`재테스트`**. 단 VA 에러 `Retry` 는 `재시도` — 영문이 다르므로 한국어도 분리 |
| **Exploratory** | `탐색` (기존 `detail.overview.sections.exploratory='탐색'`) / `탐색 세션` (full form) | ~~탐사~~, ~~discovery~~ | ExecutionSections, common nav `sessions='디스커버리 로그'` 는 legacy — 혼선 있으나 이번 스코프 외 |
| **Session** | `세션` | — | — |
| **Issue** (Jira/GitHub) | `이슈` | ~~안건~~ | Issues 클러스터 |
| **Linked TCs** | `연결된 TC` | — | IssuesList KPI |
| **Contributor** | `기여자` | ~~공헌자~~ | ContributorsCard |
| **Activity** | `활동` | — | Activity24h |
| **Top-Fail Tags** | `자주 실패하는 태그` 또는 `실패 상위 태그` — **기존 `intel.topFailTags='실패 상위 태그'` 를 따른다** | ~~Top-Fail 태그~~ | TopFailTagsCard |
| **ETA** | `예상 완료일` (기존) | ~~도착시간~~, ~~ETA~~ 그대로 쓰지 않음 | KpiStrip |
| **On track / At Risk / Critical** (risk pill) | `정상 진행` / `주의` / `심각` (기존 번들 확정) | — | RiskSignalCard |
| **Observations** (AI 섹션 헤더) | `관찰` (기존) | ~~관측사항~~ | AiRiskAnalysisCard |
| **Recommendations** | `권장 조치` (기존) | ~~추천~~, ~~제안사항~~ | AiRiskAnalysisCard |
| **Summary** | `요약` (기존) | — | AiRiskAnalysisCard |
| **Analyze / Analysis** (동사/명사) | `분석하기` / `분석` | — | aiRisk |
| **Refresh** (동사) | `새로고침` | ~~리프레시~~ | 전역 |
| **Regenerate** (AI 재생성) | `재생성` | ~~다시 생성하기~~ | AIRunSummaryPanel |
| **Credit / Credits** (AI quota) | `크레딧` (음역, 기존 번들 확정) | ~~토큰~~ | aiRisk.quotaBanner |
| **Upgrade** (plan) | `업그레이드` | — | 전역 |
| **Empty / Not synced yet** | `없음` / `아직 동기화 안됨` | — | 전역 |
| **Metadata** | `메타데이터` | ~~부가정보~~ | IssuesList |
| **Debounce** 안내 | `잠시 후 다시 새로고침해 주세요` | — | IssuesList |

### 3-3. 혼용 주의 — "Run"

Dev-spec 1차 스코프 내 기존 번들의 불일치:
- `common.runsAndResults: '실행 및 결과'` (네비게이션)
- `detail.overview.sections.runs: '런'` (Overview 섹션 헤더)
- 신규 (본 Dev-spec): `common.issues.fromRuns_*: '실행 {{count}}건에서'`
- 신규 (본 Dev-spec): `milestones.detail.overview.activity.inRun: '{{runName}}에서'` (변수 주입 시 "런" 문자는 노출 안됨)

**원칙:**
- 이번 1차 스코프에서는 **신규 추가 키만 "실행"으로 통일**한다.
- 기존 `sections.runs='런'` 은 **리그레션 리스크로 건드리지 않는다**.
- 3차 스코프(전수 정리) 시점에 `런` → `실행` 으로 일괄 리네임을 제안 (후속 티켓).

---

## 4. 단위 / 시간 / 숫자 표기

### 4-1. 시간 (상대시간)

모든 상대시간 표현은 `formatRelativeTime(iso, t)` 헬퍼(dev-spec §4-4 AC-7)를 통과해야 한다. 직접 문자열 조합 금지.

**키 정의 (common.time.* — 신규):**

```
common.time.justNow
common.time.minutesAgo_one
common.time.minutesAgo_other
common.time.hoursAgo_one
common.time.hoursAgo_other
common.time.daysAgo_one
common.time.daysAgo_other
```

**번역 값 (EN/KO):**

| 키 | EN | KO |
|----|----|----|
| `common.time.justNow` | `just now` | `방금 전` |
| `common.time.minutesAgo_one` | `{{count}}m ago` | `{{count}}분 전` |
| `common.time.minutesAgo_other` | `{{count}}m ago` | `{{count}}분 전` |
| `common.time.hoursAgo_one` | `{{count}}h ago` | `{{count}}시간 전` |
| `common.time.hoursAgo_other` | `{{count}}h ago` | `{{count}}시간 전` |
| `common.time.daysAgo_one` | `{{count}}d ago` | `{{count}}일 전` |
| `common.time.daysAgo_other` | `{{count}}d ago` | `{{count}}일 전` |

> **주의:**
> - 한국어는 단복수 구분이 없으므로 `_one` / `_other` 값이 동일. 그래도 i18next 표준 준수 위해 **두 키 모두 정의**해야 하며, 누락 시 `scan:i18n:parity` 실패.
> - EN 도 "1m ago / 2m ago" 형식으로 `_one`·`_other` 값이 사실상 동일. 하지만 미래에 `"1 minute ago"` 형식으로 바꾸면 `_one` 값만 `"{{count}} minute ago"` 로 교체하면 된다.
> - AiRiskAnalysisCard / Activity24hFeed / LastSyncedLabel 세 곳의 인라인 relativeTime 함수는 **삭제**, 공통 헬퍼로 통합 (dev-spec AC-7).

### 4-2. 절대 날짜

`toLocaleDateString` 호출은 반드시 `src/lib/dateFormat.ts` 의 `formatShortDate(iso)` 헬퍼를 통하여:

| 로케일 | 호출 | 결과 예 |
|--------|------|--------|
| `en` | `new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(d)` | `Apr 21` |
| `ko` | `new Intl.DateTimeFormat('ko-KR', { month: 'short', day: 'numeric' }).format(d)` | `4월 21일` |

> 현재 `Target {{date}}` 키의 값은 EN `Target {{date}}` / KO `목표일 {{date}}` 이며, `{{date}}` 는 `formatShortDate(plan.target_date)` 반환값으로 주입된다. 즉 KO 사용자는 `목표일 4월 21일` 로 렌더된다.

### 4-3. 퍼센트 / 숫자

- 퍼센트: `{{value}}%` (언어 무관 동일 포맷, 공백 없음) — 예: `78%`
- 신뢰도: `Confidence {{value}}%` / `신뢰도 {{value}}%`
- 소수점: 현재 `toFixed(1)` 유지 (Velocity avg). 언어별 포매팅 불필요.
- 천단위 구분자: **이번 스코프 적용 안 함** — dev-spec §9 Out of Scope 명시. 추후 티켓.

### 4-4. 단위

| 단위 | EN | KO |
|------|----|----|
| 개수 (test cases) | `{{n}} TC` / `{{n}} TCs` (plural) | `{{n}}건` (단복수 동일) |
| 개수 (runs) | `{{n}} run` / `{{n}} runs` | `실행 {{n}}건` |
| 개수 (fails) | `of {{n}} fails` | `총 {{n}}건 실패 중` |
| 속도 | `TCs / day` | `TC / 일` |
| 일수 (projection) | `{{days}}d proj` | `{{days}}일 예상` |
| 일수 (gap) | `+{{days}}d gap` | `+{{days}}일 지연` |
| 초 (rate limit) | `{{sec}}s` | `{{sec}}초` |
| 신뢰도 | `confidence {{value}}%` | `신뢰도 {{value}}%` |

---

## 5. Plural / Interpolation 규칙

### 5-1. Plural (i18next `_one` / `_other`)

**반드시 plural 키로 분리해야 하는 경우:**
- EN 에서 `s` 접미사로 명사가 변하는 케이스 — "1 run" vs "3 runs", "1 TC" vs "3 TCs"
- EN 에서 verb 동의가 바뀌는 케이스 — "1 issue was synced" vs "3 issues were synced" (본 스코프에는 없음)

**1차 스코프에서 plural 적용 키 목록:**

| 키 | EN _one | EN _other | KO _one | KO _other |
|----|---------|-----------|---------|-----------|
| `common.issues.fromRuns` | `from {{count}} run` | `from {{count}} runs` | `실행 {{count}}건에서` | `실행 {{count}}건에서` |
| `common.issues.tcsWithLinkedIssues` | `{{count}} TC with linked issues.` | `{{count}} TCs with linked issues.` | `연결된 이슈가 있는 TC {{count}}건.` | `연결된 이슈가 있는 TC {{count}}건.` |
| `common.time.minutesAgo` | `{{count}}m ago` | `{{count}}m ago` | `{{count}}분 전` | `{{count}}분 전` |
| `common.time.hoursAgo` | `{{count}}h ago` | `{{count}}h ago` | `{{count}}시간 전` | `{{count}}시간 전` |
| `common.time.daysAgo` | `{{count}}d ago` | `{{count}}d ago` | `{{count}}일 전` | `{{count}}일 전` |
| `milestones.detail.overview.contributors.countSuffix` | `{{count}} TC` | `{{count}} TCs` | `{{count}}건` | `{{count}}건` |
| `milestones.detail.overview.kpi.passedSuffix` | `{{count}} passed` | `{{count}} passed` | `통과 {{count}}건` | `통과 {{count}}건` |
| `milestones.detail.overview.topFailTags.suffix` | `of {{total}} fail` | `of {{total}} fails` | `총 {{total}}건 실패 중` | `총 {{total}}건 실패 중` |
| `milestones.rollupBadge` (이미 존재, 참고) | `Roll-up · {{n}} sub` | `Roll-up · {{n}} subs` | `롤업 · 하위 {{n}}개` | `롤업 · 하위 {{n}}개` |

**호출 규칙:**

```ts
// ❌ 잘못된 호출 - i18next 가 _one/_other 자동 선택 못 함
t('common:issues.fromRuns_one', { count: n })

// ✅ 올바른 호출 - 베이스 키 사용 (suffix 없음), count 전달
t('common:issues.fromRuns', { count: n })
```

### 5-2. Interpolation 변수 (`{{name}}`)

- 변수명은 **camelCase**, 값의 의미를 한 단어로 (`{{count}}`, `{{days}}`, `{{value}}`, `{{time}}`, `{{runName}}`, `{{priority}}`, `{{key}}`, `{{source}}`).
- **EN/KO 변수명은 동일해야 함** — 한국어에서 `{{개수}}` 같은 번역 금지.
- 공백 주의 — `from {{count}} runs` 에서 `{{count}}` 양쪽 공백은 런타임에 그대로 렌더되므로, KO 는 `실행 {{count}}건에서` 처럼 조사 바로 붙이기.
- **관사/조사 주입은 i18next 가 처리 못 함**. EN 의 `a/an` 같은 관사는 통째로 키에 포함시키고, KO 의 조사 (은/는/이/가) 는 아예 생략하거나 명사 뒤로 뺀다 (`이슈가 {{count}}건 있습니다` 는 `이슈 {{count}}건` 로).

### 5-3. Interpolation 누락 케이스 (유닛 테스트 필수)

```ts
// 누락 시 렌더
t('common:issues.fromRuns', { /* count 생략 */ });
// EN: "from  runs" (공백 2개)
// KO: "실행 건에서"
```

이는 런타임 에러가 아니므로 TypeScript 도 감지 못 함. Dev-spec §8 엣지 케이스에 따라 **코드 리뷰로 차단**. 가능하면 호출부에서 `count: n ?? 0` 로 기본값 보정.

---

## 6. AI 응답 처리 원칙 (AC-9 재확인)

### 6-1. 원칙

**Claude가 생성한 응답 본문은 번역 대상이 아니다.** 프롬프트에 현재 `locale` 힌트를 주입하지 않으므로 Claude 는 항상 영어로 응답한다. KO 사용자도 본문만큼은 영어로 본다. 이는 **버그가 아니라 1차 정책**이며, 다국어 프롬프트는 별도 티켓(`f013`)으로 분리됐다.

### 6-2. 번역 대상 (래핑 레이블만)

| 위치 | 번역 대상 | 번역 비대상 (Claude 응답) |
|------|---------|------------------------|
| `AiRiskAnalysisCard` 헤더 | "AI Risk Analysis" 제목 | — |
| `AiRiskAnalysisCard` 섹션 헤더 | "Summary", "Observations", "Recommendations" | `data.summary`, `data.bullets[i]`, `data.recommendations[i]` 의 **본문 문자열** |
| `AiRiskAnalysisCard` 메타 | "Last analyzed {{time}}", "Refresh", "Low confidence", "(stale)" 접미사 | — |
| `AiRiskAnalysisCard` pill | "Critical", "At Risk", "On track" (risk_level 매핑) | — |
| `AIRunSummaryPanel` 헤더 | "AI Run Summary", "Analyzing…" | — |
| `AIRunSummaryPanel` 섹션 헤더 | "Executive Summary", "Failure Patterns", "Recommendations", "Key Metrics" | `summary.narrative`, `cluster.rootCause`, `summary.recommendations[i]` 본문 |
| `AIRunSummaryPanel` risk 뱃지 | "HIGH RISK" / "MEDIUM RISK" / "LOW RISK" (level + " RISK") | — |
| `AIRunSummaryPanel` go/no-go | "GO" / "NO-GO" / "CONDITIONAL GO" | `summary.goNoGoCondition` 본문 |

### 6-3. 코드 주석 요구사항 (AC-9)

`AiRiskAnalysisCard.tsx` 와 `AIRunSummaryPanel.tsx` 상단에 아래 주석을 반드시 포함:

```ts
/**
 * i18n policy (dev-spec-i18n-coverage AC-9):
 * - Wrapping labels ("Summary", "Observations", "Refresh", pill text) are translated.
 * - Body strings returned by Claude (data.summary, data.bullets[i], data.recommendations[i])
 *   are rendered as-is. Multi-locale prompts are tracked in a separate spec.
 */
```

---

## 7. 파일별 번역 매핑 치팅시트

> **사용법:** 각 파일마다
> 1. "네임스페이스" 컬럼의 경로에 해당 파일 키를 **중첩 dot camelCase** 구조로 추가.
> 2. "EN" / "KO" 컬럼 값을 문자열 그대로 번들에 복사. 이스케이프 주의 (`&amp;` → `&` 처럼).
> 3. "하드코딩 위치" 컬럼은 dev-spec §7에 명시된 grep 힌트. Line 번호는 리포지토리 HEAD 기준이므로 작업 시점에 ±10 변동 허용.
>
> 표 내부 `--` 는 해당 키가 **해당 파일에서 신규가 아니라 기존 번들에 이미 있음 (재사용)**을 의미. 재사용 위치는 비고 컬럼 참조.

---

### 7.1. `src/pages/milestone-detail/page.tsx`

| 네임스페이스 / 키 | EN | KO | 하드코딩 위치 | 비고 |
|-----------------|----|----|--------------|-----|
| `common.toast.saveFailed` | Failed to save | 저장에 실패했습니다 | line:756 `showToast('Failed to update milestone.', 'error')` | 신규 키 / 파일별 메시지 세밀도 필요 시 `milestones.toast.updateFailed` 로 분리 가능 |
| `milestones.toast.updateFailed` | Failed to update milestone. | 마일스톤 수정에 실패했습니다. | line:756 | **신규 추천 (파일 특화)** |
| `milestones.detail.activity.runActivityHeader` | RUN ACTIVITY | 실행 활동 | OverviewTab.tsx line:1006 span (실제 Tab 내부 구현은 OverviewTab) | 이동해서 §7.2 참조 |

> **이 파일 범위 요약:** toast 1건, 나머지는 자식 컴포넌트로 위임되어 이 파일 자체에는 하드코딩이 거의 없다.

---

### 7.2. `src/pages/milestone-detail/OverviewTab.tsx`

| 네임스페이스 / 키 | EN | KO | 하드코딩 위치 | 비고 |
|-----------------|----|----|--------------|-----|
| `milestones.detail.overview.riskBullet.onTrack` | Progress is on track. Current velocity suggests completion before the deadline. | 진행이 정상 궤도입니다. 현재 속도로는 마감 전 완료가 예상됩니다. | line:328 `riskBullets.push(<>…</>)` | 기존 `intel.aiOnTrack` 과 동일 문구 — **재사용 권장** (`t('detail.overview.intel.aiOnTrack')`) |
| `milestones.detail.overview.riskBullet.behind` | You're behind the ideal burndown. Consider increasing run frequency or reducing scope. | 이상적인 번다운보다 지연되고 있습니다. 실행 빈도를 늘리거나 범위를 줄이는 것을 고려하세요. | line:330 | 기존 `intel.aiBehind` 재사용 |
| `milestones.detail.overview.riskBullet.failingCount` | **{{count}} failing TCs** are slowing the burn. Prioritise fixing critical failures first. | **실패 {{count}}건**이 진행을 늦추고 있습니다. 중요 실패부터 우선 수정하세요. | line:333 `{tcStats.failed} failing TCs` | 신규. `<b>` 는 JSX 내에서 `<Trans>` 로 감싸거나 html-safe 변환 (i18next `Trans` 컴포넌트 권장) |
| `milestones.detail.overview.riskBullet.noFailing` | No failing TCs right now — keep the momentum going! | 현재 실패한 TC 없음 — 흐름을 이어가세요! | line:335 | 신규 |
| `milestones.detail.overview.riskBullet.topFailTag` | Top fail tag: **#{{tag}}** ({{count}} fails). Investigate this area first. | 가장 자주 실패하는 태그: **#{{tag}}** (실패 {{count}}건). 이 영역을 먼저 조사해 보세요. | line:338 | 신규, interpolation 2개 |
| `milestones.detail.overview.activity.runActivityHeader` | RUN ACTIVITY | 실행 활동 | line:1006 span | 신규, upper-case 유지 (CSS `text-transform: uppercase` 가 언어 무관 작동) |
| `milestones.detail.overview.activity.filter.statuses` | Statuses | 전체 상태 | line:1073 `<option value="all">` | 신규 |
| `milestones.detail.overview.activity.filter.passed` | Passed | 통과 | line:1074 | 기존 `common.passed` 재사용 가능. 하지만 이 네임스페이스 편입 권장 (OverviewTab 전용) |
| `milestones.detail.overview.activity.filter.failed` | Failed | 실패 | line:1075 | 동일 |
| `milestones.detail.overview.activity.filter.retest` | Retest | 재테스트 | line:1076 | `common.retest` 재사용 |
| `milestones.detail.overview.activity.filter.blocked` | Blocked | 차단 | line:1077 | `common.blocked` 재사용 |
| `milestones.detail.overview.activity.filter.note` | Notes | 메모 | line:1078 | 신규 |
| `milestones.detail.overview.activity.empty` | No activity yet | 아직 활동 없음 | line:1110 | `detail.overview.executionEmpty` (`실행 기록 없음`) 와 문맥이 다름 — 신규 추가 권장 |
| `milestones.detail.overview.activity.noteTypeBadge` | Note | 메모 | line:1129 | 신규 |
| `milestones.detail.overview.activity.stats.notes` | Notes | 메모 | line:1051 `<div>Notes</div>` | 신규 |
| `milestones.detail.overview.activity.stats.notesAdded` | {{count}} notes added | 메모 {{count}}건 추가됨 | line:1051 `activityStats.notes notes added` | 신규. interpolation `{{count}}` |
| `milestones.detail.overview.activity.stats.passed` | Passed | 통과 | line:1052 | 재사용 |
| `milestones.detail.overview.activity.stats.passedSetTo` | {{count}} set to Passed | 통과로 변경 {{count}}건 | line:1052 | 신규 |
| `milestones.detail.overview.activity.stats.failed` | Failed | 실패 | line:1053 | 재사용 |
| `milestones.detail.overview.activity.stats.failedSetTo` | {{count}} set to Failed | 실패로 변경 {{count}}건 | line:1053 | 신규 |
| `milestones.detail.overview.activity.stats.retest` | Retest | 재테스트 | line:1054 | 재사용 |
| `milestones.detail.overview.activity.stats.retestSetTo` | {{count}} set to Retest | 재테스트로 변경 {{count}}건 | line:1054 | 신규 |
| `milestones.detail.overview.editModal.title` | Edit Milestone | 마일스톤 수정 | line:1183 | 기존 `editMilestone` 재사용 |
| `common.cancel` | Cancel | 취소 | line:1204 | 재사용 |
| `common.save` | Save | 저장 | line:1205 | 재사용 |
| `milestones.detail.overview.passRateLabel` | Pass Rate | 통과율 | line:931 | `kpi.passRate` 재사용 가능 |
| `milestones.detail.overview.totalTcsLabel` | Total TCs | 전체 TC | line:933 | `rollupTotal` 재사용 |

> **이 파일 범위 요약:** 약 25 키. 리스크 bullet 5종 + Activity 섹션 대부분 + 모달 2개. 기존 번들에 있는 키는 최대한 재사용.

---

### 7.3. `src/pages/milestone-detail/BurndownChart.tsx`

| 네임스페이스 / 키 | EN | KO | 하드코딩 위치 | 비고 |
|-----------------|----|----|--------------|-----|
| `milestones.detail.overview.burndown.title` | Burndown | 번다운 | line:81, line:98 | 기존 `detail.overview.burndown` 재사용 가능 (값이 `'Burndown'` / `'번다운'`) |
| `milestones.detail.overview.burndown.empty` | Start running tests to see burndown | 테스트 실행을 시작하면 번다운이 표시됩니다 | line:87 | 기존 `chart.emptyBurndown` 재사용 |
| `milestones.detail.overview.burndown.legend.ideal` | Ideal | 이상 | line:101 | 기존 `chart.legend.ideal` 재사용 (값 `'Ideal' / '이상적'`) → **기존 KO `이상적` 을 유지. 신규 시트에서 충돌 시 기존 우선** |
| `milestones.detail.overview.burndown.legend.actual` | Actual | 실제 | line:102 | 기존 재사용 |
| `milestones.detail.overview.burndown.legend.projected` | Projected | 예측 | line:103 | 기존 재사용 (값 `'Projected' / '예측'`) |
| `milestones.detail.overview.burndown.range.7d` | 7d | 7일 | line:108 | 기존 `chart.range.7d` 재사용 |
| `milestones.detail.overview.burndown.range.30d` | 30d | 30일 | line:108 | 기존 재사용 |
| `milestones.detail.overview.burndown.range.all` | All | 전체 | line:108 | 기존 재사용 |

> **이 파일 범위 요약:** 8 키 모두 **기존 번들에 존재**. `useTranslation('milestones')` 만 추가하고 `t('detail.overview.chart.*')` 로 치환하면 끝.

---

### 7.4. `src/pages/milestone-detail/KpiStrip.tsx`

이미 일부 i18n 적용 (ETA 관련). 남은 하드코딩:

| 네임스페이스 / 키 | EN | KO | 하드코딩 위치 | 비고 |
|-----------------|----|----|--------------|-----|
| `milestones.detail.overview.kpi.remaining` | Remaining | 남음 | line:49 | **기존 값 `'남은 TCs'` 존재** → 기존 유지, 키 재사용 |
| `milestones.detail.overview.kpi.executed` | Executed | 실행됨 | line:54 | 기존 재사용 |
| `milestones.detail.overview.kpi.velocity` | Velocity | 속도 | line:59 | 기존 재사용 |
| `milestones.detail.overview.kpi.passRate` | Pass Rate | 통과율 | line:63 | 기존 재사용 |
| `milestones.detail.overview.kpi.totalSuffix` | {{n}} total | 총 {{n}}건 | line:52 `{total} total` | 신규 |
| `milestones.detail.overview.kpi.ofTotal` | of {{n}} | {{n}} 중 | line:57 `of {total}` | 신규 |
| `milestones.detail.overview.kpi.tcsPerDay` | TCs / day | TC / 일 | line:62 | 신규 |
| `milestones.detail.overview.kpi.passedSuffix_one` | {{count}} passed | 통과 {{count}}건 | line:66 `{passed} passed` | 신규 (plural — 한국어는 동일) |
| `milestones.detail.overview.kpi.passedSuffix_other` | {{count}} passed | 통과 {{count}}건 | — | 동일 |
| `milestones.detail.overview.kpi.targetSuffix` | {{days}}d target | 목표 {{days}}일 남음 | line:33 fallback `${etaDaysLeft}d target` | 신규. 현재 코드에 `etaDaysLeft`은 양수일 때만 해당 |
| `milestones.detail.overview.kpi.projectedSuffix` | {{days}}d proj | {{days}}일 예상 | line:43 fallback | 신규 |

> **이 파일 범위 요약:** 11 키. 4개는 기존 재사용, 7개 신규.

---

### 7.5. `src/pages/milestone-detail/FailedBlockedCard.tsx`

| 네임스페이스 / 키 | EN | KO | 하드코딩 위치 | 비고 |
|-----------------|----|----|--------------|-----|
| `milestones.detail.overview.failedBlocked.title` | Failed & Blocked | 실패 및 차단 | line:22 `Failed &amp; Blocked` | 신규. HTML entity `&amp;` 는 번들에서는 `&` 일반 문자로 |
| `milestones.detail.overview.failedBlocked.viewAll` | View all → | 모두 보기 → | line:25 | 신규 |
| `milestones.detail.overview.failedBlocked.empty` | No failed or blocked TCs 🎉 | 실패·차단된 TC 없음 🎉 | line:31 | 신규 |
| `milestones.detail.overview.failedBlocked.a11y.region` | Failed and blocked test cases | 실패·차단된 테스트 케이스 | line:19 aria-label | 신규. a11y 트리 |

> **이 파일 범위 요약:** 4 키 모두 신규. `F` / `B` 단일 문자 아이콘은 언어 무관 기호이므로 **번역 대상 외**.

---

### 7.6. `src/pages/milestone-detail/VelocitySparkline.tsx`

| 네임스페이스 / 키 | EN | KO | 하드코딩 위치 | 비고 |
|-----------------|----|----|--------------|-----|
| `milestones.detail.overview.velocity.title` | Velocity | 속도 | line:19 | 기존 `kpi.velocity` 재사용 |
| `milestones.detail.overview.velocity.noExecutions` | no executions | 실행 없음 | line:20 | 신규 |
| `milestones.detail.overview.velocity.avgSuffix` | {{avg}} avg | 평균 {{avg}} | line:20 `${avg} avg` | 기존 `intel.avgPerDay` 와 중복 가능. **기존 키 재사용 권장** |
| `milestones.detail.overview.velocity.a11y.region` | Velocity last 7 days | 최근 7일 속도 | line:16 aria-label | 신규 |
| `milestones.detail.overview.velocity.dayLabels` | `M,T,W,T,F,S,S` (array join `,`) | `월,화,수,목,금,토,일` | line:5 `DAY_LABELS` 상수 | **신규. 배열을 키로 저장하지 말고 7개 개별 키 (day.mon/tue/…/sun) 로 분리 권장** — 아래 참조 |

**DAY_LABELS 분리 대안 (권장):**

| 키 | EN | KO |
|----|----|----|
| `common.weekday.short.mon` | M | 월 |
| `common.weekday.short.tue` | T | 화 |
| `common.weekday.short.wed` | W | 수 |
| `common.weekday.short.thu` | T | 목 |
| `common.weekday.short.fri` | F | 금 |
| `common.weekday.short.sat` | S | 토 |
| `common.weekday.short.sun` | S | 일 |

> **이 파일 범위 요약:** 11 키 (DAY_LABELS 분리 시 11, 배열로 둘 경우 5). 배열 저장은 i18next 표준에서 정식 지원되나 유닛 테스트 커버리지가 약해 개별 키 권장.

---

### 7.7. `src/pages/milestone-detail/TopFailTagsCard.tsx`

| 네임스페이스 / 키 | EN | KO | 하드코딩 위치 | 비고 |
|-----------------|----|----|--------------|-----|
| `milestones.detail.overview.topFailTags.title` | Top-Fail Tags | 실패 상위 태그 | line:17 | 기존 `intel.topFailTags` 재사용 |
| `milestones.detail.overview.topFailTags.suffix` | of {{total}} fails | 총 {{total}}건 실패 중 | line:18 | 신규 |
| `milestones.detail.overview.topFailTags.empty` | No tags on failed TCs | 실패 TC에 태그 없음 | line:22 | 기존 `intel.noFailedTags` 재사용 가능 (값: `실패한 테스트 케이스에 태그 없음` — 신규보다 더 긴 형태. 양쪽 호환 가능하나 **신규 키 정의 권장**) |
| `milestones.detail.overview.topFailTags.a11y.region` | Top failing tags | 자주 실패하는 태그 | line:14 aria-label | 신규 |

> **이 파일 범위 요약:** 4 키. 2개는 기존과 유사, 2개 신규.

---

### 7.8. `src/pages/milestone-detail/ContributorsCard.tsx`

| 네임스페이스 / 키 | EN | KO | 하드코딩 위치 | 비고 |
|-----------------|----|----|--------------|-----|
| `milestones.detail.overview.contributors.title` | Contributors — Top 5 | 기여자 — 상위 5명 | line:24 | 기존 `contributorsSide.title` 재사용 (값: `기여자 — Top 5` — 신규안 `상위 5명` 이 더 kor-natural. **새 키 정의 권장**) |
| `milestones.detail.overview.contributors.empty` | No contributors yet | 아직 기여자가 없습니다 | line:27 | 기존 `contributorsSide.empty` 재사용 (값: `기여자 없음`) — 신규안 권장 |
| `milestones.detail.overview.contributors.countSuffix_one` | {{count}} TC | {{count}}건 | line:44 `{count} TCs` | 신규 |
| `milestones.detail.overview.contributors.countSuffix_other` | {{count}} TCs | {{count}}건 | — | 신규 |
| `milestones.detail.overview.contributors.a11y.region` | Top contributors | 주요 기여자 | line:21 aria-label | 신규 |

> **이 파일 범위 요약:** 5 키. alt 속성 (`alt={author}`) 과 title (`title={profile?.name || author}`) 은 사용자 데이터이므로 번역 대상 아님.

---

### 7.9. `src/pages/milestone-detail/Activity24hFeed.tsx`

| 네임스페이스 / 키 | EN | KO | 하드코딩 위치 | 비고 |
|-----------------|----|----|--------------|-----|
| `milestones.detail.overview.activity.last24h` | Last 24h | 최근 24시간 | line:51, line:79 | 기존 `activityStrip.label` 재사용 (값: `최근 24시간`) |
| `milestones.detail.overview.activity.empty` | No activity in the last 24 hours | 최근 24시간 동안 활동 없음 | line:54, line:86 | 기존 `activityStrip.empty` 재사용 |
| `milestones.detail.overview.activity.viewAllShort` | View all → | 모두 보기 → | line:67 | 기존 `activityStrip.viewAll` 재사용 |
| `milestones.detail.overview.activity.viewAllFull` | View full activity → | 전체 활동 보기 → | line:81 | 기존 `intel.viewFullActivity` 재사용 |
| `milestones.detail.overview.activity.header` | Activity — Last 24h | 활동 — 최근 24시간 | line:79 | 기존 `intel.last24h` 재사용 |
| `milestones.detail.overview.activity.action.passed` | passed | 통과 | line:27 | 신규 (소문자, 본문 inline) |
| `milestones.detail.overview.activity.action.failed` | failed | 실패 | line:28 | 신규 |
| `milestones.detail.overview.activity.action.blocked` | blocked | 차단 | line:29 | 신규 |
| `milestones.detail.overview.activity.action.retest` | retested | 재테스트 | line:30 | 신규 |
| `milestones.detail.overview.activity.action.default` | noted | 메모 | line:31 | 신규 |
| `milestones.detail.overview.activity.someone` | Someone | 누군가 | line:60, line:94 | 신규 |
| `milestones.detail.overview.activity.inRun` | in {{runName}} | {{runName}}에서 | line:95 | 신규. `{{runName}}` interpolation |
| `milestones.detail.overview.activity.a11y.region` | Activity in the last 24 hours | 최근 24시간 활동 | line:49 aria-label | 신규 |
| `milestones.detail.overview.activity.a11y.event` | {{author}} {{action}} {{testCase}} | {{author}}이 {{testCase}}을 {{action}} | line:58 title attr | **신규 주의**: 한국어 어순이 EN과 다름. `{{author}}이 {{action}} — {{testCase}}` 로 심플하게 할지, 조사 복잡도 때문에 아예 i18n 처리 생략하고 aria-label 은 영어로 둘지 재량. **이번 스코프는 아예 비워두는 대안 권장** (a11y 레이블만은 i18n 생략) |

> **이 파일 범위 요약:** 14 키. 기존 재사용 5개 + 신규 9개. `relativeTime()` 헬퍼는 §4-1 의 `formatRelativeTime(iso, t)` 로 삭제·대체.

---

### 7.10. `src/pages/milestone-detail/ExecutionSections.tsx`

이미 `useTranslation('milestones')` 일부 적용 중. 하드코딩 남은 부분:

| 네임스페이스 / 키 | EN | KO | 하드코딩 위치 | 비고 |
|-----------------|----|----|--------------|-----|
| `milestones.detail.overview.sections.subMilestones` | Sub Milestones | 하위 마일스톤 | line:115 | **기존 키 재사용**. 값 확정 완료 |
| `milestones.detail.overview.sections.testPlans` | Test Plans | 테스트 플랜 | line:154 | 기존 재사용 |
| `milestones.detail.overview.sections.runs` | Runs | 런 | line:207 | 기존 재사용 (KO: "런" 레거시) |
| `milestones.detail.overview.sections.exploratory` | Exploratory | 탐색 | line:264 | 기존 재사용 |
| `milestones.detail.overview.sections.loadFailed` | Failed to load plans. | 플랜 불러오기에 실패했습니다. | line:163 | 신규 |
| `milestones.detail.overview.sections.runBadge.planned` | Planned | 계획된 | line:210 | 신규 |
| `milestones.detail.overview.sections.runBadge.milestoneDirect` | Milestone-direct | 마일스톤 직접 | line:211, line:218 | 신규 |
| `milestones.detail.overview.sections.runBadge.planLabel` | Plan: {{name}} | 플랜: {{name}} | line:218 | 신규 |
| `milestones.detail.overview.sections.runBadge.planDeleted` | Plan: (deleted) | 플랜: (삭제됨) | line:218 | 신규 |
| `milestones.detail.overview.sections.plan.priorityLabel` | Priority: {{priority}} | 우선순위: {{priority}} | line:187 | 신규. `{{priority}}` 는 `high / medium / low / critical` 영문 그대로 주입 — 2차 리팩에서 `t('common:priority.'+priority)` 조합 권장 |
| `milestones.detail.overview.sections.plan.targetLabel` | Target {{date}} | 목표일 {{date}} | line:188 | 신규 |
| `milestones.detail.overview.sections.stat.passed` | passed | 통과 | line:245 `<b>…</b> passed` | 신규 (소문자) |
| `milestones.detail.overview.sections.stat.failed` | failed | 실패 | line:246 | 신규 |
| `milestones.detail.overview.sections.stat.blocked` | blocked | 차단 | line:247 | 신규 |
| `milestones.detail.overview.sections.stat.untested` | untested | 미실행 | line:248 | 신규 |
| `milestones.detail.overview.sections.session.segment.note` | Note | 메모 | line:284 SegmentedBar label prop | 신규 |
| `milestones.detail.overview.sections.session.segment.bug` | Bug | 버그 | line:285 | 신규 |
| `milestones.detail.overview.sections.session.segment.obs` | Obs | 관찰 | line:286 | 신규 (Obs 약어는 한국어에서도 유지 여부 — dev-spec이 `관찰`로 확정) |
| `milestones.detail.overview.sections.session.segment.step` | Step | 스텝 | line:287 | 신규 |

> **이 파일 범위 요약:** 19 키. 기존 재사용 4 + 신규 15.

---

### 7.11. `src/pages/milestone-detail/RiskSignalCard.tsx`

| 네임스페이스 / 키 | EN | KO | 하드코딩 위치 | 비고 |
|-----------------|----|----|--------------|-----|
| `milestones.riskSignal.title` | Risk Signal | 위험 신호 | line:51 | 기존 재사용 |
| `milestones.riskSignal.critical` | Critical | 심각 | line:38 | 기존 재사용 |
| `milestones.riskSignal.atRisk` | At Risk | 주의 | line:39 | 기존 재사용 |
| `milestones.riskSignal.onTrack` | On track | 정상 진행 | line:40 | 기존 재사용 |
| `milestones.riskSignal.empty` | Keep running tests to build risk signal. | 테스트를 더 실행하면 위험 신호를 확인할 수 있습니다. | line:60 | 기존 재사용 |
| `milestones.riskSignal.a11y.region` | Milestone risk analysis | 마일스톤 위험 분석 | line:46 aria-label | 신규 |

> **이 파일 범위 요약:** 6 키. 5개 기존 재사용 + 1 신규 (a11y).

---

### 7.12. `src/pages/milestone-detail/AiRiskAnalysisCard.tsx`

| 네임스페이스 / 키 | EN | KO | 하드코딩 위치 | 비고 |
|-----------------|----|----|--------------|-----|
| `milestones.aiRisk.title` | AI Risk Analysis | AI 리스크 분석 | line:61 | 기존 재사용 |
| `milestones.aiRisk.lastAnalyzed` | Last analyzed {{time}} | 마지막 분석: {{time}} | line:64 | 기존 재사용. `{{time}}` 는 `formatRelativeTime` 결과 |
| `milestones.aiRisk.staleSuffix` | ` (stale)` | ` (오래됨)` | line:65 | **신규. 공백 1개 + 괄호 포함** |
| `milestones.aiRisk.refreshing` | Refreshing | 새로고침 중 | line:76 | 신규 |
| `milestones.aiRisk.refreshCta` | Refresh | 새로고침 | line:76 | 기존 재사용 |
| `milestones.aiRisk.a11y.refresh` | Refresh AI analysis | AI 분석 새로고침 | line:73 aria-label | 신규 |
| `milestones.aiRisk.a11y.region` | AI milestone risk analysis | 마일스톤 AI 위험 분석 | line:57 aria-label | 신규 |
| `milestones.aiRisk.a11y.confidence` | Analysis confidence {{value}}% | 분석 신뢰도 {{value}}% | line:89 aria-label | 신규 |
| `milestones.aiRisk.pill.critical` | Critical | 심각 | line:49 | 기존 `riskSignal.critical` 재사용 (동일 라벨) |
| `milestones.aiRisk.pill.atRisk` | At Risk | 주의 | line:50 | 동일 |
| `milestones.aiRisk.pill.onTrack` | On track | 정상 진행 | line:51 | 동일 |
| `milestones.aiRisk.lowConfidence` | Low confidence | 신뢰도 낮음 | line:96 | 기존 `lowConfidence` 재사용 가능 (값은 더 긴 bullet 형태 `신뢰도 낮음 — …` 임. **신규 키 분리 권장**) |
| `milestones.aiRisk.lowConfidenceHint` | Refresh after more runs | 실행이 더 쌓인 뒤 새로고침 | line:94 title attr | 신규 |
| `milestones.aiRisk.summaryLabel` | Summary | 요약 | line:102 | 기존 재사용 |
| `milestones.aiRisk.observationsLabel` | Observations | 관찰 | line:109 | 기존 재사용 |
| `milestones.aiRisk.recommendationsLabel` | Recommendations | 권장 조치 | line:118 | 기존 재사용 |

> **이 파일 범위 요약:** 16 키. 9 기존 재사용 + 7 신규. 인라인 `relativeTime()` 함수는 §4-1 공통 헬퍼로 대체.

---

### 7.13. `src/pages/milestone-detail/RiskInsightContainer.tsx`

| 네임스페이스 / 키 | EN | KO | 하드코딩 위치 | 비고 |
|-----------------|----|----|--------------|-----|
| `milestones.aiRisk.needTcs` | Add test cases first to enable AI analysis. | AI 분석을 사용하려면 먼저 테스트 케이스를 추가하세요. | line:103 toast | 기존 재사용 (`needTcs` 존재) |
| `milestones.aiRisk.upgradeToHobby` | Upgrade to Hobby to unlock AI analysis. | AI 분석을 사용하려면 Hobby 플랜으로 업그레이드하세요. | line:109 toast | 기존 재사용 |
| `milestones.aiRisk.quotaExhausted` | Monthly AI credits exhausted. | 월 AI 크레딧이 소진되었습니다. | line:113 toast | 신규 (기존 `quotaBanner` 는 숫자 포함 longer form) |
| `milestones.toast.analysisRefreshed` | Analysis refreshed | 분석이 갱신되었습니다 | line:128 | 신규 |
| `milestones.toast.analysisReady` | AI analysis ready | AI 분석 완료 | line:130 | 신규 |
| `milestones.aiRisk.error.timeoutShort` | AI analysis timed out. | AI 분석 시간이 초과되었습니다. | line:140 toast | 신규 (기존 `error.timeout` 은 `. Retry →` 포함 long form) |
| `milestones.aiRisk.error.rateLimitToast` | Claude is rate-limited. Try again in {{sec}}s. | Claude 속도 제한 중입니다. {{sec}}초 뒤 다시 시도해 주세요. | line:145 toast | 신규 |
| `milestones.aiRisk.error.parseToast` | AI returned unexpected format. | AI 응답 형식이 잘못되었습니다. | line:152 toast | 신규 |
| `milestones.aiRisk.error.networkToast` | Network error while analyzing. | 분석 중 네트워크 오류가 발생했습니다. | line:155 toast | 신규 |
| `milestones.aiRisk.error.upgradeToast` | Upgrade to unlock AI analysis. | 업그레이드하면 AI 분석을 사용할 수 있습니다. | line:158 toast | 신규 |
| `common.toast.somethingWentWrong` | Something went wrong. | 문제가 발생했습니다. | line:161 toast | 신규 (전역 fallback) |
| `milestones.aiRisk.error.bannerFallback` | AI analysis failed. | AI 분석에 실패했습니다. | line:189 errorBanner msg | 신규 |
| `milestones.aiRisk.error.timeoutBanner` | AI analysis timed out. | AI 분석 시간이 초과되었습니다. | line:191 | = `error.timeoutShort` 재사용 |
| `milestones.aiRisk.error.rateLimitBanner` | Claude is rate-limited. Try again in {{sec}}s. | Claude 속도 제한 중입니다. {{sec}}초 뒤 다시 시도해 주세요. | line:192 | = `error.rateLimitToast` 재사용 |
| `milestones.aiRisk.error.quotaBanner` | Monthly AI credits exhausted. | 월 AI 크레딧이 소진되었습니다. | line:193 | = `quotaExhausted` 재사용 |
| `milestones.aiRisk.error.parseBanner` | AI returned unexpected format. | AI 응답 형식이 잘못되었습니다. | line:194 | = `error.parseToast` 재사용 |
| `milestones.aiRisk.error.networkBanner` | Network error. Try again. | 네트워크 오류. 다시 시도해 주세요. | line:195 | 신규 |
| `milestones.aiRisk.error.upgradeBanner` | Upgrade to unlock AI analysis. | 업그레이드하면 AI 분석을 사용할 수 있습니다. | line:196 | = `error.upgradeToast` 재사용 |
| `milestones.aiRisk.error.forbiddenBanner` | You lack permission to run AI analysis. | AI 분석 실행 권한이 없습니다. | line:197 | 신규 |
| `milestones.aiRisk.error.retryLink` | Retry → | 재시도 → | line:211 | 신규 |
| `milestones.aiRisk.viewerMessage` | Ask your admin to run AI analysis. | 관리자에게 AI 분석 실행을 요청하세요. | line:230 | 기존 재사용 |
| `milestones.aiRisk.upgradeChip` | Upgrade | 업그레이드 | line:250 | 기존 재사용 |
| `milestones.aiRisk.analyzeCta` | Analyze with AI → | AI로 분석하기 → | line:247, line:281, line:322 | 기존 `analyzeCta` 재사용 (값에 `→` 없음 — **→ 유지 판단은 UX Lead 권한. dev-spec이 아래 v2 §12 을 따라 화살표 유지**) |
| `milestones.aiRisk.a11y.analyzeCta` | Analyze milestone risk with AI | AI로 마일스톤 위험 분석 | line:243 aria-label | 신규 |
| `milestones.aiRisk.tierDisabledTitle` | Upgrade to Hobby to unlock AI analysis | AI 분석을 사용하려면 Hobby 플랜으로 업그레이드 | line:245 title | 기존 `upgradeToHobby` 재사용 (끝의 `.` 제거한 버전) |
| `milestones.aiRisk.quotaBannerInline` | Monthly AI credits exhausted {{suffix}} | 월 AI 크레딧 소진 {{suffix}} | line:263 | 신규. `{{suffix}}` 는 ` (10/10).` 또는 `.` |
| `milestones.aiRisk.quotaBannerCta` | Upgrade → | 업그레이드 → | line:265 | 기존 재사용 |
| `milestones.aiRisk.disableNoTcsTitle` | Add test cases first to enable AI analysis | AI 분석을 사용하려면 먼저 테스트 케이스를 추가 | line:279 title | 기존 `needTcs` 재사용 |
| `milestones.aiRisk.rateLimitCountdown` | Try again in {{sec}}s | {{sec}}초 뒤 다시 시도 | line:296 | 신규 |
| `milestones.aiRisk.analyzing` | Analyzing with Claude… | Claude가 분석 중… | line:310 | 기존 재사용 |

> **이 파일 범위 요약:** 30 키. 기존 재사용 11 + 신규 19. 토스트와 배너가 같은 문장을 다른 문맥으로 쓸 때 **키 분리 vs 키 재사용**을 표에서 명확히 표기.

---

### 7.14. `src/pages/milestone-detail/RollupBadge.tsx`

이미 i18n 완료. **변경 없음.** 스캐너 0건 통과 확인용.

---

### 7.15. `src/components/issues/IssuesList.tsx`

| 네임스페이스 / 키 | EN | KO | 하드코딩 위치 | 비고 |
|-----------------|----|----|--------------|-----|
| `common.issues.sources` | Sources | 소스 | line:259 | 신규 |
| `common.issues.all` | All | 전체 | line:261 | 신규 |
| `common.issues.totalIssues` | Total Issues | 전체 이슈 | line:282 | 신규 |
| `common.issues.jira` | Jira | Jira | line:287 | **고유명사 — 번역 금지 (§3-1)** |
| `common.issues.github` | GitHub | GitHub | line:292 | **고유명사 — 번역 금지** |
| `common.issues.linkedTcs` | Linked TCs | 연결된 TC | line:297 | 신규 |
| `common.issues.bugReports` | bug reports | 버그 리포트 | line:289 | 신규 |
| `common.issues.issues` | issues | 이슈 | line:294 | 신규 |
| `common.issues.withIssue` | with issue | 이슈 연결됨 | line:299 | 신규 |
| `common.issues.fromRuns_one` | from {{count}} run | 실행 {{count}}건에서 | line:284 | 신규 (plural) |
| `common.issues.fromRuns_other` | from {{count}} runs | 실행 {{count}}건에서 | — | 신규 (plural) |
| `common.issues.tcsWithLinkedIssues_one` | {{count}} TC with linked issues. | 연결된 이슈가 있는 TC {{count}}건. | line:390 | 신규 (plural) |
| `common.issues.tcsWithLinkedIssues_other` | {{count}} TCs with linked issues. | 연결된 이슈가 있는 TC {{count}}건. | — | 신규 (plural) |
| `common.issues.sourceSuffix.jira` | {{count}} Jira. | Jira {{count}}건. | line:391 | 신규 |
| `common.issues.sourceSuffix.github` | {{count}} GitHub. | GitHub {{count}}건. | line:392 | 신규 |
| `common.issues.loading` | Loading issues… | 이슈 불러오는 중… | line:248 | 신규 |
| `common.issues.empty.title` | No issues linked yet. | 연결된 이슈가 없습니다. | line:311 | 신규 |
| `common.issues.empty.hint` | Issues appear here once you link Jira or GitHub issues from failed test results. | 실패한 테스트 결과에 Jira 또는 GitHub 이슈를 연결하면 여기에 표시됩니다. | line:312 | 신규 |
| `common.issues.metadataUnavailable` | Metadata unavailable | 메타데이터 없음 | line:348 | 기존 `issues.metaUnavailable` 재사용 |
| `common.issues.debounceWait` | Please wait before refreshing again | 잠시 후 다시 새로고침해 주세요 | line:217 toast | 신규 |
| `common.issues.refreshFailed` | Failed to refresh issues. Retry later. | 이슈 새로고침에 실패했습니다. 잠시 후 다시 시도해 주세요. | line:230, line:239 toast | 기존 `issues.refreshError` 는 짧은 버전. **신규 long 키 추가 권장** |
| `common.issues.syncedCount` | Synced {{count}} issues | 이슈 {{count}}건 동기화됨 | line:234 toast | 기존 `issues.refreshSuccess` 재사용 |
| `common.issues.rowLabel` (fallback) | Issue from TC {{tcId}} | TC {{tcId}}의 이슈 | line:321 | 신규 |
| `common.issues.sourceLabel.jiraBug` | Jira · Bug | Jira · 버그 | line:338 | 신규 |
| `common.issues.sourceLabel.github` | GitHub | GitHub | line:338 | 고유명사 |
| `common.issues.a11y.issueRow` | {{source}} issue {{key}}, priority {{priority}}, status {{status}} | {{source}} 이슈 {{key}}, 우선순위 {{priority}}, 상태 {{status}} | line:330 aria-label | 신규 |
| `common.issues.a11y.unknownPriority` | unknown | 알 수 없음 | line:330 fallback text | 신규 |
| `common.issues.a11y.unknownStatus` | unknown | 알 수 없음 | line:330 | 동일 |

> **이 파일 범위 요약:** 28 키. 기존 재사용 3 + 신규 25. Plural 3쌍.

---

### 7.16. `src/components/issues/LastSyncedLabel.tsx`

| 네임스페이스 / 키 | EN | KO | 하드코딩 위치 | 비고 |
|-----------------|----|----|--------------|-----|
| `common.issues.lastSynced` | Last synced {{time}} | 마지막 동기화 {{time}} | line:15 | **기존 `issues.lastSynced` 값은 `"Last synced {{time}} ago"` / `"{{time}} 전 동기화됨"`. 신규 안은 `ago` 가 `{{time}}` 내부로 들어간 형태. 기존 키의 값을 업데이트하거나 신규 키 생성. Dev-spec §7이 `formatRelativeTime` 으로 "5m ago" 전체를 `{{time}}`으로 주입하는 방식이므로 "Last synced 5m ago" 형태가 되려면 기존 값 뒤의 "ago" 제거 필요 (KO 도 "전" 제거). — 결론: 기존 키 값 교체 (dev-spec §10 샘플을 그대로 따른다)** |
| `common.issues.notSyncedYet` | Not synced yet | 아직 동기화 안됨 | line:15 fallback | 신규 |
| `common.issues.syncing` | Syncing… | 동기화 중… | line:21 | 신규 |
| `common.issues.refreshNow` | Refresh now | 지금 새로고침 | line:33 | 기존 재사용 |
| `common.issues.a11y.refresh` | Refresh issue metadata | 이슈 메타데이터 새로고침 | line:29 aria-label | 신규 |

> **이 파일 범위 요약:** 5 키. 기존 호환을 위해 `lastSynced` 값 포맷을 `Last synced {{time}}` (ago 접미사 내장형) 으로 **확정 업데이트**. 호출부에서 `{{time}}` 자리에 `formatRelativeTime()` 결과를 주입.

---

### 7.17. `src/components/issues/IssueAssignee.tsx`

| 네임스페이스 / 키 | EN | KO | 하드코딩 위치 | 비고 |
|-----------------|----|----|--------------|-----|
| `common.issues.assignee.unassigned` | Unassigned | 담당자 없음 | line:26 | **기존 `issues.assignee.unassigned` 존재 — 값은 `'Unassigned' / '미지정'`**. "미지정" vs "담당자 없음" 중 택일: **기존 `미지정` 유지 권장** (변경 시 리그레션). 신규 키 추가 대신 기존 재사용. |

> **이 파일 범위 요약:** 1 키, 기존 재사용.

---

### 7.18. `src/components/issues/IssuePriorityBadge.tsx`

| 네임스페이스 / 키 | EN | KO | 하드코딩 위치 | 비고 |
|-----------------|----|----|--------------|-----|
| `common.issues.priority.critical` | Critical | 심각 | line:22 | 기존 재사용 |
| `common.issues.priority.high` | High | 높음 | line:23 | 기존 재사용 |
| `common.issues.priority.medium` | Medium | 보통 | line:24 | 기존 재사용 |
| `common.issues.priority.low` | Low | 낮음 | line:25 | 기존 재사용 |
| `common.issues.priority.none` | — | — | line:13 fallback `<span>—</span>` | 기존 재사용 (값 `'—'` 동일) |

> **이 파일 범위 요약:** 5 키, 전부 기존 재사용.

---

### 7.19. `src/components/issues/IssueStatusBadge.tsx`

| 네임스페이스 / 키 | EN | KO | 하드코딩 위치 | 비고 |
|-----------------|----|----|--------------|-----|
| `common.issues.status.open` | Open | 오픈 | line:17 | 기존 재사용 |
| `common.issues.status.inProgress` | In Progress | 진행 중 | line:18 | 기존 재사용 |
| `common.issues.status.resolved` | Resolved | 해결됨 | line:19 | 기존 재사용 |
| `common.issues.status.closed` | Closed | 닫힘 | line:20 | 기존 재사용 |
| `common.issues.status.none` | — | — | line:13 fallback | 기존 재사용 |

> **이 파일 범위 요약:** 5 키, 전부 기존 재사용. **Dev-spec §10 샘플에서 `status.done` 이 언급되나 실제 코드에는 없음** — 코드 기준 유지.

---

### 7.20. `src/pages/run-detail/components/AIRunSummaryPanel.tsx`

AC-9 정책 따라 **래핑 레이블만** 번역. 본문 (`summary.narrative`, `cluster.rootCause`, `summary.recommendations`, `summary.goNoGoCondition`) 은 Claude 응답이므로 건드리지 않음.

| 네임스페이스 / 키 | EN | KO | 하드코딩 위치 | 비고 |
|-----------------|----|----|--------------|-----|
| `runs.aiSummary.title` | AI Run Summary | AI 실행 요약 | line:615 | 신규 |
| `runs.aiSummary.analyzing` | Analyzing… | 분석 중… | line:620 | 신규 |
| `runs.aiSummary.analyzingResultsFor` | Analyzing {{count}} results for patterns… | 결과 {{count}}건의 패턴을 분석 중입니다… | line:640 | 신규 |
| `runs.aiSummary.analyzingHint` | Usually takes 10-15 seconds | 보통 10-15초 소요됩니다 | line:641 | 신규 |
| `runs.aiSummary.error.default` | Analysis couldn't be completed | 분석을 완료할 수 없습니다 | line:209, 223 | 신규 |
| `runs.aiSummary.error.monthlyLimit` | Monthly AI limit reached ({{used}}/{{limit}}) | 월 AI 한도 도달 ({{used}}/{{limit}}) | line:213 | 신규 |
| `runs.aiSummary.error.tooMany` | Too many requests. Please wait a moment. | 요청이 너무 많습니다. 잠시 후 다시 시도해 주세요. | line:213 | 신규 |
| `runs.aiSummary.error.tierTooLow` | AI Summary requires Starter plan | AI 요약은 Starter 플랜부터 사용할 수 있습니다 | line:214 | 신규 |
| `runs.aiSummary.error.noResults` | No test results to analyze | 분석할 테스트 결과가 없습니다 | line:215 | 신규 |
| `runs.aiSummary.error.unauthorized` | Please log in again | 다시 로그인해 주세요 | line:216, 375 | 신규 |
| `runs.aiSummary.error.connection` | Connection error. Please try again. | 연결 오류가 발생했습니다. 다시 시도해 주세요. | line:232 | 신규 |
| `runs.aiSummary.tryAgain` | Try Again | 다시 시도 | line:653 | 신규 |
| `runs.aiSummary.staleBanner` | Test results have been updated since this summary was generated. | 이 요약이 생성된 이후 테스트 결과가 변경되었습니다. | line:672 | 신규 |
| `runs.aiSummary.updating` | Updating… | 갱신 중… | line:686 | 신규 |
| `runs.aiSummary.updateCta` | Update Summary | 요약 갱신 | line:688 | 신규 |
| `runs.aiSummary.riskSuffix` | {{level}} RISK | {{level}} 위험도 | line:703 | 신규. `{{level}}` 는 `HIGH / MEDIUM / LOW` 영문 그대로 (Claude 응답값). 한국어 문맥상 "위험도 {{level}}" 가 더 자연스러우나, level 값이 English enum 이므로 렌더 결과 "HIGH 위험도" / "위험도 HIGH" 중 후자 권장 → 키 값: `위험도 {{level}}` |
| `runs.aiSummary.creditUsed` | 1 AI credit used | AI 크레딧 1건 사용 | line:706 | 신규 |
| `runs.aiSummary.metric.total` | Total | 전체 | line:711 | 신규 |
| `runs.aiSummary.metric.passed` | Passed | 통과 | line:712 | `common.passed` 재사용 가능 |
| `runs.aiSummary.metric.failed` | Failed | 실패 | line:713 | `common.failed` 재사용 |
| `runs.aiSummary.metric.blocked` | Blocked | 차단 | line:714 | `common.blocked` 재사용 |
| `runs.aiSummary.metric.passRate` | Pass Rate | 통과율 | line:715 | 기존 `runs.passRate` 재사용 |
| `runs.aiSummary.metric.skipped` | Skipped | 스킵 | line:716 | 신규 |
| `runs.aiSummary.failurePatterns` | Failure Patterns | 실패 패턴 | line:747 | 신규 |
| `runs.aiSummary.noFailurePatterns` | No failure patterns detected. | 감지된 실패 패턴이 없습니다. | line:750 | 신규 |
| `runs.aiSummary.recommendations` | Recommendations | 권장 조치 | line:783 | 기존 `milestones.aiRisk.recommendationsLabel` 값과 동일 (`권장 조치`). 네임스페이스 별도 유지 |
| `runs.aiSummary.goNoGo.go` | GO | GO | line:543 | **영문 유지 (결재 용어)** |
| `runs.aiSummary.goNoGo.noGo` | NO-GO | NO-GO | line:544 | 영문 유지 |
| `runs.aiSummary.goNoGo.conditional` | CONDITIONAL GO | 조건부 GO | line:545 | 혼용 표기. GO/NO-GO 만 영문 고정, CONDITIONAL 은 번역 |
| `runs.aiSummary.action.copyMarkdown` | Copy as Markdown | Markdown으로 복사 | line:840 | 신규 |
| `runs.aiSummary.action.copied` | Copied! | 복사됨! | line:840 | 신규 |
| `runs.aiSummary.action.inPdf` | In PDF ✓ | PDF 포함 ✓ | line:852 | 신규 |
| `runs.aiSummary.action.includeInPdf` | Include in PDF | PDF에 포함 | line:852 | 신규 |
| `runs.aiSummary.action.share` | Share… | 공유… | line:859 | 신규 |
| `runs.aiSummary.action.shareSlack` | Share via Slack | Slack으로 공유 | line:872 | 신규 |
| `runs.aiSummary.action.shareEmail` | Share via Email | 이메일로 공유 | line:873 | 신규 |
| `runs.aiSummary.action.createJira` | Create Jira Issue | Jira 이슈 생성 | line:899 | 신규 |
| `runs.aiSummary.action.createGithub` | Create GitHub Issue | GitHub 이슈 생성 | line:910 | 신규 |
| `runs.aiSummary.action.rerunFailed` | Re-run Failed ({{count}}) | 실패 재실행 ({{count}}) | line:931 | 신규 |
| `runs.aiSummary.action.creating` | Creating… | 생성 중… | line:928, line:970 | 신규 |
| `runs.aiSummary.jira.sectionTitle` | Creating Jira Issue | Jira 이슈 생성 중 | line:943 | 신규 |
| `runs.aiSummary.jira.priorityLabel` | Priority: {{priority}} | 우선순위: {{priority}} | line:956 | 신규 (`{{priority}}` 는 `Critical/High/Medium` 영문 enum) |
| `runs.aiSummary.jira.labelsPrefix` | Labels: ai-detected, regression | 라벨: ai-detected, regression | line:957 | 신규 (라벨 값 자체는 고정 키워드, 번역 안함) |
| `runs.aiSummary.jira.relatedTcs` | {{count}} related TCs · AI run summary included in description | 관련 TC {{count}}건 · 설명에 AI 실행 요약 포함 | line:960 | 신규 |
| `common.cancel` | Cancel | 취소 | line:964, line:1008, line:1071 | 재사용 |
| `runs.aiSummary.jira.createIssue` | Create Issue | 이슈 생성 | line:970 | 신규 |
| `runs.aiSummary.github.sectionTitle` | Create GitHub Issue | GitHub 이슈 생성 | line:980 | 신규 |
| `runs.aiSummary.github.titleLabel` | Title | 제목 | line:983 | 신규 |
| `runs.aiSummary.github.bodyLabel` | Body | 본문 | line:992 | 신규 |
| `runs.aiSummary.github.willBeCreatedIn` | Will be created in **{{owner}}/{{repo}}** | **{{owner}}/{{repo}}** 에 생성됩니다 | line:1002 | 신규 |
| `runs.aiSummary.github.labelsSuffix` | · Labels: **{{labels}}** | · 라벨: **{{labels}}** | line:1004 | 신규 |
| `runs.aiSummary.slack.sectionTitle` | Share via Slack | Slack으로 공유 | line:1025 | = action.shareSlack 재사용 |
| `runs.aiSummary.slack.selectChannel` | Select channel | 채널 선택 | line:1031 | 신규 |
| `runs.aiSummary.slack.unnamedChannel` | Unnamed channel | 이름 없는 채널 | line:1038 | 신규 |
| `runs.aiSummary.slack.webhookLabel` | Slack Webhook URL | Slack Webhook URL | line:1044 | 신규 (Webhook 고유명사 유지) |
| `runs.aiSummary.slack.webhookPlaceholder` | https://hooks.slack.com/services/... | https://hooks.slack.com/services/... | line:1047 | **URL 자체는 번역 금지. 플레이스홀더 그대로 유지** |
| `runs.aiSummary.slack.noIntegration` | No Slack integration found. Connect one in Settings › Integrations, or paste a webhook URL above. | Slack 연동이 없습니다. Settings › Integrations 에서 연동하거나 위에 webhook URL을 입력하세요. | line:1053 | 신규 |
| `runs.aiSummary.email.sectionTitle` | Share via Email | 이메일로 공유 | line:1026 | = action.shareEmail 재사용 |
| `runs.aiSummary.email.recipientLabel` | Recipient email | 수신자 이메일 | line:1060 | 신규 |
| `runs.aiSummary.email.recipientPlaceholder` | teammate@company.com | teammate@company.com | line:1063 | 플레이스홀더 유지 |
| `runs.aiSummary.sending` | Sending… | 전송 중… | line:1078 | 신규 |
| `runs.aiSummary.send` | Send | 전송 | line:1080 | 신규 |
| `runs.aiSummary.toast.copied` | Summary copied to clipboard as Markdown | 요약이 Markdown 형식으로 클립보드에 복사되었습니다 | line:359 | 신규 |
| `runs.aiSummary.toast.copyFailed` | Failed to copy to clipboard | 클립보드 복사에 실패했습니다 | line:362 | 신규 |
| `runs.aiSummary.toast.jiraKeyMissing` | Jira Project Key is not set for this project. Please edit the project settings. | 이 프로젝트에 Jira Project Key가 설정되어 있지 않습니다. 프로젝트 설정을 수정해 주세요. | line:369 | 신규 |
| `runs.aiSummary.toast.jiraCreated` | Jira issue{{keySuffix}} created | Jira 이슈{{keySuffix}} 생성됨 | line:402 | 신규. `{{keySuffix}}` 는 ` KEY-123` 또는 빈 문자열 |
| `runs.aiSummary.toast.jiraFailed` | Failed to create Jira issue | Jira 이슈 생성에 실패했습니다 | line:405, line:408 | 신규 |
| `runs.aiSummary.toast.githubCreated` | GitHub issue #{{number}} created | GitHub 이슈 #{{number}} 생성됨 | line:430 | 신규 |
| `runs.aiSummary.toast.githubFailed` | Failed to create GitHub issue | GitHub 이슈 생성에 실패했습니다 | line:433, 436 | 신규 |
| `runs.aiSummary.toast.slackWebhookRequired` | Please enter a Slack webhook URL | Slack webhook URL을 입력해 주세요 | line:451 | 신규 |
| `runs.aiSummary.toast.slackShared` | Summary shared to Slack | 요약이 Slack으로 공유되었습니다 | line:457 | 신규 |
| `runs.aiSummary.toast.slackFailed` | Failed to send to Slack | Slack 전송에 실패했습니다 | line:460 | 신규 |
| `runs.aiSummary.toast.emailRequired` | Please enter an email address | 이메일 주소를 입력해 주세요 | line:467 | 신규 |
| `runs.aiSummary.toast.emailShared` | Summary shared to {{email}} | 요약이 {{email}}으로 공유되었습니다 | line:477 | 신규 |
| `runs.aiSummary.toast.emailFailed` | Failed to send email | 이메일 전송에 실패했습니다 | line:481 | 신규 |
| `runs.aiSummary.toast.pdfIncluded` | AI summary will be included in PDF export | AI 요약이 PDF 내보내기에 포함됩니다 | line:847 | 신규 |
| `runs.aiSummary.toast.pdfRemoved` | Removed from PDF export | PDF 내보내기에서 제외됨 | line:847 | 신규 |
| `runs.aiSummary.toast.rerunFailedEmpty` | No failed test cases found to re-run | 재실행할 실패 테스트 케이스가 없습니다 | line:500 | 신규 |
| `runs.aiSummary.toast.rerunCreated_one` | New run created with {{count}} failed test case | 실패 테스트 케이스 {{count}}건으로 새 실행 생성됨 | line:525 | 신규 (plural) |
| `runs.aiSummary.toast.rerunCreated_other` | New run created with {{count}} failed test cases | 실패 테스트 케이스 {{count}}건으로 새 실행 생성됨 | — | 신규 (plural) |
| `runs.aiSummary.toast.rerunFailed` | Failed to create re-run | 재실행 생성에 실패했습니다 | line:529 | 신규 |

> **이 파일 범위 요약:** 약 70 키. 신규 68 + 재사용 3 (common.cancel, common.passed, common.failed/blocked).
>
> **⚠️ 중요:** AI 응답 본문 (`summary.narrative` 등)에 포함된 **영어 문장은 절대 번역 대상이 아니다** (AC-9). 파일 상단 주석 §6-3 필수.
>
> **⚠️ 규모 경고:** 이 파일 하나에 약 70 신규 키. Dev-spec AC-10 (신규 키 ≤180) 을 고려하면 이 한 파일이 **전체 예산의 40%** 를 차지한다. Developer 가 구현 중 초과할 경우 dev-spec §9 에서 언급된 "Share / Jira / GitHub 인라인 폼" 섹션을 **2차 스코프로 분리** 협의 필요. (이미 AC-9 정책상 AIRunSummaryPanel 은 "Claude 응답 주변 레이블만" 이라고 선언된 만큼, Share / Jira / GitHub 폼은 AI 응답과 무관하므로 2차 분리가 자연스럽다.)

---

## 8. 판단 트리 — 새 영문 문자열을 발견했을 때

```
(1) 이게 Claude API 응답에서 온 본문인가?
    ├─ Yes → 번역 금지 (AC-9). 그대로 렌더.
    └─ No  → 계속

(2) 이게 Testably / Jira / GitHub / Claude 같은 브랜드명인가?
    ├─ Yes → 번역 금지. .i18nignore 등재 확인.
    └─ No  → 계속

(3) 이게 데이터 필드(사용자 입력·DB row 값)인가?
    ├─ Yes → 번역 금지. {{variable}} 로 주입.
    └─ No  → 계속

(4) 이 문자열이 이미 기존 번들에 같은 의미로 존재하는가? (grep 필수)
    ├─ Yes → 기존 키 재사용. 단 "문맥이 다르면" 재사용 금지 (§7 비고 참조)
    └─ No  → 신규 키 작성:
              a. 네임스페이스 결정 (§4-2 배치 룰)
              b. 키 네이밍: <namespace>.<feature>.<element> (§4-3 컨벤션)
              c. plural 필요성 판단 (§5-1)
              d. en/ko 두 파일에 모두 추가
              e. 파일 상단에 useTranslation 훅 바인딩 확인
              f. scan:i18n 실행 → 매치 0건 확인
              g. scan:i18n:parity 실행 → 키 parity 0 diff 확인
```

---

## 9. 상태별 화면 — 카피 관점 점검

레이아웃은 변경 없지만, **각 상태가 한국어로 노출될 때 문구가 빠지거나 어색하지 않은지** 상태별로 점검.

### 9-1. Loading

| 위치 | EN | KO | 체크 |
|------|----|----|------|
| IssuesList 전체 로딩 | `Loading issues…` | `이슈 불러오는 중…` | OK — 마침표 3개 유지 |
| AiRiskAnalysisCard 리프레시 | `Refreshing` | `새로고침 중` | OK — 버튼 폭 충분 |
| AIRunSummaryPanel 초기 | `Analyzing…` / `Analyzing {{count}} results for patterns…` | `분석 중…` / `결과 {{count}}건의 패턴을 분석 중입니다…` | OK — 한국어가 더 짧음 |
| LastSyncedLabel | `Syncing…` | `동기화 중…` | OK |

### 9-2. Empty

| 위치 | EN | KO | 체크 |
|------|----|----|------|
| FailedBlockedCard | `No failed or blocked TCs 🎉` | `실패·차단된 TC 없음 🎉` | OK — 이모지 유지 |
| TopFailTagsCard | `No tags on failed TCs` | `실패 TC에 태그 없음` | OK |
| ContributorsCard | `No contributors yet` | `아직 기여자가 없습니다` | OK — KO 가 더 친근함 (아직 유도) |
| Activity24hFeed | `No activity in the last 24 hours` | `최근 24시간 동안 활동 없음` | OK |
| IssuesList | `No issues linked yet.` + 힌트 | `연결된 이슈가 없습니다.` + 힌트 | OK — 2줄 구조 유지 |
| RiskSignalCard | `Keep running tests to build risk signal.` | `테스트를 더 실행하면 위험 신호를 확인할 수 있습니다.` | OK |
| ExecutionSections (all empty) | `No activity yet` (기존 `executionEmpty`) | `실행 기록 없음` | OK |

### 9-3. Error

| 위치 | EN | KO | 체크 |
|------|----|----|------|
| IssuesList refresh 실패 | `Failed to refresh issues. Retry later.` | `이슈 새로고침에 실패했습니다. 잠시 후 다시 시도해 주세요.` | OK — 존댓말 일관성 |
| RiskInsightContainer banner | `AI analysis failed.` | `AI 분석에 실패했습니다.` | OK |
| RiskInsightContainer rate-limit | `Claude is rate-limited. Try again in {{sec}}s.` | `Claude 속도 제한 중입니다. {{sec}}초 뒤 다시 시도해 주세요.` | OK |
| AIRunSummaryPanel 연결오류 | `Connection error. Please try again.` | `연결 오류가 발생했습니다. 다시 시도해 주세요.` | OK |
| ExecutionSections plan 오류 | `Failed to load plans.` | `플랜 불러오기에 실패했습니다.` | OK |

### 9-4. 제한 도달 (Limit)

| 위치 | EN | KO | 체크 |
|------|----|----|------|
| AI quota banner | `Monthly AI credits exhausted (10/10).` | `월 AI 크레딧 소진 (10/10).` | OK |
| AI tier-too-low | `Upgrade to Hobby to unlock AI analysis.` | `AI 분석을 사용하려면 Hobby 플랜으로 업그레이드하세요.` | OK |
| Viewer / no permission | `Ask your admin to run AI analysis.` | `관리자에게 AI 분석 실행을 요청하세요.` | OK |
| AIRunSummaryPanel tier | `AI Summary requires Starter plan` | `AI 요약은 Starter 플랜부터 사용할 수 있습니다` | OK |
| IssuesList rapid refresh | `Please wait before refreshing again` | `잠시 후 다시 새로고침해 주세요` | OK |

---

## 10. 인터랙션 — 카피 영향 체크

### 10-1. 단축키·액션 연동

| 액션 | EN 버튼/토스트 | KO 버튼/토스트 | 단축키 |
|------|--------------|--------------|-------|
| AI 분석 트리거 | `Analyze with AI →` / `AI analysis ready` | `AI로 분석하기 →` / `AI 분석 완료` | 없음 |
| AI 분석 refresh | `Refresh` / `Analysis refreshed` | `새로고침` / `분석이 갱신되었습니다` | 없음 |
| Issues sync | `Refresh now` / `Synced {{count}} issues` | `지금 새로고침` / `이슈 {{count}}건 동기화됨` | 없음 |
| View all (Failed/Blocked) | `View all →` | `모두 보기 →` | 클릭 시 Issues 탭 이동 |
| Activity view all | `View full activity →` | `전체 활동 보기 →` | 클릭 시 Activity 탭 이동 |
| Re-run failed only | `Re-run Failed ({{count}})` | `실패 재실행 ({{count}})` | 없음 |

### 10-2. Hover title / tooltip

hover title 은 **짧게** (2~5 단어) 유지:

| 위치 | EN title | KO title |
|------|---------|---------|
| AI CTA (disabled, tier low) | `Upgrade to Hobby to unlock AI analysis` | `Hobby로 업그레이드하면 AI 분석 사용 가능` |
| AI CTA (disabled, no TCs) | `Add test cases first to enable AI analysis` | `테스트 케이스를 먼저 추가하세요` |
| AiRiskAnalysisCard low-conf | `Refresh after more runs` | `실행이 더 쌓인 뒤 새로고침` |

---

## 11. 다크모드

**변경 없음.** i18n 리팩토링은 텍스트 교체만이며, 색상 토큰은 건드리지 않는다. 기존 `var(--text-muted)`, `var(--danger-600)`, `var(--violet)` 등 CSS 커스텀 프로퍼티가 light/dark 모두에서 올바르게 작동함을 확인 (현재 프로덕션 검증 완료).

---

## 12. 반응형

**변경 없음.** 단, §1-1 의 텍스트 길이 체크포인트를 따라 한국어 전환 시 모바일(< 768px) 에서 토스트 / 에러 배너가 자동 wrap 되는지 **QA 시 육안 확인** 필수.

---

## 13. 기존 컴포넌트 재사용

### 13-1. 재사용 (수정 없음)

| 컴포넌트 | 위치 | 용도 |
|---------|------|------|
| `StatusPill` | `src/components/StatusPill.tsx` | 내부 라벨이 이미 i18n 적용되어 있는지 **확인 필요** (이번 스코프 외 확정) |
| `StatusBadge` | `src/components/StatusBadge.tsx` | 동일 |
| `ProgressBar` | `src/components/ProgressBar.tsx` | 텍스트 노출 없음 — 변경 없음 |
| `SegmentedBar` | `src/components/SegmentedBar.tsx` | `label` prop 으로 텍스트 주입 — 호출부 (ExecutionSections) 에서 `t()` 적용 |
| `Avatar` | `src/components/Avatar.tsx` | 텍스트 없음 |
| `Toast` (sonner 래퍼) | `src/components/Toast.tsx` | `showToast(msg)` 의 `msg` 를 `t()` 결과로 주입하면 OK. 컴포넌트 자체 수정 불필요 |

### 13-2. 신규 헬퍼

| 헬퍼 | 위치 | 시그니처 |
|-----|------|---------|
| `formatRelativeTime` | `src/lib/issueMetadata.ts` (기존) | **시그니처 변경**: `(iso: string, t: TFunction) => string` — AC-7 |
| `formatShortDate` | `src/lib/dateFormat.ts` (신규) | `(iso: string \| Date, lang?: string) => string` — `Intl.DateTimeFormat` 래퍼 |

### 13-3. 신규 컴포넌트

**없음.** 이 Dev Spec 은 순수 카피 교체 리팩토링이다.

---

## 14. 토스트 메시지 전량 (en/ko)

dev-spec 1차 스코프에 속하는 **모든 `showToast()` 호출의 메시지**를 한 곳에 모아둔다. 개발자가 파일 여러 개를 오가지 않고 토스트만 일괄 교체할 수 있도록.

| # | 파일 | EN | KO | 타입 | 키 |
|---|------|----|----|------|---|
| 1 | milestone-detail/page.tsx | Failed to update milestone. | 마일스톤 수정에 실패했습니다. | error | `milestones.toast.updateFailed` |
| 2 | RiskInsightContainer | Add test cases first to enable AI analysis. | AI 분석을 사용하려면 먼저 테스트 케이스를 추가하세요. | info | `milestones.aiRisk.needTcs` |
| 3 | RiskInsightContainer | Upgrade to Hobby to unlock AI analysis. | AI 분석을 사용하려면 Hobby 플랜으로 업그레이드하세요. | info | `milestones.aiRisk.upgradeToHobby` |
| 4 | RiskInsightContainer | Monthly AI credits exhausted. | 월 AI 크레딧이 소진되었습니다. | error | `milestones.aiRisk.quotaExhausted` |
| 5 | RiskInsightContainer | Analysis refreshed | 분석이 갱신되었습니다 | success | `milestones.toast.analysisRefreshed` |
| 6 | RiskInsightContainer | AI analysis ready | AI 분석 완료 | success | `milestones.toast.analysisReady` |
| 7 | RiskInsightContainer | AI analysis timed out. | AI 분석 시간이 초과되었습니다. | error | `milestones.aiRisk.error.timeoutShort` |
| 8 | RiskInsightContainer | Claude is rate-limited. Try again in {{sec}}s. | Claude 속도 제한 중입니다. {{sec}}초 뒤 다시 시도해 주세요. | error | `milestones.aiRisk.error.rateLimitToast` |
| 9 | RiskInsightContainer | AI returned unexpected format. | AI 응답 형식이 잘못되었습니다. | error | `milestones.aiRisk.error.parseToast` |
| 10 | RiskInsightContainer | Network error while analyzing. | 분석 중 네트워크 오류가 발생했습니다. | error | `milestones.aiRisk.error.networkToast` |
| 11 | RiskInsightContainer | Upgrade to unlock AI analysis. | 업그레이드하면 AI 분석을 사용할 수 있습니다. | info | `milestones.aiRisk.error.upgradeToast` |
| 12 | RiskInsightContainer | Something went wrong. | 문제가 발생했습니다. | error | `common.toast.somethingWentWrong` |
| 13 | IssuesList | Please wait before refreshing again | 잠시 후 다시 새로고침해 주세요 | info | `common.issues.debounceWait` |
| 14 | IssuesList | Failed to refresh issues. Retry later. | 이슈 새로고침에 실패했습니다. 잠시 후 다시 시도해 주세요. | error | `common.issues.refreshFailed` |
| 15 | IssuesList | Synced {{count}} issues | 이슈 {{count}}건 동기화됨 | success | `common.issues.syncedCount` |
| 16~47 | AIRunSummaryPanel | (§7-20 전부) | (§7-20 전부) | 혼합 | `runs.aiSummary.toast.*` |

---

## 15. 개발 착수 전 체크리스트

- [x] 모든 상태가 정의되었는가 (정상 / Empty / Loading / Error / Limit) — §9
- [x] Tailwind 클래스가 구체적으로 명시되었는가 — **레이아웃 무변경이므로 N/A, 대신 텍스트 길이 체크포인트 §1-1** 로 대체
- [x] 다크모드 색상 매핑이 있는가 — §11 (변경 없음)
- [x] 기존 컴포넌트 재사용 목록이 있는가 — §13
- [x] 인터랙션 (클릭, 호버, 키보드)이 정의되었는가 — §10
- [x] 반응형 브레이크포인트별 변경점이 있는가 — §12 (변경 없음 + QA 체크)
- [x] 토스트 메시지가 en/ko 모두 있는가 — §14
- [x] 개발지시서와 수용 기준이 일치하는가
  - AC-1 (하드코딩 0) → 파일별 §7.1~7.20 커버리지
  - AC-2 (useTranslation 바인딩) → §8 판단 트리
  - AC-3 (en/ko parity) → §7 각 표에 양쪽 값 모두 있음
  - AC-4 (scan 0건) → §3-1 브랜드명 / §14 토스트 전량
  - AC-6 (plural) → §5-1
  - AC-7 (relative time 공통 헬퍼) → §4-1
  - AC-8 (fallback) → §8 판단 트리 (e)
  - AC-9 (AI 응답 비번역) → §6
  - AC-10 (≤180 신규 키) → §7 각 파일 요약 + §7.20 경고

---

## 16. 총 신규 키 추정

| 네임스페이스 | 파일 | 신규 키 추정 |
|------------|------|-----------|
| `common.time.*` | (전역) | 7 |
| `common.issues.*` | IssuesList / LastSyncedLabel / IssueAssignee / IssuePriorityBadge / IssueStatusBadge | 30 (기존 13 재사용 제외) |
| `common.toast.*` | 전역 | 3 |
| `common.weekday.short.*` | VelocitySparkline | 7 |
| `milestones.detail.overview.kpi.*` | KpiStrip | 7 |
| `milestones.detail.overview.burndown.*` | BurndownChart | 0 (전부 기존 재사용) |
| `milestones.detail.overview.failedBlocked.*` | FailedBlockedCard | 4 |
| `milestones.detail.overview.velocity.*` | VelocitySparkline | 3 |
| `milestones.detail.overview.topFailTags.*` | TopFailTagsCard | 3 |
| `milestones.detail.overview.contributors.*` | ContributorsCard | 3 |
| `milestones.detail.overview.activity.*` | Activity24hFeed / OverviewTab | 14 |
| `milestones.detail.overview.sections.*` | ExecutionSections | 15 |
| `milestones.detail.overview.riskBullet.*` | OverviewTab | 5 |
| `milestones.riskSignal.a11y.*` | RiskSignalCard | 1 |
| `milestones.aiRisk.*` (추가) | AiRiskAnalysisCard / RiskInsightContainer | 22 |
| `milestones.toast.*` | page.tsx / RiskInsightContainer | 3 |
| `runs.aiSummary.*` | AIRunSummaryPanel | 68 |
| **합계 (신규)** | | **~195** |

> **⚠️ AC-10 한도(180) 초과 리스크.** AIRunSummaryPanel 을 풀 커버리지 할 경우 195. Dev-spec §9 에 명시된 "Share / Jira / GitHub 폼" 섹션을 **2차 스코프 분리**하면 약 -35 감소하여 160 수준으로 떨어져 AC-10 만족. @planner 와 협의 후 범위 조정 필요.
>
> **대안:**
> 1. AIRunSummaryPanel 에서 Slack/Email Share 서브패널만 2차로 분리 (약 -15)
> 2. AIRunSummaryPanel 에서 Jira/GitHub 인라인 폼까지 2차로 분리 (약 -35)
> 3. 전량 1차에 포함시키고 AC-10 한도를 220으로 상향 (dev-spec 수정)

---

## 17. Reviewer 체크리스트 (@marketer / CEO 용)

KO 원어민 리뷰 필요 항목 — 톤이 부자연스러운지, 업계 용어가 어색한지 확인:

- [ ] "번다운" — 번역 대신 음역이 QA/PM 업계 표준인가?
- [ ] "속도" vs "벨로시티" — 개발팀 내부 표준 용어?
- [ ] "심각 / 주의 / 정상 진행" — risk level 3단계 문구가 위협적이지 않은가?
- [ ] "크레딧" 음역이 "토큰" / "사용량" 보다 자연스러운가?
- [ ] "AI로 분석하기" / "AI 분석" — AI 앞뒤 조사 처리?
- [ ] "탐색" (Exploratory) vs "디스커버리 로그" (common nav) — 용어 불일치 있음, 2차 정리 대상
- [ ] "런" (sections.runs) vs "실행" (신규 키) — 혼용 있음, 3차 정리 대상
- [ ] `{{count}}건` 반복 — 한국어에서 "건" 남발은 어색한가? (대안: "개", "회")
- [ ] 이모지 유지 (🎉) — KO 사용자에게 적절한가?

---

## 18. 후속 작업

- [ ] @marketer 1차 문구 리뷰 (위 §17)
- [ ] 2차 Dev Spec(plan-detail / run-detail page.tsx) 기획 시 이 Design Spec의 §2 톤앤매너 · §3 고유명사 · §4 표기 규칙을 **그대로 재사용**
- [ ] Share / Jira / GitHub 서브패널의 1차/2차 스코프 분리 결정 (§16 경고 대응)
- [ ] `docs/i18n-guide.md` 신규 작성 시 §8 판단 트리 그대로 이식
- [ ] AI 응답 locale 주입(`f013`) 티켓 생성 시 §6 정책 문서 링크
