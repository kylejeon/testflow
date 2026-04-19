# Dev Spec: Milestone AI Risk Insight (Hybrid: Rule-based Quick Signal + On-Demand Claude Analysis)

> **작성일:** 2026-04-19
> **작성자:** @planner
> **상태:** Draft → Review → Approved
> **관련 디자인:** `docs/specs/design-spec-milestone-ai-risk-insight.md` (작성 예정 — @designer 인수인계)
> **선행 Dev Spec:** `docs/specs/dev-spec-milestone-overview-redesign.md` (Overview 3탭 구조, Intel 그리드)
> **영향 범위:** `src/pages/milestone-detail/`, `supabase/functions/milestone-risk-predictor/` (신규), `supabase/functions/_shared/ai-config.ts`, `src/hooks/useAiFeature.ts`, `supabase/migrations/`

---

## 1. 개요

### 문제
현재 Milestone Overview의 "AI Risk Insight" 카드는 **이름만 AI이고 실제 Claude API 호출이 0건**이다. `OverviewTab.tsx:208-225`에서 `daysLeft <= 3 && passRate < 50` 같은 하드코딩된 if/else 규칙만 돌고 있어 유저가 "AI"라는 라벨을 신뢰할 수 없고, Sparkling 아이콘이 과대광고로 비칠 수 있다.

### 해결 (옵션 C — 하이브리드)
1. **기본 상태**는 rule-based 카드를 **"Risk Signal" (non-AI 브랜딩)**으로 리네이밍해 즉시 표시 — 0 credit 소모, 빠른 로드.
2. **"Analyze with AI" 버튼** 클릭 시에만 신규 Edge Function `milestone-risk-predictor`를 호출해 **실제 Claude API**로 milestone 맥락 기반 심층 리포트 생성.
3. 결과는 `milestones.ai_risk_cache` JSONB에 **24시간 TTL**로 캐시. 페이지 재방문 시 로딩 없이 표시.

### 성공 지표
- AI Risk Insight 카드에 "AI" 라벨이 붙은 결과의 **Claude API 실제 호출률 100%** (기존 0%에서 개선)
- Analyze with AI 버튼 전환율 (Overview 방문자 중) 월 평균 15% 이상
- Rule-based → AI 전환 후 "This recommendation is useful" 피드백(추가 별도 개발 아님, Sentry custom event) 70% 이상
- 동일 milestone 재조회 시 캐시 hit rate 80% 이상 (24h 내 중복 호출 최소화 → 비용 절감)

---

## 2. 유저 스토리

- As an **Owner (구독 결정권자)**, I want the "AI" label to only appear on truly AI-generated output, so that I can trust what I pay for and demonstrate genuine AI value to my team.
- As a **Manager running a project-critical milestone**, I want to click "Analyze with AI" to get Claude-powered recommendations (bullets + actions) that reference my actual failed TCs and top-fail tags, so that I can decide whether to extend the deadline or redistribute work.
- As a **Tester on the team (Viewer-level permission)**, I want to read existing AI analysis results that my Manager already generated, so that I understand the milestone health without consuming AI credits myself.
- As a **Free-plan user** evaluating Testably, I want to see a clear "Upgrade to Hobby" CTA on the AI analysis button instead of a broken experience, so that I know the upgrade path.
- As a **Professional-plan user**, I want to Refresh the AI analysis with a force_refresh option when new data comes in, so that I can override the 24h cache after major execution events.

---

## 3. 수용 기준 (Acceptance Criteria)

### 네이밍 & UI 분리

- [ ] **AC-1:** Overview Intel 그리드의 기존 "AI Risk Insight" 카드 이름(`OverviewTab.tsx` + `AiRiskInsight.tsx`)이 **"Risk Signal"** (EN) / **"위험 신호"** (KO)로 리네임되고, Sparkling 아이콘(`ri-sparkling-2-line`)이 Pulse 아이콘(`ri-pulse-line`)으로 교체된다. "AI" 단어는 rule-based 카드 어디에도 노출되지 않는다.
- [ ] **AC-2:** Risk Signal 카드 하단에 **"Analyze with AI →"** 버튼이 렌더링된다 (아이콘 `ri-sparkling-2-line` 유지, 라벨 i18n 키 `milestones.aiRisk.analyzeCta`).

### 실제 AI 호출

- [ ] **AC-3:** "Analyze with AI" 버튼 클릭 시 `supabase.functions.invoke('milestone-risk-predictor', { body: { milestone_id, force_refresh: false } })`가 호출되고, 버튼 영역이 로딩 상태("Analyzing with Claude…" + 스피너)로 전환된다. 로딩 상태는 최소 **500ms** 표시해 플리커 방지.
- [ ] **AC-4:** Edge Function이 200을 반환하면 카드가 **"AI Risk Analysis"** 타이틀로 교체되고, `risk_level` / `confidence` / `summary` / `bullets[]` / `recommendations[]` 5개 섹션이 렌더링된다. Sparkling 아이콘 재등장.
- [ ] **AC-5:** AI 분석 완료 후 카드 상단에 **"Last analyzed: Xm ago · Refresh →"** 메타 라인이 표시되고, Refresh 클릭 시 `force_refresh: true`로 재호출한다 (Owner/Admin/Manager만).
- [ ] **AC-6:** 호출 실패 시 카드는 rule-based "Risk Signal" 상태로 자동 복귀하고, 카드 하단에 "AI analysis failed: {error_message}" 빨간 경고 텍스트와 "Retry" 링크가 표시된다. 에러 토스트는 중복 억제(최근 10초 내 동일 error_code 1회만).

### 캐시 동작

- [ ] **AC-7:** Edge Function은 `milestones.ai_risk_cache` JSONB를 읽어 `generated_at`이 **24시간 이내**이고 `force_refresh !== true`면 **Claude API 호출 없이** 캐시를 반환하며, 응답 `meta.from_cache = true`를 포함한다.
- [ ] **AC-8:** Milestone Detail 페이지 초기 로드 시 `milestones.ai_risk_cache`가 존재하고 stale이 아니면 **버튼 클릭 없이 AI 결과 카드가 기본 렌더링**된다. "Last analyzed: Xm ago" 표시는 유지.
- [ ] **AC-9:** `force_refresh: true` 요청은 캐시를 bypass하되, 성공 시 `milestones.ai_risk_cache`를 overwrite한다.

### 플랜별 제한

- [ ] **AC-10:** Free 티어 사용자(tier=1)는 "Analyze with AI" 버튼이 비활성(`disabled`)이고, 호버 시 툴팁 "Upgrade to Hobby to unlock AI analysis" 표시. 버튼 오른쪽 작은 "Upgrade" chip이 `/settings/billing`으로 이동.
- [ ] **AC-11:** Hobby~Professional 티어는 월 credit 한도 내에서만 호출 성공. 한도 초과 시 Edge Function이 429 반환하고, 프론트는 카드에 "Monthly AI credit limit reached ({used}/{limit}). Upgrade for more." 배너 표시.
- [ ] **AC-12:** Enterprise 티어(tier ≥ 5)는 월 한도 무제한(`PLAN_LIMITS[5] = -1`) 이지만, Edge Function 레벨에서 **사용자당 1분당 5회 rate limit**을 초과하면 429 반환 (`_shared/rate-limit.ts` 재사용).

### RBAC

- [ ] **AC-13:** Owner / Admin / Manager 역할은 "Analyze with AI" 및 "Refresh" 버튼 활성.
- [ ] **AC-14:** Tester / Viewer 역할은 기존 AI 결과 카드 읽기 가능. "Analyze with AI" 버튼은 숨김 처리(null 렌더) — 대신 "Ask your admin to run AI analysis" 텍스트 표시. "Refresh" 버튼도 숨김.
- [ ] **AC-15:** Guest 역할은 Milestone Detail 자체 접근 불가 (기존 RLS 정책 상속).

### 데이터 일관성

- [ ] **AC-16:** AI 분석 input context에 최소 다음 10개 항목이 포함된다: milestone name, start/end date, D-day, TC stats (passed/failed/blocked/retest/untested/passRate), velocity7d 배열, topFailTags[] top 5, failedBlockedTcs[] top 10, subMilestones 진행률 리스트, 최근 7일 activity count.
- [ ] **AC-17:** Edge Function은 Claude 응답을 JSON으로 파싱 실패하면 500 대신 **422 Unprocessable Entity** + `{ error: 'ai_parse_failed' }` 반환. 프론트는 AC-6과 동일하게 rule-based fallback.
- [ ] **AC-18:** milestone이 삭제되면 FK CASCADE로 `ai_risk_cache`도 함께 제거된다 (JSONB 컬럼이므로 자동 — 별도 정리 불필요).

---

## 4. 기능 상세

### 4-1. 동작 흐름 (Flow)

#### Happy Path — 최초 AI 분석

1. 유저(Manager)가 Milestone Detail Overview 탭 진입
2. Intel 그리드에 **"Risk Signal"** rule-based 카드가 즉시 렌더링 (현재 `riskLevel` / `aiBullets` 로직 그대로)
3. 카드 하단 "Analyze with AI →" 버튼 노출
4. 유저가 버튼 클릭
5. 프론트: 버튼 → 스피너 "Analyzing with Claude… (up to 30s)" 전환
6. `supabase.functions.invoke('milestone-risk-predictor', { body: { milestone_id: <id>, force_refresh: false } })`
7. Edge Function:
   - Auth 검증 → userId 추출
   - `getEffectiveTier(userId)` → tier 확인 (Free 차단)
   - `AI_FEATURES.milestone_risk` 참조 (minTier=2, creditCost=2)
   - 월 credit 사용량 확인 (한도 초과 시 429)
   - `milestones.ai_risk_cache` 조회 → `generated_at > now() - 24h`면 즉시 반환 (`from_cache: true`)
   - 캐시 없거나 stale: 마일스톤 context 수집 (TC stats, top-fail tags, failed/blocked TCs, sub milestones, activity)
   - Claude Haiku API 호출 (`claude-haiku-4-5-20251001`, max_tokens 1024, temperature 0)
   - JSON 파싱 → `milestones.ai_risk_cache` JSONB UPDATE
   - `ai_generation_logs`에 credit 차감 로그 insert (mode='milestone-risk')
   - Response 반환
8. 프론트: 스피너 → **"AI Risk Analysis"** 카드로 전환
9. 카드 상단 "Last analyzed: just now · Refresh →" 표시
10. `risk_level` 뱃지 (on_track/at_risk/critical) + `confidence %` + `summary` + `bullets` 3-5개 + `recommendations` 2-4개 렌더

#### Happy Path — 캐시 Hit (재방문)

1. 유저가 같은 Milestone Detail에 **24시간 내 재방문**
2. Milestone Detail의 `loadMilestoneDetailData` queryFn이 `milestones.*` SELECT 시 `ai_risk_cache`도 함께 가져옴
3. Overview 탭 렌더 시 프론트가 `milestone.ai_risk_cache?.generated_at`을 확인 → stale 아니면 AI 결과 카드를 기본 렌더
4. "Last analyzed: 2h ago · Refresh →" 표시
5. (버튼 클릭 없이도 AI 카드 표시 완료 — Edge Function 호출 0건)

#### Alternative — Force Refresh

1. 유저가 "Refresh →" 클릭 (Owner/Admin/Manager만 클릭 가능)
2. `supabase.functions.invoke('milestone-risk-predictor', { body: { milestone_id, force_refresh: true } })`
3. Edge Function이 캐시 무시 → Claude 재호출 → 캐시 overwrite
4. 프론트 refetch → 새 결과 표시

#### Error Flow — Claude Timeout

1. Claude API가 30s 초과 (Edge Function 자체 timeout)
2. Edge Function이 504 반환 + `{ error: 'ai_timeout' }`
3. 프론트: 카드가 rule-based Risk Signal로 복귀 + "AI analysis timed out. Retry →" 경고 텍스트
4. 기존 캐시가 있으면 그 캐시를 fallback으로 유지 (덮어쓰지 않음)

#### Error Flow — Rate Limit 초과

1. Claude API가 429 반환 (Anthropic rate limit)
2. Edge Function이 429 + `{ error: 'upstream_rate_limit', retry_after_sec: 60 }` 반환
3. 프론트: 카드에 "Claude is rate-limited. Try again in 1 minute." 표시 + 60초 후 Retry 버튼 자동 활성

#### Error Flow — 플랜 월 한도 초과

1. Edge Function이 credit 차감 전 체크 → 429 + `{ error: 'monthly_limit_reached', used, limit, upgradeUrl }`
2. 프론트: 카드에 "Monthly AI credits exhausted (15/15). Upgrade →" 업그레이드 배너

#### Error Flow — JSON 파싱 실패

1. Claude 응답이 JSON 스키마와 맞지 않음
2. Edge Function이 422 + `{ error: 'ai_parse_failed', raw_snippet }` 반환
3. 프론트: rule-based fallback + "AI returned unexpected format. Try again." 경고

### 4-2. 비즈니스 규칙

| 규칙 ID | 규칙 | 비고 |
|---------|------|------|
| BR-1 | Rule-based "Risk Signal" 카드는 **AI 기능과 무관하게 항상 렌더**. Claude API 상태, 플랜, 권한 전부 체크하지 않는다. | 0 비용, 항상 가치 제공 |
| BR-2 | `milestones.ai_risk_cache.generated_at`이 `now() - 24h`보다 오래되면 **stale**로 간주, 자동 캐시 bypass. | TTL 24h 고정 |
| BR-3 | milestone 데이터 없음 (`tcStats.total === 0`) 시 AI 분석 불가. 버튼을 `disabled` + 툴팁 "Add test cases first". | API 호출 낭비 방지 |
| BR-4 | 한 milestone에 동시 Refresh 요청이 들어오면, Edge Function은 **advisory lock**(`pg_try_advisory_xact_lock(milestone_id_hash)`)으로 2번째 요청을 block하지 않고 **첫 요청 결과가 캐시된 직후 그걸 반환**. | Race condition 방지 |
| BR-5 | Claude 응답의 `bullets.length`는 3~5개, `recommendations.length`는 2~4개. 범위 벗어나면 Edge Function이 잘라냄 (slice). | UI 레이아웃 안정 |
| BR-6 | `confidence < 40`인 경우 UI에서 경고 배지 "Low confidence — consider refreshing after more runs". | 유저 기대치 관리 |

### 4-3. 권한 (RBAC)

| 역할 | rule-based Risk Signal 카드 조회 | AI 결과 카드 조회 (캐시 있을 때) | "Analyze with AI" 클릭 | "Refresh" 클릭 |
|------|------|------|------|------|
| Owner | ✓ | ✓ | ✓ | ✓ |
| Admin | ✓ | ✓ | ✓ | ✓ |
| Manager | ✓ | ✓ | ✓ | ✓ |
| Tester | ✓ | ✓ | ✗ (버튼 숨김) | ✗ (버튼 숨김) |
| Viewer | ✓ | ✓ | ✗ (버튼 숨김) | ✗ (버튼 숨김) |
| Guest | ✗ (Milestone Detail 접근 불가) | ✗ | ✗ | ✗ |

프론트는 `usePermission(projectId).can('use_ai')` (기존 hook, level≥3=tester+ 반환) 대신 **신규 액션** `'trigger_ai_analysis'`를 `PERMISSION_LEVEL`에 추가해 **level≥4(manager+)** 로 설정.

### 4-4. 플랜별 제한

| 플랜 (tier) | Minimum for AI 분석 | 월 credit 한도 (기존 `PLAN_LIMITS`) | creditCost 1회 호출 | 월 호출 가능 수 | 초과 시 동작 |
|------|------|-------------|-------------|-------------|-------------|
| Free (1) | ✗ 차단 | 3 | — | 0 | 버튼 disabled + "Upgrade to Hobby" 툴팁 |
| Hobby (2) | ✓ | 15 | 2 | 최대 **7회/월** (다른 AI 기능과 공유) | 429 반환 + "Upgrade to Starter" 배너 |
| Starter (3) | ✓ | 30 | 2 | 최대 **15회/월** (공유) | 429 반환 |
| Professional (4) | ✓ | 150 | 2 | 최대 **75회/월** (공유) + rate limit 5/min | 429 반환 |
| Enterprise S·M·L (5/6/7) | ✓ | -1 (무제한) | 2 | 무제한 (rate limit 5/min) | rate limit 초과 시 429 + retry_after |

**`ai-config.ts`에 신규 `milestone_risk` feature 추가:**
```typescript
milestone_risk: {
  minTier: 2,           // Hobby 이상
  creditCost: 2,        // milestone context가 plan보다 크므로 2 credit (burndown_insight와 동일)
  label: 'AI Milestone Risk',
  mode: 'milestone-risk',
},
```

사용량 카운트는 **기존 `ai_generation_logs` 테이블 활용** — `step=1`, `mode='milestone-risk'`, `credits_used=2`로 insert. `getMonthlyUsage()` 함수(`risk-predictor/index.ts:94-110`)가 그대로 재사용 가능 (mode와 무관하게 `credits_used` SUM).

---

## 5. 데이터 설계

### 신규 테이블
없음.

### 기존 테이블 변경

| 테이블 | 변경 내용 | 마이그레이션 필요 |
|--------|---------|----------------|
| `milestones` | `ai_risk_cache JSONB NULL` 컬럼 추가 | Y |

**마이그레이션 파일:** `supabase/migrations/20260420_milestone_ai_risk_cache.sql`

```sql
-- Milestone AI Risk Insight 캐시 컬럼
-- 24h TTL, milestone-risk-predictor Edge Function이 read/write
ALTER TABLE milestones
  ADD COLUMN IF NOT EXISTS ai_risk_cache JSONB NULL;

COMMENT ON COLUMN milestones.ai_risk_cache IS
  'Claude-generated risk analysis result. Structure: { generated_at, stale_after, risk_level, confidence, summary, bullets[], recommendations[], meta }. TTL 24h — considered stale if generated_at < now() - 24h. NULL = no analysis run yet.';

-- generated_at 빠른 비교용 index (필수는 아니지만 milestone 많은 경우 유용)
-- JSONB 내부 필드 인덱스는 expression index 사용
CREATE INDEX IF NOT EXISTS idx_milestones_ai_risk_generated_at
  ON milestones ((ai_risk_cache->>'generated_at'))
  WHERE ai_risk_cache IS NOT NULL;
```

### `ai_risk_cache` JSONB 구조 (스키마 레벨에서 고정)

```json
{
  "generated_at": "2026-04-19T14:30:00.000Z",
  "stale_after": "2026-04-20T14:30:00.000Z",
  "risk_level": "at_risk",
  "confidence": 72,
  "summary": "Milestone is at risk due to 8 failing TCs concentrated in the login flow tag.",
  "bullets": [
    "Pass rate dropped from 82% to 67% over the last 7 days.",
    "Top fail tag #auth has 5 unresolved failures, all in critical priority.",
    "Velocity averaged 4.2 TCs/day — needs 6.8/day to hit target.",
    "2 sub-milestones are flagged past_due (M-12, M-17)."
  ],
  "recommendations": [
    "Prioritise fixing the 3 critical auth TCs: TC-105, TC-112, TC-119.",
    "Consider extending target date by 3 days or descoping M-17's 12 TCs.",
    "Assign a second tester to the auth flow to unblock blocked TC-108."
  ],
  "meta": {
    "model": "claude-haiku-4-5-20251001",
    "tokens_used": 1842,
    "latency_ms": 4320,
    "input_snapshot": {
      "total_tcs": 120,
      "pass_rate": 67,
      "days_left": 5
    }
  }
}
```

### RLS 정책

기존 `milestones` 테이블의 RLS 정책이 **그대로 상속**된다. milestone 소유 프로젝트 멤버만 SELECT 가능 — `ai_risk_cache`는 JSONB 컬럼이므로 별도 RLS 불필요.

UPDATE는 **Edge Function만** (`SUPABASE_SERVICE_ROLE_KEY`로 service role client 사용, RLS bypass). 일반 유저의 직접 UPDATE는 기존 milestones UPDATE 정책(tester+ 이상)을 따라 가능은 하지만 프론트에서 시도하지 않음.

```sql
-- 정책 변경 없음. 아래는 참고용 (기존 milestones 테이블 RLS 요약):
--
-- SELECT: project_members에 속한 유저
-- INSERT/UPDATE/DELETE: role IN ('owner', 'admin', 'manager', 'tester')
--
-- ai_risk_cache는 milestones의 일부 컬럼이므로 위 정책이 그대로 적용.
-- Edge Function은 service role로 RLS bypass하여 UPDATE.
```

### 기존 `ai_generation_logs` 활용

새 로그 row:
```sql
INSERT INTO ai_generation_logs (user_id, project_id, mode, step, credits_used, input_data, output_data, tokens_used, latency_ms)
VALUES (
  <user_id>, <project_id>,
  'milestone-risk',  -- 신규 mode 값
  1,
  2,
  '{"milestone_id": "...", "total_tcs": 120, ...}'::jsonb,
  '{"risk_level": "at_risk", ...}'::jsonb,
  1842, 4320
);
```

---

## 6. API 설계

### 선택: 옵션 나 — 신규 `milestone-risk-predictor` Edge Function

**선택 근거:**
- 기존 `risk-predictor/index.ts`는 **`plan_id` 단일 파라미터 중심**으로 `test_plan_test_cases` 조인 로직이 하드코딩되어 있다 (lines 205-208, 287-331 프롬프트).
- Milestone은 **plans + direct runs + sub-milestones**의 세 축 집계가 필요해, 기존 함수에 `milestone_id` 파라미터를 추가하면 내부 조건 분기가 2배로 늘고 프롬프트 템플릿도 두 벌이 된다 — 유지보수 부담 증가.
- 또한 `ai_generation_logs.mode`가 현재 'risk-predictor' 하나라, 두 기능의 사용량 추적/청구 분리가 어려워진다.
- 분리된 Edge Function은 독립 배포·독립 로깅·독립 캐시 전략을 가능하게 하며, 추후 Milestone 전용 컨텍스트(sub-milestones 진행률, cross-plan velocity)를 추가하기 좋다.

**엔드포인트:** `POST /functions/v1/milestone-risk-predictor`

**Auth:** Supabase JWT Bearer (기존 `risk-predictor` 와 동일 패턴 — lines 131-158 복사 가능)

**Request:**
```json
{
  "milestone_id": "uuid",
  "force_refresh": false
}
```

**Response (성공, 캐시 miss → Claude 호출):**
```json
{
  "risk_level": "on_track | at_risk | critical",
  "confidence": 72,
  "summary": "string",
  "bullets": ["string", "..."],
  "recommendations": ["string", "..."],
  "generated_at": "2026-04-19T14:30:00.000Z",
  "meta": {
    "from_cache": false,
    "credits_used": 2,
    "credits_remaining": 13,
    "monthly_limit": 15,
    "tokens_used": 1842,
    "latency_ms": 4320
  }
}
```

**Response (캐시 hit):**
위와 동일 JSON이지만 `meta.from_cache: true`, `meta.credits_used: 0`, `meta.latency_ms: <10ms`.

**Response (에러):**
```json
{
  "error": "monthly_limit_reached | ai_timeout | ai_parse_failed | upstream_rate_limit | tier_too_low | not_found | unauthorized",
  "detail": "human-readable message",
  "used": 15,
  "limit": 15,
  "retry_after_sec": 60,
  "upgradeUrl": "https://testably.app/pricing"
}
```

**Status codes:**
| 상황 | HTTP |
|------|------|
| 정상 | 200 |
| Auth 실패 | 401 |
| tier 미달 | 403 |
| milestone 없음 | 404 |
| 월 한도 초과 | 429 |
| Claude rate limit | 429 |
| Claude timeout (30s 초과) | 504 |
| Claude JSON 파싱 실패 | 422 |
| 기타 | 500 |

### Claude 프롬프트 템플릿 초안

**System prompt:**
```
You are an expert QA risk analyst embedded in a test management platform.
Given a milestone's execution data, analyze risks and recommend actions.
Respond ONLY with valid JSON matching the specified schema. No markdown, no prose wrapper.
Be data-driven, cite specific TC IDs and tags. Avoid generic advice.
```

**User prompt (변수는 Edge Function에서 치환):**
```
Milestone: "{name}"
Status: {status} | Priority: N/A (milestone-level)
Start: {start_date} | End: {end_date} | D-day: {days_left}

Execution Summary:
- Total TCs: {total}
- Passed: {passed} | Failed: {failed} | Blocked: {blocked} | Retest: {retest} | Untested: {untested}
- Pass Rate (of executed): {pass_rate}%
- Velocity (last 7 days, TCs/day): [{v1}, {v2}, {v3}, {v4}, {v5}, {v6}, {v7}] — avg {avg}/day
- Required velocity to hit deadline: {required_velocity}/day

Top-Fail Tags (count of failed TCs):
- #{tag1} ({count1})
- #{tag2} ({count2})
...

Failed / Blocked TCs (top 10 by recency):
- [failed] TC-105 "Login with SSO" (Run: Sprint 23 Run 2)
- [blocked] TC-108 "MFA fallback" (Run: Sprint 23 Run 2)
...

Sub-Milestones ({count_sub} total):
- M-12 "Auth subsystem" — 45% (past_due)
- M-17 "Billing polish" — 60% (started)
...

Recent Activity (last 7 days):
- {activity_count} events ({pct_note}% notes, {pct_result}% test results)

Return this exact JSON structure (no markdown, no surrounding text):
{
  "risk_level": "on_track" | "at_risk" | "critical",
  "confidence": <0-100 integer>,
  "summary": "<1 sentence, max 140 chars>",
  "bullets": ["<observation 1>", "<observation 2>", "<observation 3>"],  // 3-5 items
  "recommendations": ["<action 1>", "<action 2>"]  // 2-4 items, actionable + cite TC IDs when possible
}

Rules:
- risk_level = "critical" if days_left <= 3 AND pass_rate < 50
- risk_level = "at_risk" if days_left <= 7 AND pass_rate < 70
- risk_level = "on_track" otherwise
- confidence < 50 if untested > 50% of total
- Bullets must reference specific numbers, tags, or TC IDs — no generic statements
- Recommendations must be actionable within 1-3 days and cite priority when relevant
```

**Claude API 설정:**
```typescript
{
  model: 'claude-haiku-4-5-20251001',  // risk-predictor와 동일. 비용 절감
  max_tokens: 1024,
  temperature: 0,  // deterministic for caching stability
  system: systemPrompt,
  messages: [{ role: 'user', content: userPrompt }],
}
```

**Edge Function timeout:** 30s (Supabase Edge Function 기본 25s이므로 Deno fetch에 `AbortController` 20s 설정하고 그 후 5s 버퍼로 cache write까지 마무리).

### 프론트 쿼리

**Milestone 로드 시 `ai_risk_cache` 포함:**
```typescript
// src/pages/milestone-detail/page.tsx (기존 query 확장)
const { data: milestone } = await supabase
  .from('milestones')
  .select('*, ai_risk_cache')  // 기존 * 이면 이미 포함됨 — 확인만
  .eq('id', milestoneId)
  .single();
```

**Edge Function 호출:**
```typescript
// src/pages/milestone-detail/useMilestoneAiRisk.ts (신규 훅)
const mutation = useMutation({
  mutationFn: async (force: boolean) => {
    const { data, error } = await supabase.functions.invoke('milestone-risk-predictor', {
      body: { milestone_id: milestoneId, force_refresh: force },
    });
    if (error) throw error;
    return data;
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['milestone-detail', milestoneId] });
  },
});
```

---

## 7. 영향 범위 (변경 파일 목록)

### 신규 파일

| 파일 | 역할 |
|------|------|
| `supabase/functions/milestone-risk-predictor/index.ts` | Edge Function 본체 (risk-predictor 구조 참조) |
| `supabase/functions/milestone-risk-predictor/config.toml` | Deno 설정 (risk-predictor 것 복사) |
| `supabase/migrations/20260420_milestone_ai_risk_cache.sql` | `milestones.ai_risk_cache` 컬럼 추가 마이그레이션 |
| `src/pages/milestone-detail/RiskSignalCard.tsx` | rule-based 카드 (현 `AiRiskInsight.tsx` 기능 이관 + 리네임) |
| `src/pages/milestone-detail/AiRiskAnalysisCard.tsx` | AI 분석 결과 카드 (신규) |
| `src/pages/milestone-detail/RiskInsightContainer.tsx` | 두 카드 상태 전환 관리 컨테이너 |
| `src/pages/milestone-detail/useMilestoneAiRisk.ts` | Mutation/캐시 읽기 훅 |

### 수정 파일

| 파일 | 변경 내용 |
|------|---------|
| `src/pages/milestone-detail/OverviewTab.tsx` | `<AiRiskInsight />` 를 `<RiskInsightContainer />` 로 교체. `aiBullets`/`riskLevel` 계산 로직은 `RiskSignalCard`로 이동. |
| `src/pages/milestone-detail/AiRiskInsight.tsx` | **삭제** (기능은 RiskSignalCard/AiRiskAnalysisCard로 분리됨). Git에서 완전 제거. |
| `src/pages/milestone-detail/page.tsx` | `loadMilestoneDetailData` queryFn의 `milestones.select('*')` 이 `ai_risk_cache`도 fetching 하는지 확인 (기본적으로 `*`이므로 자동 포함됨). 필요 시 타입 정의에 `ai_risk_cache?: any` 추가. |
| `supabase/functions/_shared/ai-config.ts` | `AI_FEATURES.milestone_risk` entry 추가 (§4-4 참조) |
| `src/hooks/useAiFeature.ts` | 동일하게 `AI_FEATURES.milestone_risk` entry 추가 (프론트 미러) |
| `src/hooks/usePermission.ts` | `PERMISSION_LEVEL.trigger_ai_analysis = 4`(manager+) 신규 추가 |
| `src/i18n/local/en/milestones.ts` | AI Risk 관련 키 추가 (§10 참조) |
| `src/i18n/local/ko/milestones.ts` | 동일 |
| `src/pages/milestone-detail/AiRiskInsight.tsx` 관련 CSS (index.css 또는 mo-ai-insight 블록) | 신규 `.mo-ai-analyze-btn`, `.mo-ai-cache-meta`, `.mo-ai-error-banner` 클래스 추가. 기존 `.mo-ai-insight` 는 유지(디자이너 재사용) |

### 영향 없음 (확인용)

- `supabase/functions/risk-predictor/index.ts` — 변경 없음. Plan 수준 분석은 그대로 유지.
- `src/pages/milestone-detail/FailedBlockedCard.tsx`, `EtaCard.tsx`, `VelocitySparkline.tsx` 등 — 영향 없음.

---

## 8. 엣지 케이스

| 케이스 | 예상 동작 |
|--------|---------|
| Claude API 타임아웃 (30s 초과) | Edge Function `AbortController` → 504 + `ai_timeout`. 프론트는 rule-based fallback + Retry 버튼. 기존 캐시는 덮어쓰지 않음. |
| Claude rate limit (429) | Edge Function이 `retry_after_sec: 60` 포함해 429 반환. 프론트 버튼 60초 disabled. |
| 플랜 월 한도 초과 | Edge Function이 credit 차감 전 체크 → 429 + `monthly_limit_reached`. Upgrade CTA 배너. |
| 사용자가 tier 조건은 맞지만 credit 0 남음 | 429 + 배너. 버튼은 disabled. |
| milestone 삭제 후 구 캐시 참조 | milestone 삭제 시 row가 함께 날아가므로 `ai_risk_cache`도 자동 제거. 프론트는 이미 milestone 404로 리다이렉트됨. |
| 동시 2명 Refresh 클릭 (race condition) | Edge Function 시작 시 `pg_try_advisory_xact_lock(hashtext(milestone_id))` 시도. 실패하면 2-3초 후 `ai_risk_cache` 재조회로 첫 호출 결과를 반환. |
| milestone에 TC 0개 (신규 생성) | Edge Function이 Claude 호출 전에 early return — `risk_level: 'on_track', confidence: 0, summary: 'No test cases yet. Add TCs to enable risk analysis.', bullets: [], recommendations: ['Add test cases to this milestone.']` |
| milestone.end_date NULL (기한 미설정) | 프롬프트에 "End: Not set | D-day: —" 그대로 입력. Claude가 velocity 기반 추정만 수행. |
| JSON 파싱 실패 (Claude 스키마 벗어남) | 422 반환. 프론트는 rule-based fallback + "AI returned malformed response" 경고. `ai_generation_logs`에 `output_data: null` 로 기록하고 credit 은 차감하지 않음 (rollback). |
| 네트워크 끊김 (프론트) | `supabase.functions.invoke` reject → catch에서 "Network error. Retry →" 표시. 토스트 중복 억제. |
| 캐시 데이터 손상 (JSON 파싱 에러) | 프론트가 `try/catch`로 파싱 → 실패 시 AI 카드 안 보이고 rule-based만 표시. Sentry에 경고. |
| 동일 사용자가 1분 내 10번 클릭 | Edge Function에서 `_shared/rate-limit.ts`로 분당 5회 제한. 초과 시 429. |
| `bullets.length = 0` (Claude가 빈 배열 반환) | Edge Function에서 `bullets`가 빈 배열이면 422 반환 (품질 가드). |
| 매우 긴 `summary` (>500자) | Edge Function에서 `summary = summary.slice(0, 300) + '…'` truncate. |

---

## 9. Out of Scope (이번에 안 하는 것)

> 스코프 크리프 방지를 위해 명시적으로 제외.

- [ ] **Blocked Reasons 카드 재설계 — 별도 티켓으로 분리.**
- [ ] **Blocked Reasons 구조화 필드 추가 (`test_results.block_reason` enum 등) — 별도 티켓으로 분리. 이유: `test_results.block_reason` enum 추가 + blocked 전환 UI 변경 + 기존 데이터 백필 전략 필요. 이번 Dev Spec에서 다루지 않음.**
- [ ] **AI 기반 Blocked Reasons 추출 — 노이즈 문제(동일 TC의 block 사유가 run마다 다를 수 있음)로 후속 티켓으로 연기.**
- [ ] **Plan-level AI Risk Insight 개편** — 기존 `risk-predictor` 함수는 그대로 두고, 이번 티켓은 milestone 전용만 처리.
- [ ] **TC 수준 AI 분석 (개별 TC의 flakiness 상세)** — 별도 AI_FEATURES 기능.
- [ ] **Real-time AI 스트리밍 응답 (SSE / WebSocket)** — MVP는 동기 호출만. Claude 응답이 오기 전까지 스피너 대기.
- [ ] **AI 결과 공유 기능 (공개 링크, Slack 전송 등)** — 차후 티켓.
- [ ] **AI 결과에 대한 User Feedback ("Was this useful?" 버튼)** — 별도 UX 리서치 후 진행.
- [ ] **다국어 Claude 출력** — 현 MVP는 영어 출력만. 추후 KO locale 감지 시 프롬프트에 "Respond in Korean" 추가 예정이지만 이번 티켓 범위 외.
- [ ] **캐시 TTL 사용자 설정 가능화** — 24h 고정.
- [ ] **AI 사용량 대시보드 (팀 레벨)** — 현 `ai_generation_logs`는 개인 단위 로그만. 팀 집계 뷰는 별도.

---

## 10. i18n 키

| 키 | EN | KO |
|----|----|----|
| `milestones.riskSignal.title` | "Risk Signal" | "위험 신호" |
| `milestones.riskSignal.onTrack` | "On track" | "정상 진행" |
| `milestones.riskSignal.atRisk` | "At Risk" | "주의" |
| `milestones.riskSignal.critical` | "Critical" | "심각" |
| `milestones.riskSignal.empty` | "Keep running tests to build risk signal." | "테스트를 더 실행하면 위험 신호를 확인할 수 있습니다." |
| `milestones.aiRisk.title` | "AI Risk Analysis" | "AI 리스크 분석" |
| `milestones.aiRisk.analyzeCta` | "Analyze with AI" | "AI로 분석하기" |
| `milestones.aiRisk.analyzing` | "Analyzing with Claude…" | "Claude가 분석 중…" |
| `milestones.aiRisk.refreshCta` | "Refresh" | "새로고침" |
| `milestones.aiRisk.lastAnalyzed` | "Last analyzed: {{time}}" | "마지막 분석: {{time}}" |
| `milestones.aiRisk.confidence` | "Confidence {{value}}%" | "신뢰도 {{value}}%" |
| `milestones.aiRisk.summaryLabel` | "Summary" | "요약" |
| `milestones.aiRisk.observationsLabel` | "Observations" | "관찰" |
| `milestones.aiRisk.recommendationsLabel` | "Recommendations" | "권장 조치" |
| `milestones.aiRisk.lowConfidence` | "Low confidence — consider refreshing after more runs." | "신뢰도 낮음 — 실행이 더 쌓인 뒤 새로고침해 주세요." |
| `milestones.aiRisk.error.timeout` | "AI analysis timed out. Retry →" | "AI 분석 시간 초과. 다시 시도 →" |
| `milestones.aiRisk.error.rateLimit` | "Claude is rate-limited. Try again in {{sec}} seconds." | "Claude 속도 제한. {{sec}}초 뒤 다시 시도하세요." |
| `milestones.aiRisk.error.monthlyLimit` | "Monthly AI credits exhausted ({{used}}/{{limit}}). Upgrade →" | "월 AI 크레딧 소진 ({{used}}/{{limit}}). 업그레이드 →" |
| `milestones.aiRisk.error.parse` | "AI returned unexpected format. Try again." | "AI 응답 형식 오류. 다시 시도해 주세요." |
| `milestones.aiRisk.error.network` | "Network error. Retry →" | "네트워크 오류. 다시 시도 →" |
| `milestones.aiRisk.upgradeToHobby` | "Upgrade to Hobby to unlock AI analysis" | "AI 분석을 사용하려면 Hobby 플랜으로 업그레이드하세요" |
| `milestones.aiRisk.needTcs` | "Add test cases first to enable AI analysis." | "AI 분석을 사용하려면 먼저 테스트 케이스를 추가하세요." |
| `milestones.aiRisk.viewerMessage` | "Ask your admin to run AI analysis." | "관리자에게 AI 분석 실행을 요청하세요." |

---

## 11. 테스트 계획 (Dev가 확인해야 할 수동 시나리오)

### 단위 시나리오

1. **Fresh milestone, 0 AI cache** → Overview 방문 → Risk Signal 카드만 보임 → Analyze with AI 클릭 → 스피너 → AI 결과 카드 → 24h 내 재방문 시 자동 AI 결과 표시.
2. **Manager 권한으로 Analyze** → 성공 → Tester 계정으로 같은 milestone 방문 → AI 결과 카드가 **자동으로** 보이지만 Refresh 버튼 없음.
3. **Free 계정** → 버튼 disabled + "Upgrade to Hobby" 툴팁 확인.
4. **Hobby 계정, 이번 달 13 credit 사용** → 2 credit 필요 → 가능 (남은 2). 다시 클릭하면 한도 초과 429 → 배너 표시.
5. **Force Refresh** → 캐시 있음에도 Claude 재호출됨 (DevTools Network에서 확인).
6. **Cache hit** → 두 번째 방문 시 Network 탭에 Edge Function 호출 0건 확인.
7. **데이터 0개 milestone** → "Add test cases first" 툴팁.
8. **Claude 강제 timeout 시뮬레이션** (Edge Function 테스트 환경에서 delay inject) → 504 → Retry 버튼 표시.
9. **동시 Refresh (두 탭에서)** → 한쪽이 advisory lock 획득, 다른 쪽은 2-3초 후 같은 결과 반환.

### 회귀 테스트

- 기존 Plan-level risk-predictor 동작 유지 확인 (`/projects/.../plans/.../` 페이지).
- Overview 탭의 다른 카드(FailedBlocked, VelocitySparkline, EtaCard)는 영향 없어야 함.
- `?tab=issues`, `?tab=activity` URL 동작 변함 없음.

---

## 개발 착수 전 체크리스트

- [x] 수용 기준이 전부 테스트 가능한 문장인가 — 18개 AC 모두 Given/When/Then 변환 가능
- [x] DB 스키마가 컬럼 타입/제약조건까지 명시되었는가 — `ai_risk_cache JSONB NULL` + JSON 스키마 상세
- [x] RLS 정책이 정의되었는가 — 기존 milestones RLS 상속, Edge Function은 service role
- [x] 플랜별 제한이 명시되었는가 — Free~Enterprise 5티어 개별 명시
- [x] RBAC 권한 매트릭스가 있는가 — 6역할 × 4행위
- [x] 변경 파일 목록이 구체적인가 — 7 신규 + 9 수정 파일 모두 실제 경로
- [x] 엣지 케이스가 식별되었는가 — 13건
- [x] Out of Scope이 명시되었는가 — 11건, Blocked Reasons 후속 티켓 조건 포함
- [x] i18n 키가 en/ko 둘 다 있는가 — 22개 키
- [ ] 관련 디자인 명세가 Approved 상태인가 — @designer 작업 대기
