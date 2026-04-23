# Research: f011 — AI 토큰 예산 모니터링 대시보드

> 작성일: 2026-04-23
> 작성자: @researcher

---

## Executive Summary

- **현재 인프라는 충분히 갖춰져 있다.** `ai_generation_logs` 테이블에는 `user_id`, `mode`, `credits_used`, `tokens_used`, `latency_ms`, `created_at`, `project_id` 컬럼이 모두 존재하며, 일별·모드별·멤버별 집계에 필요한 모든 raw 데이터가 저장되어 있다. 단, 현재 프론트에서는 단일 숫자(이번 달 total credits)만 표시한다.
- **RLS가 핵심 제약이다.** `ai_generation_logs`의 RLS는 본인 행만 SELECT 허용. Owner가 팀 전체 breakdown을 보려면 새로운 SECURITY DEFINER RPC가 필수다. 기존 `get_ai_shared_pool_usage`는 단일 합계만 반환하므로 시계열/모드별 분해에 부족하다.
- **경쟁사는 "AI 사용량 모니터링"을 독립 탭으로 제공하기 시작했다.** TestRail은 AI Hub(alll-time 집계), Qase는 AIDEN credits 한도 설정까지 지원. AI vendor(OpenAI, Anthropic)는 model별·day별·key별 시계열을 기본 제공한다.
- **"Credits" 표기가 최선이다.** 경쟁사(Qase: AIDEN credits, Anthropic: token usage) 중 SaaS 제품들은 내부 크레딧 단위를 노출한다. Testably는 이미 "credits" 단위로 일관된 시스템을 운영하고 있으며, 유저에게 "credits" 표기가 토큰/API call보다 직관적이다.
- **Retention policy가 없다.** `ai_generation_logs`에 데이터 보존 기한 마이그레이션이 없다. 단기적으로는 플랜별 조회 기간을 제한하는 소프트 정책(UI 단)을 적용하고, 장기 retention은 별도 마이그레이션으로 관리해야 한다.

---

## 1. 기존 인프라 맵

### 1-1. `ai_generation_logs` 테이블 전체 스키마

소스: `/Users/yonghyuk/testflow/supabase/migrations/20260323_ai_generation_logs.sql` + 이후 ALTER 마이그레이션 누적 결과

| 컬럼 | 타입 | 비고 |
|-----|------|------|
| `id` | UUID PK | |
| `user_id` | UUID FK → auth.users | 호출자 개인 (팀 멤버 중 실제 호출한 사람) |
| `project_id` | UUID FK → projects | |
| `mode` | TEXT CHECK | 12개 값 (아래 카탈로그 참조) |
| `input_text` | TEXT | 원본 입력 (텍스트 모드) |
| `session_id` | UUID FK → sessions | 세션 모드 |
| `titles_generated` | INT | |
| `titles_selected` | INT | |
| `cases_saved` | INT | |
| `model_used` | TEXT | 기본값 `claude-sonnet-4-20250514` |
| `tokens_used` | INT | 실제 LLM 토큰 수 (일부 함수만 저장) |
| `latency_ms` | INT | |
| `step` | INT CHECK(1,2) | **1만 quota 집계 대상** |
| `created_at` | TIMESTAMPTZ | 인덱스 있음 (DESC) |
| `credits_used` | INT NOT NULL DEFAULT 1 | 20260415 추가, 현재 모든 기능 = 1 |
| `input_data` | JSONB | 20260402 추가, 캐시/분석용 |
| `output_data` | JSONB | 20260402 추가, 캐시용 |

**인덱스:**
- `idx_ai_generation_logs_user_id` ON (user_id)
- `idx_ai_generation_logs_project_id` ON (project_id)
- `idx_ai_generation_logs_created_at` ON (created_at DESC)
- `idx_ai_generation_logs_credits` ON (user_id, step, created_at DESC) INCLUDE (credits_used)
- `idx_ai_generation_logs_input_run_id` ON (input_data->>'run_id') WHERE mode='run-summary'

**RLS 정책:**
- SELECT: `auth.uid() = user_id` (본인만)
- INSERT: `auth.uid() = user_id` (본인만)
- UPDATE/DELETE: 없음

**Retention policy:** 없음. 마이그레이션 어디에도 DELETE/CRON 없음 — 확인 완료.

---

### 1-2. Mode 카탈로그 (현재 CHECK 제약 기준)

소스: `/Users/yonghyuk/testflow/supabase/migrations/20260422_ai_log_mode_milestone_risk.sql`

| mode 값 | 기능 키 (ai-config.ts) | Edge Function | credits_used 저장 여부 |
|--------|----------------------|--------------|----------------------|
| `text` | tc_generation_text | generate-testcases | 1 (AI_FEATURES.tc_generation_text.creditCost) |
| `session` | tc_generation_session | generate-testcases | 1 |
| `jira` | tc_generation_jira | generate-testcases | 1 |
| `run-summary` | run_summary / coverage_gap / flaky_analysis | generate-testcases | 1 (각 AI_FEATURES.*.creditCost) |
| `requirement-suggest` | requirement_suggest | generate-testcases | 1 |
| `plan-assistant` | plan_assistant | plan-assistant | `feature.creditCost` (현재 1) |
| `risk-predictor` | risk_predictor | risk-predictor | `feature.creditCost` (현재 1) |
| `milestone-risk` | milestone_risk | milestone-risk-predictor | `feature.creditCost` (현재 1) |
| `burndown-insight` | burndown_insight | (미구현) | - |
| `activity-summary` | activity_summary | (미구현) | - |
| `issues-analysis` | issues_analysis | (미구현) | - |
| `tag-heatmap-insight` | tag_heatmap_insight | (미구현) | - |

**중요한 이상 발견:** `run-summary` mode가 run_summary / coverage_gap / flaky_analysis 세 기능에 공용으로 사용됨. `mode`만으로는 이 세 기능을 구분할 수 없다. action 구분은 `input_data` JSONB에 암묵적으로 포함되어 있으나 별도 컬럼은 없다.

소스: `/Users/yonghyuk/testflow/supabase/functions/_shared/ai-config.ts` lines 65-74 (`coverage_gap`, `flaky_analysis` 모두 `mode: 'run-summary'`로 설정됨).

---

### 1-3. 기존 RPC 시그니처

**`get_ai_shared_pool_usage(p_owner_id uuid, p_month_start timestamptz)`**
- 반환: `bigint` (단일 합계)
- 용도: 이번 달 팀 전체 credit 합계
- 제약: 시계열/모드별/멤버별 breakdown 불가

소스: `/Users/yonghyuk/testflow/supabase/migrations/20260420_ai_usage_rpc.sql`

**`get_owner_team_user_ids(p_owner_id uuid)`**
- 반환: `SETOF uuid`
- 용도: owner 팀 user_id 목록

**`get_team_ai_log(p_owner_id uuid, p_mode text, p_input_match jsonb)`**
- 반환: `TABLE(output_data jsonb, created_at timestamptz, user_id uuid)` 최신 1건
- 용도: 캐시 조회 전용

소스: `/Users/yonghyuk/testflow/supabase/migrations/20260421_ai_team_cache_rpc.sql`

---

### 1-4. 현재 Dashboard 소비 지점

**파일:** `/Users/yonghyuk/testflow/src/pages/project-detail/page.tsx`

- **위치:** line 1272–1315, 프로젝트 대시보드 Overview 탭 우측 사이드바
- **표시 내용:** 단일 숫자 `aiUsageCount` / `aiLimit`, 프로그레스 바, 80% 이상 시 UpgradeBanner
- **데이터 조회:** `useQuery(['aiUsage', id])` → `getSharedPoolUsage(ownerId)` → RPC `get_ai_shared_pool_usage` 호출
- **제한:** 팀 전체 total만 보임. 멤버별·모드별·일별 breakdown 없음.

**관련 파일:**
- `/Users/yonghyuk/testflow/src/lib/aiUsage.ts` — 프론트 헬퍼 (getEffectiveOwnerId, getSharedPoolUsage)
- `/Users/yonghyuk/testflow/src/hooks/useAiFeature.ts` — 개별 기능 접근 체크 훅

---

### 1-5. Limit 체크 및 Block 동작

**Edge Function 단 (백엔드):**
- `checkAiAccess()` 함수 (`/Users/yonghyuk/testflow/supabase/functions/_shared/ai-usage.ts` line 177)가 tier gate + credit quota를 동시 검사
- 한도 초과 시 `allowed: false`, `error: 'Monthly AI credit limit reached.'`, HTTP 200 반환 (프론트가 error 필드 확인)
- Tier 미달 시 `allowed: false`, `error: '{TierName} plan required'`

**플랜별 월 한도:**
| Tier | 플랜 | 크레딧/월 |
|------|------|---------|
| 1 | Free | 3 |
| 2 | Hobby | 15 |
| 3 | Starter | 30 |
| 4 | Professional | 150 |
| 5,6,7 | Enterprise | -1 (무제한) |

소스: `/Users/yonghyuk/testflow/supabase/functions/_shared/ai-config.ts` lines 10-18

---

## 2. 경쟁사 비교표

### A. AI API 벤더 Usage Dashboard

| 항목 | OpenAI Platform | Anthropic Console |
|-----|----------------|------------------|
| 주요 차트 | 일별 비용 bar chart (시계열) | 일별 토큰 bar chart (모델별 색상 구분) |
| Breakdown 단위 | model별, endpoint별, day별 | model별, API key별, workspace별 |
| 기간 필터 | 오늘/7일/현재 청구 사이클/커스텀 | 월 선택, 일별 드릴다운 (시·분 단위까지) |
| 팀 기여도 표시 | API key별 집계 (사람 아닌 key 기준) | workspace별 집계 |
| Alert | 없음 (소비 한도 설정 별도) | 없음 |
| Export | CSV (date, model, tokens, cost) | CSV |
| 핵심 UX 패턴 | 상단 총액/총 토큰 → 하단 bar chart 드릴다운 | 월별 총액 카드 + 일별 차트 + 테이블 |

소스: [OpenAI Usage Dashboard](https://help.openai.com/en/articles/8554956-usage-dashboard-legacy), [Anthropic Console Cost Reporting](https://support.anthropic.com/en/articles/9534590-cost-and-usage-reporting-in-console)

### B. SaaS Observability 제품

| 항목 | Vercel Usage | Supabase Usage |
|-----|-------------|---------------|
| 주요 차트 | Networking/Functions/Build 카테고리별 시계열 | 프로젝트별 리소스 사용량 (MAU, egress 등) |
| Breakdown 단위 | 프로젝트별, 제품 카테고리별 | 프로젝트별, 리소스 타입별 |
| 팀 멤버별 기여도 | 미제공 (프로젝트 단위가 최소 단위) | 미제공 |
| 기간 필터 | 현재 청구 사이클, 이전 달 | 현재 청구 사이클 |
| Alert | 예산 초과 알림 | 사용량 임계치 알림 |
| 핵심 UX 패턴 | Overview 요약 카드 → 카테고리 드릴다운 | Org 단위 overview → 프로젝트별 상세 |

소스: [Vercel Usage Dashboard Blog](https://vercel.com/blog/sophisticated-usage-dashboard), [Supabase Billing FAQ](https://supabase.com/docs/guides/platform/billing-faq)

### C. QA/Testing 제품의 AI 사용량 표시 (직접 경쟁)

| 항목 | TestRail AI Hub | Qase AIDEN Credits |
|-----|----------------|-------------------|
| AI 사용량 표시 방식 | All-time 누적 숫자 (TC 생성 수, 자동화 스크립트 수) | 월별 credits 잔여량, 초과 시 $0.40/credit 추가 |
| Breakdown | 기능별 (생성 수 vs 자동화 수) | 없음 (총 credit 소비량) |
| 멤버별 기여도 | 미제공 (인스턴스 전체 집계) | 미제공 |
| 기간 필터 | All-time (필터 없음) | 이번 달만 |
| 한도 설정 | 없음 (Unlimited or role-based 비활성화) | 월별 spending cap 설정 가능 |
| Alert | 없음 | 한도 설정 시 초과 차단 |
| Enterprise access | Admin만 AI Hub 접근 가능 | 확인 필요 |

소스: [TestRail AI Hub 공식 문서](https://support.testrail.com/hc/en-us/articles/37119835854484), [Qase Q4 2025 Product Updates](https://qase.io/blog/q4-2025-qase-product-updates/)

**요약 패턴 관찰:**
- AI 벤더: 상세 시계열 + model별 breakdown이 표준
- SaaS 제품(Vercel/Supabase): 프로젝트/카테고리 단위로만 breakdown, 멤버별 미제공
- QA 경쟁사: 단순 숫자 표시 또는 전체 집계가 전부 — **멤버별 기여도 + 모드별 breakdown은 Testably가 차별화 가능한 영역**

---

## 3. Testably 특화 Q&A

### Q1. Credit vs Token 표기 — 권장: "Credits"

**근거:**
1. 기존 codebase가 이미 `credits_used` 단위로 일관되게 동작 (DB 컬럼명, API response meta 필드, PLAN_LIMITS 모두 "credits" 사용)
2. Qase는 "AIDEN credits"로 표기하여 내부 가중치 단위를 노출하는 것이 유저 수용성 있음을 입증
3. "tokens"은 LLM 원시 단위로 유저가 비교하기 어렵고, Testably의 `tokens_used` 컬럼은 일부 Edge Function만 채움 (generate-testcases는 미저장, risk-predictor/milestone-risk-predictor는 저장)
4. "API calls"은 step=1/2 구분으로 실제 호출 수와 달라 오해 소지

**예외 케이스:** Advanced 뷰에서 owner(Enterprise)가 "actual token consumption"을 원할 경우 `tokens_used` 컬럼으로 표시 가능하나, 현재 일관성 없음 (일부 함수만 저장). 이 경우 "확인 필요" — 모든 Edge Function이 `tokens_used` 저장을 완료한 후 노출 가능.

**결론:** 기본 표기는 "AI Credits", 고급 뷰(선택)에서 "Tokens Used" 병기 고려.

---

### Q2. 집계 granularity — 권장: Daily 기본, 30일 기본 기간

**기본값:**
- Granularity: **daily** (weekly는 스파이크 숨김 우려, monthly는 너무 거칠다)
- 기본 기간: **30일** (이번 달 + 직전 달의 말일 포함 — 유저가 직전 달 패턴과 비교하기 용이)
- 조회 가능 범위: 플랜별 제한 권장

**플랜별 조회 기간 제안 (런 히스토리 보존 정책 준용):**
| 플랜 | AI Usage 조회 기간 |
|-----|-----------------|
| Free | 30일 |
| Hobby | 90일 |
| Starter | 6개월 |
| Professional | 12개월 |
| Enterprise | 24개월 |

**Retention 현황:** ai_generation_logs에 retention policy 없음. 운영 비용 제어를 위해 30일 초과 데이터는 별도 archival 테이블로 이동하는 마이그레이션을 중기 계획으로 권장. 단기적으로는 프론트 UI에서 기간 제한만 적용해도 무방.

**소스:** 기존 `run_history_retention` 정책 (PRD §5 Reporting & Analytics 참조), 경쟁사 OpenAI (청구 사이클 기준 필터), Anthropic (월 선택)

---

### Q3. Owner 전용 vs 전 멤버 — 권장: Owner/Admin은 full view, Member는 self-only

**현실적 접근 (RLS 제약 고려):**

현재 RLS는 `auth.uid() = user_id`만 허용. 팀 전체 breakdown은 무조건 SECURITY DEFINER RPC를 거쳐야 한다.

**권장 정책:**

| 역할 | 볼 수 있는 데이터 | 필요한 신규 RPC |
|-----|----------------|--------------|
| Owner / Admin (RBAC role ≥ admin) | 팀 전체 usage + 멤버별 기여도 + 모드별 breakdown + 시계열 | `get_ai_usage_breakdown(p_owner_id, p_from, p_to, p_granularity)` 신규 필요 |
| Manager / Tester / Viewer | 본인 usage만 (이번 달 / 기간 선택) | 기존 RLS로 직접 조회 가능 |

**보안 고려:**
- SECURITY DEFINER RPC 내부에서 `auth.uid()`가 p_owner_id의 owner/admin임을 검증해야 함
- 현재 `get_ai_shared_pool_usage`에는 caller 검증 없음 — 신규 RPC에서 수정 필요

**기존 RLS 정책 변경 여부:** 없음. 기존 policy 유지하고 RPC 레이어만 추가하면 충분.

---

## 4. Dev Spec으로 전달할 Key Decisions

다음은 Planner(@planner)가 Dev Spec 작성 시 직접 사용할 수 있는 의사결정 목록이다.

### KD-1: 신규 RPC `get_ai_usage_breakdown` 필요
- 시그니처: `get_ai_usage_breakdown(p_owner_id uuid, p_from timestamptz, p_to timestamptz, p_granularity text)`
- 반환: day별 × mode별 × user별 credits SUM 행 집합
- SECURITY DEFINER 필수, 호출자 owner/admin 검증 필수
- 기존 `get_ai_shared_pool_usage`는 건드리지 않음 (기존 Dashboard 사이드바 카드 유지)

### KD-2: 신규 Dashboard 페이지/탭 위치
- 선택지 A: `/settings?tab=ai-usage` — billing 탭 옆에 위치 (owner만 접근)
- 선택지 B: `/project/:id` dashboard에 "AI Usage" 탭 추가
- 권장: **선택지 A** — AI usage는 billing entity(owner) 단위이지 프로젝트 단위가 아님. billing 탭과 인접 배치가 자연스럽다.

### KD-3: 차트 구성 (최소 viable)
1. **Burn Rate 카드:** 이번 달 사용량 / 한도, 남은 일수 대비 예상 소진일 (credits/day × 남은 일수)
2. **일별 시계열 bar chart:** x축 날짜, y축 credits, mode별 색상 stacked bar
3. **Mode별 파이 차트 또는 테이블:** text/jira/session/run-summary/plan-assistant/risk-predictor/milestone-risk 각 비율
4. **멤버별 기여 테이블:** user avatar + email + 이번 달 credits, 내림차순

### KD-4: run-summary mode 분리 문제
- `run-summary` mode가 run_summary / coverage_gap / flaky_analysis 세 기능에 공용 사용 중
- 이 세 기능을 대시보드에서 구분 표시하려면 generate-testcases Edge Function에서 `action` 값을 `input_data`에 기록하도록 추가하거나, mode 값 자체를 분리해야 함
- **권장 (단기):** 분리하지 않고 "Run Analysis" 단일 카테고리로 표기. mode 분리는 별도 f-issue로.

### KD-5: 표기 단위
- UI 표기: "AI Credits" (내부 DB 단위 그대로 노출)
- "N credits used this month"
- Enterprise unlimited의 경우 "Unlimited (N used)"

### KD-6: 조회 기간 제한
- UI 기본값: 현재 달 (month-to-date)
- 기간 선택: 30일 / 90일 / 6개월 (플랜별 상한 하드코딩)
- Retention policy는 별도 마이그레이션 이슈로 분리

---

## 5. 리스크 / 고려사항

### RLS 및 보안
- `get_ai_usage_breakdown` RPC에 caller 검증 미흡 시 임의 owner_id로 타 팀 사용량 조회 가능. **필수 검증:** `EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND id = p_owner_id)` 또는 project admin 역할 확인.
- 현재 `get_ai_shared_pool_usage`에는 이 검증이 없음 — 기존 RPC도 보안 감사 필요 (단, owner_id를 프론트에서 전달받으므로 owner 자신이 호출하는 게 일반적이라 실제 위험은 낮음).

### 성능
- `ai_generation_logs`는 created_at DESC 인덱스가 있으나 날짜 범위 + GROUP BY mode + GROUP BY user_id 쿼리는 테이블 성장 시 느려질 수 있음
- RPC 내 `WITH` CTE 구조로 owner 팀 user_id 먼저 조회 후 IN 필터 적용 — 팀 규모 커질수록 IN 리스트 길어짐
- 신규 RPC에는 `(user_id, step, created_at, mode, credits_used)` 복합 인덱스 추가 권장

### mode 분리 기술 부채
- `run-summary` mode가 3개 기능을 포괄하는 것은 현재 기술 부채. 대시보드에서 정확한 기능별 비율을 원한다면 migration 통해 `action` 컬럼 추가 필요. 이 작업은 f011과 독립적으로 별도 이슈 등록 권장.

### Retention 미설정
- `ai_generation_logs`에 retention policy 없음. 현재 서비스 초기라 데이터 양이 적지만, 수만 row 누적 시 RPC 쿼리 비용 증가. 90일 이상 데이터 cold archival 또는 aggregate snapshot 테이블(`ai_usage_daily_snapshots`) 분리를 중기 계획으로 권장.

### tokens_used 데이터 불완전
- `tokens_used` 컬럼이 있으나 일부 Edge Function(generate-testcases의 text/jira/session 모드)은 저장하지 않음. "실제 토큰 사용량" 뷰는 현재 부정확. 먼저 모든 함수가 tokens_used 저장하도록 통일한 뒤 노출 권장.

---

## 데이터 소스

### 내부 코드베이스
- `/Users/yonghyuk/testflow/supabase/migrations/20260323_ai_generation_logs.sql` — 초기 스키마
- `/Users/yonghyuk/testflow/supabase/migrations/20260402_ai_run_summary.sql` — input_data/output_data 추가
- `/Users/yonghyuk/testflow/supabase/migrations/20260415_ai_credits_used.sql` — credits_used 추가, mode 제약 확장
- `/Users/yonghyuk/testflow/supabase/migrations/20260420_ai_usage_rpc.sql` — get_ai_shared_pool_usage RPC
- `/Users/yonghyuk/testflow/supabase/migrations/20260421_ai_team_cache_rpc.sql` — get_team_ai_log, get_owner_team_user_ids RPC
- `/Users/yonghyuk/testflow/supabase/migrations/20260422_ai_log_mode_milestone_risk.sql` — milestone-risk mode 추가
- `/Users/yonghyuk/testflow/supabase/functions/_shared/ai-config.ts` — PLAN_LIMITS, AI_FEATURES 정의
- `/Users/yonghyuk/testflow/supabase/functions/_shared/ai-usage.ts` — 백엔드 shared 헬퍼
- `/Users/yonghyuk/testflow/src/lib/aiUsage.ts` — 프론트 헬퍼
- `/Users/yonghyuk/testflow/src/pages/project-detail/page.tsx` — 현재 aiUsageCount 렌더링 (line 1272-1315)
- `/Users/yonghyuk/testflow/supabase/functions/generate-testcases/index.ts` — 다수 mode INSERT
- `/Users/yonghyuk/testflow/supabase/functions/plan-assistant/index.ts` — plan-assistant INSERT
- `/Users/yonghyuk/testflow/supabase/functions/risk-predictor/index.ts` — risk-predictor INSERT
- `/Users/yonghyuk/testflow/supabase/functions/milestone-risk-predictor/index.ts` — milestone-risk INSERT

### 외부 소스
- [OpenAI Usage Dashboard (Legacy)](https://help.openai.com/en/articles/8554956-usage-dashboard-legacy)
- [Anthropic Console Cost and Usage Reporting](https://support.anthropic.com/en/articles/9534590-cost-and-usage-reporting-in-console)
- [Vercel Sophisticated Usage Dashboard](https://vercel.com/blog/sophisticated-usage-dashboard)
- [Supabase Billing FAQ](https://supabase.com/docs/guides/platform/billing-faq)
- [TestRail AI Quick Start](https://support.testrail.com/hc/en-us/articles/37119835854484-Quick-Start-Generate-Test-Cases-with-AI)
- [Qase Q4 2025 Product Updates](https://qase.io/blog/q4-2025-qase-product-updates/)
- [Qase AIDEN AI Software Testing Agent](https://qase.io/ai-software-testing)

---

## 기획 시사점

> 인프라는 이미 충분하다. 새로 데이터를 쌓을 필요 없이 기존 `ai_generation_logs`를 가져다 쓰면 된다. 필요한 것은 (1) RLS를 우회하는 신규 SECURITY DEFINER RPC 1개, (2) 그 RPC를 소비하는 설정 페이지 탭 UI 1개다. 경쟁사(TestRail, Qase) 대비 멤버별 기여도 breakdown이 명확한 차별화 포인트이며, 구현 난이도는 "medium" 수준으로 f011의 기획서대로 적절하다.

## 추천 액션
- [ ] `get_ai_usage_breakdown` RPC 스펙 정의 (반환 컬럼: date, mode, user_id, credits_sum)
- [ ] RPC에 호출자 검증 로직 포함 여부 확인 및 보안 설계
- [ ] `/settings?tab=ai-usage` 탭 신규 라우트 추가 (owner/admin만 접근)
- [ ] generate-testcases `run-summary` mode 분리 여부 결정 (별도 이슈 권장)
- [ ] 모든 Edge Function이 `tokens_used`를 일관되게 저장하도록 통일 (별도 이슈)
- [ ] ai_generation_logs retention policy 마이그레이션 중기 계획 수립
