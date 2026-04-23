# Dev Spec: f011 — AI Token Budget Monitoring Dashboard

> **작성일:** 2026-04-23
> **작성자:** @planner (Phase 2)
> **상태:** Draft → Review → Approved
> **관련 리서치:** `docs/research/f011-ai-token-budget-dashboard.md`
> **관련 디자인:** `docs/specs/design-spec-f011-ai-token-budget-dashboard.md` (TBD — @designer)
> **런칭 타깃:** 2026-05-11 Testably SDK 런칭 이전 (implementation 기간 약 15일, effort: medium)

---

## 1. 개요

- **문제:** 현재 유저는 Project Dashboard 사이드바에서 "이번 달 팀 AI 사용량 N/M credits" 단일 숫자만 볼 수 있고, 팀원 중 누가 어떤 AI 기능을 얼마나 썼는지 확인할 수 없다. 한도에 근접했을 때 원인을 추적할 수 없어서 Owner/Admin이 예산을 선제적으로 관리하기 어렵다.
- **해결:** Settings 페이지에 "AI Usage" 탭을 신설하여 Owner/Admin에게는 (1) 이번 달 소진율 & burn rate 카드, (2) 일별 시계열(mode별 stacked bar), (3) Mode별 breakdown, (4) 멤버별 기여도 테이블을 제공한다. 일반 Member에게는 "내 사용량" 단일 뷰만 노출한다. 신규 테이블 없이 기존 `ai_generation_logs` 를 신규 `SECURITY DEFINER` RPC로 집계한다.
- **성공 지표:**
  - Enterprise/Professional Owner의 월 1회 이상 AI Usage 탭 열람 비율 ≥ 30% (출시 후 4주)
  - Free/Hobby에서 Starter 이상으로 업그레이드 한 유저 중 "AI credits 한도 부족"을 이유로 답한 비율 측정 (엑싯 설문, baseline 대비 +2pp 기대)
  - 경쟁사 대비 차별화: TestRail AI Hub / Qase AIDEN은 멤버별 기여도 미제공 → Testably 고유 기능

---

## 2. 유저 스토리

- **Owner (subscription billing entity):** As an Owner, I want to see a daily time-series of my team's AI credit consumption broken down by mode and by member, so that I can detect runaway usage before hitting the monthly limit and plan my next tier.
- **Admin:** As an Admin, I want to see the same team-wide breakdown as the Owner but without access to billing/plan change actions, so that I can coach team members whose AI usage is outlier without touching billing.
- **Member (Manager / Tester / Viewer):** As a Member, I want to see only my own AI usage for this month (current period + last 30 days), so that I can pace my own AI calls and not block teammates from the shared pool.

---

## 3. 수용 기준 (Acceptance Criteria)

> 모든 AC는 테스트 가능 문장이며 "검증 방법" 컬럼 포함. 총 22개.

| # | AC | 검증 방법 |
|---|----|---------|
| AC-1 | Settings 페이지에 신규 탭 `AI Usage`가 추가되고, URL `?tab=ai-usage` 로 딥링크 가능하다. | 브라우저에서 `/settings?tab=ai-usage` 직접 접근 시 해당 탭이 active 상태로 렌더링 |
| AC-2 | Owner/Admin(effective tier ≥ 1)만 Team View를 본다. Member는 "내 사용량" Self View만 본다. | Owner/Admin/Tester 계정 각각으로 E2E, UI에 노출되는 섹션 수 검증 |
| AC-3 | Team View 상단 "Burn Rate" 카드에 `이번 달 사용량 / 월 한도`, `남은 일수`, `예상 소진일(credits/day × 남은 일수)`가 표시된다. | 캘린더 mock (예: 15일째) + 사용량 mock (예: 40/150) → 예상 소진일 계산값 단위 테스트 |
| AC-4 | Team View 중앙에 "Daily Usage" stacked bar chart가 x축 날짜, y축 credits, mode별 색상으로 렌더링된다. 기본 범위는 최근 30일. | Recharts render snapshot + mode 색상 7개 (text / jira / session / run-analysis / plan-assistant / risk-predictor / milestone-risk) 확인 |
| AC-5 | 차트 상단에 기간 필터 (30d / 90d / 6m) 드롭다운이 있고, 플랜별 상한을 초과하는 옵션은 disable + 업그레이드 툴팁 표시된다. | Free 계정 → 90d/6m 비활성 / Hobby → 6m 비활성 / Starter 이상 → 전부 활성 |
| AC-6 | "Mode Breakdown" 섹션에 테이블 형태로 mode별 합계(credits, 전체 대비 %, 호출 횟수)가 내림차순 표시된다. | mock 데이터 (text=20, jira=15, session=5)로 row 순서 및 % 계산 검증 |
| AC-7 | `run-summary` mode는 UI상 "Run Analysis" 단일 버킷으로 표기되며 내부 하위 action 구분하지 않는다. | i18n 키 `aiUsage.mode.runAnalysis` EN/KO 모두 존재, `mode=run-summary` row가 "Run Analysis" 라벨로 렌더링 |
| AC-8 | "Member Contribution" 테이블이 avatar, full_name, email, 이번 달 credits를 내림차순으로 표시한다. 최소 1행 ~ 최대 100행 (scroll). | 5인 팀 mock → 내림차순 정렬 + email fallback (full_name 없을 때) |
| AC-9 | Member 계정 (Self View)은 동일 차트 + Mode Breakdown 을 "내 데이터"만으로 렌더링하며 Member Contribution 섹션은 숨겨진다. | RBAC tester 계정으로 접근 시 "Member Contribution" DOM 미존재 확인 |
| AC-10 | 신규 RPC `get_ai_usage_breakdown(p_owner_id uuid, p_from timestamptz, p_to timestamptz)` 가 존재하며 `SECURITY DEFINER` 이고, caller가 owner 본인이 아니면 빈 결과를 반환한다. | `auth.uid() ≠ p_owner_id AND NOT admin` 상태로 호출 시 0 row. pgTap 또는 Supabase CLI SQL test |
| AC-11 | RPC 응답 p95 < 500ms (1,000 rows 이하 log 테이블 기준). | Supabase Studio SQL analyzer 또는 k6 load test로 p95 측정 |
| AC-12 | Enterprise (tier 5/6/7, limit = -1) 계정에서는 Burn Rate 카드에 `Unlimited (N used)` 라고 표기된다 (한도 바 미표시). | Enterprise 계정 mock → DOM에 "Unlimited" 문자열 + 프로그레스 바 미존재 |
| AC-13 | 집계 데이터가 0건일 때 Empty State ("No AI usage yet this month") 일러스트 + CTA "Try AI Generation" 버튼이 표시된다. | 신규 유저 (0 credits 사용) 계정 → EmptyState 컴포넌트 렌더 |
| AC-14 | RPC 에러 발생 시 상단에 red 배너 "Failed to load AI usage. Please retry." + Retry 버튼이 표시되며 차트 영역은 Skeleton 대체가 아니라 블록 회색 placeholder로 전환된다. | RPC throw mock → 에러 배너 + retry 버튼 클릭 시 refetch |
| AC-15 | 모든 UI 문구에 EN/KO i18n 키가 연결되어 있다 (하드코딩 금지). | `grep -r "AI Usage"` 등으로 코드 내 문자열 리터럴 0건 확인, i18n 키 20개 이상 en/ko 양쪽 존재 |
| AC-16 | Tab 버튼 및 필터 드롭다운이 키보드만으로 전부 동작한다 (Tab/Enter/Esc). 모든 차트에 `aria-label` 포함. | Playwright에서 `page.keyboard.press('Tab')` 만으로 탭 전환 + 차트 `aria-label="Daily AI credit usage"` 검증 |
| AC-17 | 차트 색상이 `docs/UI_GUIDE.md` 브랜드 팔레트(Indigo/Violet accent) 기반이며 최소 AA 대비 유지. | Chromatic 또는 수동 axe-core 실행 → contrast violations 0 |
| AC-18 | "Export CSV" 버튼이 Team View에서만 노출되며 클릭 시 `ai-usage-{YYYY-MM-DD}.csv` 파일로 (date, user_email, mode, credits) 컬럼을 다운로드한다. | 다운받은 파일 라인 수 = RPC rows 수 확인 |
| AC-19 | 기존 Project Dashboard 사이드바의 aiUsageCount 카드는 그대로 유지되고 동작이 변하지 않는다 (단, "View Details" 링크가 추가되어 `/settings?tab=ai-usage` 로 이동). | 기존 사이드바 E2E 회귀 통과 + 신규 링크 클릭 검증 |
| AC-20 | 마이그레이션 파일명 `20260424_f011_ai_usage_breakdown_rpc.sql` 이며 `supabase db reset` 후에도 idempotent(`CREATE OR REPLACE`)하게 재적용 가능하다. | 로컬 Supabase CLI에서 `supabase db reset` 2회 실행 시 에러 없음 |
| AC-21 | 신규 인덱스 `idx_ai_generation_logs_owner_date` ON `ai_generation_logs(user_id, step, created_at DESC, mode)` 가 존재하며 EXPLAIN ANALYZE로 Index Scan 선택이 확인된다. | `EXPLAIN (ANALYZE, BUFFERS) SELECT ... GROUP BY date, mode, user_id` 출력에 "Index Scan using idx_ai_generation_logs_owner_date" 포함 |
| AC-22 | Self View에서는 RPC를 호출하지 않고 기존 RLS로 `ai_generation_logs` 직접 조회한다 (`select date_trunc, mode, sum(credits_used) group by ...`). | 네트워크 탭에서 Self View 시 `rpc/get_ai_usage_breakdown` 요청 미발생, `rest/v1/ai_generation_logs` 요청 발생 확인 |

---

## 4. 기능 상세

### 4-1. 동작 흐름 (Flow)

**정상 흐름 (Owner/Admin Team View):**
1. 유저가 `/settings?tab=ai-usage` 접근 또는 Settings → AI Usage 탭 클릭
2. 페이지 로드 시 `getEffectiveOwnerId(user.id)` 로 billing entity 판별 → ownerId 확보
3. `get_ai_usage_breakdown(ownerId, from, to)` RPC 호출 (기본 from=30일 전 UTC 00:00, to=now)
4. 반환된 rows를 클라이언트에서 3가지 뷰로 가공:
   - Daily series (date × mode 집계)
   - Mode totals (mode 집계)
   - Member totals (user_id 집계 + profiles join 으로 full_name/avatar)
5. Recharts로 차트 렌더링, `<table>` 로 breakdown 표시
6. 유저가 기간 필터 변경 → 새 RPC 호출 + React Query cache key 변경

**대안 흐름 (Member Self View):**
1. 유저가 `/settings?tab=ai-usage` 접근
2. `getEffectiveOwnerId` 호출해도 본인 tier ≤ 1 이거나 owner가 아니면 Self View 분기
3. `supabase.from('ai_generation_logs').select('created_at, mode, credits_used').eq('user_id', user.id).gte('created_at', fromISO).eq('step', 1)` 직접 쿼리 (RLS 통과)
4. 동일 Recharts 컴포넌트에 "내 데이터"로 바인딩, Member Contribution 섹션 미렌더

**에러 흐름:**
1. RPC 타임아웃/500 에러 → TanStack Query `onError` → 상단 red 배너 + Retry 버튼
2. 권한 불충분 (RPC 내부 검증 실패로 빈 결과) → "No data" Empty State 대신 403 배너 "You don't have permission to view team usage"
3. ai_generation_logs 테이블 최초 로딩 중 오류 → Skeleton → 3초 후 에러 배너

### 4-2. 비즈니스 규칙

| 규칙 ID | 규칙 | 비고 |
|---------|------|------|
| BR-1 | Billing entity는 `projects.owner_id` (= effective owner). 팀 usage scope = owner ∪ owner 소유 프로젝트 `project_members.user_id` | 기존 `get_ai_shared_pool_usage` 와 동일 정책 |
| BR-2 | 집계 대상은 `step = 1` 행만 (quota 차감 대상과 일치) | `step=2` 는 보정/재호출로 과금 제외 |
| BR-3 | `credits_used` NULL 시 1로 간주 (`COALESCE(credits_used, 1)`) | 20260415 이전 legacy row 호환 |
| BR-4 | 월 경계: UTC 00:00 기준 1일 | `startOfUtcMonth()` 재사용 |
| BR-5 | `run-summary` mode는 내부 action 구분 없이 "Run Analysis" 단일 카테고리로 표기 | KD-4 준수. action 분리는 별도 이슈 |
| BR-6 | 플랜별 조회 기간 상한: Free 30d, Hobby 90d, Starter 6m, Professional 12m, Enterprise 24m | UI 단에서 하드코딩 (retention policy는 OOS) |
| BR-7 | Mode 색상 매핑은 하드코딩된 상수로 고정 — 새 mode 추가 시 상수 업데이트 필수 | `MODE_COLORS` in `src/lib/aiUsageMeta.ts` |
| BR-8 | Self View는 RPC 미호출, RLS 직접 쿼리로 처리 — 네트워크/DB 비용 최소화 | AC-22 |
| BR-9 | Owner/Admin 판별: `subscription_tier >= 2` (본인 billing) OR `organization_members.role IN ('owner','admin')` | RBAC 확장 고려 |

### 4-3. 권한 (RBAC)

탭은 조회(CRUD의 R)만 존재. 생성/수정/삭제 없음.

| 역할 | Team View 조회 | Self View 조회 | Export CSV | Burn Rate 카드 |
|------|---------|---------|-----------|--------------|
| Owner | ✓ | ✓ | ✓ | ✓ (한도 + 플랜 업그레이드 CTA 포함) |
| Admin | ✓ | ✓ | ✓ | ✓ (한도만, 플랜 CTA 없음) |
| Manager | ✗ | ✓ | ✗ | ✓ (self 기준) |
| Tester | ✗ | ✓ | ✗ | ✓ (self 기준) |
| Viewer | ✗ | ✓ | ✗ | ✓ (self 기준) |
| Guest | ✗ | ✗ | ✗ | ✗ |

**권한 없는 접근 시 UX:** 403 배너 "You don't have permission to view team usage" + "Contact your Owner" CTA. 로그아웃 상태면 `/auth` 로 리다이렉트.

### 4-4. 플랜별 제한

| 플랜 | 조회 가능 기간 | Team View | Export CSV | 월 credits |
|------|------------|-----------|-----------|-----------|
| Free | 30일 | N/A (팀 기능 없음, Self만) | ✗ | 3 |
| Hobby | 90일 | Admin+ 접근 | ✓ | 15 |
| Starter | 6개월 | Admin+ 접근 | ✓ | 30 |
| Professional | 12개월 | Admin+ 접근 | ✓ | 150 |
| Enterprise (S/M/L) | 24개월 | Admin+ 접근 | ✓ | 무제한 (-1) |

**초과 시 동작:** 조회 기간 드롭다운에서 상한 초과 옵션은 disable + 툴팁 "Upgrade to {TierName} to view longer history".

---

## 5. 데이터 설계

### 신규 테이블

**없음.** 연구 결과(§Executive Summary)대로 `ai_generation_logs` 재사용.

### 기존 테이블 변경

| 테이블 | 변경 내용 | 마이그레이션 필요 |
|--------|---------|----------------|
| `ai_generation_logs` | 데이터 변경 없음. 신규 composite index 추가만. | Y |

**신규 인덱스:**

```sql
-- 집계 쿼리 최적화: WHERE user_id IN (...) AND step=1 AND created_at >= ? GROUP BY date, mode
-- 기존 idx_ai_generation_logs_credits (user_id, step, created_at DESC) INCLUDE (credits_used) 가 있으나
-- mode 컬럼이 인덱스에 없어서 GROUP BY mode 시 추가 lookup 발생.
CREATE INDEX IF NOT EXISTS idx_ai_generation_logs_owner_date
  ON ai_generation_logs (user_id, step, created_at DESC)
  INCLUDE (mode, credits_used, project_id, tokens_used)
  WHERE step = 1;
```

### 신규 RPC: `get_ai_usage_breakdown`

```sql
-- ============================================================
-- AI Usage Breakdown — f011 Dev Spec §5
--
-- 반환: day × mode × user 단위 credits_sum, call_count, tokens_sum
-- 보안: SECURITY DEFINER, caller 검증 (owner 본인 또는 owner 소유 프로젝트의
--       organization admin) — 검증 실패 시 빈 결과 반환 (에러 throw 하지 않음 → 응답 폭발 방지)
-- 날짜 경계: p_from 이상 p_to 미만, UTC 기준. day 버킷은 date_trunc('day', created_at AT TIME ZONE 'UTC')
-- ============================================================

CREATE OR REPLACE FUNCTION get_ai_usage_breakdown(
  p_owner_id   uuid,
  p_from       timestamptz,
  p_to         timestamptz
)
RETURNS TABLE (
  day           date,
  mode          text,
  user_id       uuid,
  credits_sum   bigint,
  call_count    bigint,
  tokens_sum    bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH caller_authorized AS (
    -- 호출자(auth.uid()) 가 p_owner_id 본인이거나,
    -- p_owner_id 가 소유한 프로젝트에서 organization admin+ 역할인 경우만 통과
    SELECT 1
    WHERE  auth.uid() = p_owner_id
       OR  EXISTS (
             SELECT 1
             FROM   projects pr
             JOIN   organization_members om
               ON   om.organization_id = pr.organization_id
             WHERE  pr.owner_id = p_owner_id
               AND  om.user_id = auth.uid()
               AND  om.role IN ('owner', 'admin')
             LIMIT  1
           )
  ),
  team_ids AS (
    SELECT p_owner_id AS uid
    UNION
    SELECT pm.user_id
    FROM   project_members pm
    JOIN   projects p ON p.id = pm.project_id
    WHERE  p.owner_id = p_owner_id
  )
  SELECT
    (date_trunc('day', l.created_at AT TIME ZONE 'UTC'))::date       AS day,
    l.mode                                                           AS mode,
    l.user_id                                                        AS user_id,
    SUM(COALESCE(l.credits_used, 1))::bigint                         AS credits_sum,
    COUNT(*)::bigint                                                 AS call_count,
    COALESCE(SUM(l.tokens_used), 0)::bigint                          AS tokens_sum
  FROM   ai_generation_logs l
  WHERE  EXISTS (SELECT 1 FROM caller_authorized)
    AND  l.user_id IN (SELECT uid FROM team_ids)
    AND  l.step = 1
    AND  l.created_at >= p_from
    AND  l.created_at <  p_to
  GROUP  BY day, mode, l.user_id;
$$;

COMMENT ON FUNCTION get_ai_usage_breakdown(uuid, timestamptz, timestamptz) IS
  'AI usage breakdown for f011 dashboard. Returns day × mode × user rows. '
  'SECURITY DEFINER with caller authorization: owner self or org admin only.';

GRANT EXECUTE ON FUNCTION get_ai_usage_breakdown(uuid, timestamptz, timestamptz)
  TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
```

### RLS 정책

**변경 없음.** 기존 `ai_generation_logs` 의 SELECT policy (`auth.uid() = user_id`) 유지. Team 집계는 RPC 레이어가 `SECURITY DEFINER` 로 우회.

Self View에서의 직접 쿼리는 기존 RLS 그대로 통과:

```sql
-- 기존 정책 (변경 없음)
CREATE POLICY "ai_logs_select_self" ON ai_generation_logs
  FOR SELECT USING (auth.uid() = user_id);
```

---

## 6. API 설계

### Supabase Client — Team View (Owner/Admin)

```typescript
// src/hooks/useAiUsageBreakdown.ts
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

export interface AiUsageBreakdownRow {
  day: string;            // 'YYYY-MM-DD'
  mode: string;           // 'text' | 'jira' | 'session' | 'run-summary' | 'plan-assistant' | 'risk-predictor' | 'milestone-risk' | ...
  user_id: string;        // uuid
  credits_sum: number;
  call_count: number;
  tokens_sum: number;
}

export function useAiUsageBreakdown(
  ownerId: string | null,
  from: Date,
  to: Date,
) {
  return useQuery<AiUsageBreakdownRow[]>({
    queryKey: ['aiUsageBreakdown', ownerId, from.toISOString(), to.toISOString()],
    queryFn: async () => {
      if (!ownerId) return [];
      const { data, error } = await supabase.rpc('get_ai_usage_breakdown', {
        p_owner_id: ownerId,
        p_from: from.toISOString(),
        p_to:   to.toISOString(),
      });
      if (error) throw error;
      return (data ?? []) as AiUsageBreakdownRow[];
    },
    enabled: !!ownerId,
    staleTime: 60_000,    // 1분 캐시 (AI 호출 빈도가 분 단위 이하)
  });
}
```

### Supabase Client — Self View (Member)

```typescript
// 같은 hook 안에서 분기. 또는 useMyAiUsage.ts 분리
const { data: rows } = await supabase
  .from('ai_generation_logs')
  .select('created_at, mode, credits_used, tokens_used')
  .eq('user_id', user.id)
  .eq('step', 1)
  .gte('created_at', from.toISOString())
  .lt('created_at', to.toISOString())
  .order('created_at', { ascending: false });
// 클라이언트에서 day × mode grouping
```

### 에러 케이스

| 케이스 | 응답 | UI 처리 |
|--------|------|---------|
| RPC 권한 검증 실패 | `data = []`, `error = null` | Empty State ("No data for this period") |
| RPC PostgREST 500 | `error: { code, message }` | Red 배너 + Retry 버튼 |
| 네트워크 오프라인 | `error: FetchError` | Red 배너 "Offline. Please check your connection." |
| ownerId null (세션 만료) | RPC 호출 자체 skip | `/auth` redirect |

---

## 7. UI 라우트 & 컴포넌트 분해

### 라우트

**위치:** 기존 `/settings` 페이지의 Tab Navigation에 **`ai-usage` 탭 추가** (KD-2 선택지 A 채택).

**이유:**
1. AI usage는 billing entity(owner) 단위 — 프로젝트별이 아님
2. 기존 Settings에 `billing` 탭이 이미 있고, AI 사용량은 billing context와 인접
3. Project-level 탭을 추가하면 프로젝트별 필터가 필요해져 스코프가 커짐 (현재 범위에 프로젝트 필터는 OOS)

**URL:** `/settings?tab=ai-usage`

### 컴포넌트 분해

| 파일 | 신규/재사용 | 역할 |
|------|-----------|------|
| `src/pages/settings/components/AiUsagePanel.tsx` | 신규 | AI Usage 탭 루트 컴포넌트, 권한 분기 (Team/Self) |
| `src/pages/settings/components/ai-usage/BurnRateCard.tsx` | 신규 | 이번 달 사용량/한도/예상 소진일 카드 |
| `src/pages/settings/components/ai-usage/DailyUsageChart.tsx` | 신규 | Recharts stacked bar chart |
| `src/pages/settings/components/ai-usage/ModeBreakdownTable.tsx` | 신규 | mode별 합계 테이블 |
| `src/pages/settings/components/ai-usage/MemberContributionTable.tsx` | 신규 | 멤버별 기여도 테이블 + profiles join |
| `src/pages/settings/components/ai-usage/PeriodFilter.tsx` | 신규 | 30d/90d/6m 드롭다운 + 플랜 제한 |
| `src/pages/settings/components/ai-usage/ExportCsvButton.tsx` | 신규 | CSV 내보내기 (기존 `ExportModal` 패턴 참조, 별도 파일로 분리) |
| `src/pages/settings/components/ai-usage/EmptyState.tsx` | 재사용 | `src/components/EmptyState.tsx` |
| `src/hooks/useAiUsageBreakdown.ts` | 신규 | Team View용 RPC 훅 |
| `src/hooks/useMyAiUsage.ts` | 신규 | Self View용 직접 쿼리 훅 |
| `src/lib/aiUsageMeta.ts` | 신규 | `MODE_COLORS`, `MODE_LABELS`, `normalizeMode()` (run-summary → run-analysis) |
| `src/types/aiUsage.ts` | 신규 | `AiUsageBreakdownRow`, `DailySeries`, `MemberContribution` 타입 |

### 수정 파일

| 파일 | 변경 내용 |
|------|---------|
| `src/pages/settings/page.tsx` | (1) Tab 배열에 `{ key: 'ai-usage', label: 'AI Usage', icon: 'ri-sparkling-2-fill', iconColor: '#8B5CF6' }` 추가 (line ~1897). (2) `activeTab` 타입 union에 `'ai-usage'` 추가 (line 355). (3) `{activeTab === 'ai-usage' && <AiUsagePanel />}` 렌더 블록 추가 (line ~3825 근처). |
| `src/pages/project-detail/page.tsx` | AI Usage 사이드바 카드(line 1272–1315)에 "View Details" 링크 추가 → `/settings?tab=ai-usage` 로 이동 |
| `src/i18n/local/en/settings.ts` | §10 신규 키 추가 (`aiUsage.*`) |
| `src/i18n/local/ko/settings.ts` | §10 신규 키 추가 (한국어) |
| `supabase/migrations/20260424_f011_ai_usage_breakdown_rpc.sql` | 신규 마이그레이션 (인덱스 + RPC) |

### 차트 라이브러리

- **Recharts 3.2.0** 재사용 (이미 `src/pages/stats/PassRateReportPage.tsx` 에서 사용 중) — 신규 라이브러리 도입 불필요

---

## 8. 엣지 케이스

| 케이스 | 예상 동작 |
|--------|---------|
| 사용 데이터 0건 | EmptyState + "Try AI Generation" CTA → `/projects/:id/testcases?generate=ai` |
| 네트워크 끊김 | React Query 자동 retry 1회 후 실패 시 red 배너 + Retry 버튼, 차트는 회색 placeholder |
| RPC 타임아웃 (>5s) | `useQuery` staleTime 내면 stale 데이터 표시, 아니면 에러 배너 |
| 동시 탭 편집 (다른 브라우저에서 AI 호출 발생) | 1분 staleTime 만료 후 refetch로 자동 반영. 수동 "Refresh" 버튼도 제공 |
| 100명 초과 팀 (Enterprise L) | Member Contribution 테이블은 100행 virtualized list (`@tanstack/react-virtual` 재사용). >100명 시 "and N more" 표기 |
| 권한 없음 (Member가 URL 직접 접근) | 페이지는 렌더되지만 Team View 섹션 미노출, Self View만 표시 (`AC-2`) |
| 플랜 제한 초과 기간 선택 시도 | 드롭다운 옵션 disabled + 툴팁 업그레이드 CTA |
| `run-summary` 내부 action 구분 필요 요청 | v1에서는 "Run Analysis" 단일 버킷. 별도 이슈 `#f011-followup-mode-split` 등록 (OOS) |
| `tokens_used` 일부 함수만 저장하는 현황 | UI에 노출하지 않고 RPC는 반환만 함 (향후 일관성 확보 후 노출, OOS) |
| Enterprise unlimited (limit=-1) | Burn Rate 카드에 "Unlimited (N used)" 표기, 프로그레스 바 미렌더 |
| 초기 마이그레이션 이후 row=0 | RPC 정상 동작, 빈 결과 → Empty State |
| owner가 `organization_members` 에 없는 edge (personal org만) | personal org의 owner는 본인 = `auth.uid() = p_owner_id` 경로로 통과 |
| subscription_tier 중간에 변경됨 | `getEffectiveOwnerId` 재호출 시 반영, staleTime 60초 |
| 매우 긴 email/name | `truncate` CSS + title 속성 툴팁 |

---

## 9. 성능 / 캐시 전략

| 지표 | 목표 | 달성 방법 |
|------|------|----------|
| RPC p95 | < 500ms | composite index `idx_ai_generation_logs_owner_date` + step=1 partial index |
| RPC p99 | < 1s | staleTime 60초로 빈번 refetch 억제 |
| Initial render TTI | < 1.5s | Recharts lazy import, Self View는 RLS 직접 쿼리 (RPC 생략) |
| 월별 데이터 크기 | 1,000 rows/team 예상 (150 credits × 100명 × 30일 / group by 약분) | 데이터 증가 시 aggregate snapshot 테이블 도입 고려 (OOS) |

**캐시:**
- TanStack Query staleTime 60초, gcTime 5분
- 별도 Redis/edge cache 불필요 (팀 단위 집계는 사용 빈도 낮음)

---

## 10. 마이그레이션 파일

**파일명:** `supabase/migrations/20260424_f011_ai_usage_breakdown_rpc.sql`

**내용:** §5 의 `CREATE INDEX ... idx_ai_generation_logs_owner_date` + `CREATE OR REPLACE FUNCTION get_ai_usage_breakdown(...)` + `GRANT EXECUTE` + `NOTIFY pgrst, 'reload schema'`.

**Idempotency:** `CREATE INDEX IF NOT EXISTS`, `CREATE OR REPLACE FUNCTION`, `GRANT EXECUTE` — `supabase db reset` 여러 번 실행 안전.

**롤백:**

```sql
-- 롤백 스크립트 (별도 파일 저장 불필요, 주석으로만)
DROP FUNCTION IF EXISTS get_ai_usage_breakdown(uuid, timestamptz, timestamptz);
DROP INDEX IF EXISTS idx_ai_generation_logs_owner_date;
```

---

## 11. Out of Scope (v1에서 제외, v1.1 백로그)

- [ ] **OOS-1:** `ai_generation_logs` retention policy 마이그레이션 (90일 cold archival / aggregate snapshot 테이블) — 별도 이슈
- [ ] **OOS-2:** `run-summary` mode를 `run_summary` / `coverage_gap` / `flaky_analysis` 3개로 분리하는 Edge Function + DB CHECK 변경 — 별도 이슈 `#f011-followup-mode-split`
- [ ] **OOS-3:** Burn rate alert (이메일/Slack/webhook) — 별도 이슈 `#f012-ai-burn-rate-alerts`
- [ ] **OOS-4:** 프로젝트별 AI 사용량 필터 (`project_id` 선택) — v1.2 백로그
- [ ] **OOS-5:** `tokens_used` UI 노출 (모든 Edge Function이 tokens_used 저장하도록 통일한 후) — 별도 이슈
- [ ] **OOS-6:** 시간대별 drilldown (시/분 단위 차트) — Anthropic Console 수준, 현 단계 불필요
- [ ] **OOS-7:** 월 예산 한도 수동 설정(spending cap) — Qase AIDEN 수준, 현 단계 불필요
- [ ] **OOS-8:** AI usage anomaly detection (전주 대비 spike 자동 탐지) — v2.0
- [ ] **OOS-9:** 한도 초과 직전 차단/승인 워크플로우 — 현재는 백엔드 `checkAiAccess()` 가 자동 block
- [ ] **OOS-10:** Slack/Discord로 월별 usage 리포트 전송 — marketer가 이메일 캠페인으로 우선 대응

---

## 12. i18n 키 (EN / KO)

> 모두 `settings` 네임스페이스 내 `aiUsage.*` 로 추가. 총 27개.

| 키 | EN | KO |
|----|----|----|
| `settings.aiUsage.tab` | "AI Usage" | "AI 사용량" |
| `settings.aiUsage.title` | "AI Credit Usage" | "AI 크레딧 사용량" |
| `settings.aiUsage.subtitle.team` | "See how your team is consuming AI credits this period." | "이번 기간 동안 팀의 AI 크레딧 사용 현황을 확인하세요." |
| `settings.aiUsage.subtitle.self` | "See your personal AI credit consumption this period." | "이번 기간의 개인 AI 크레딧 사용 현황을 확인하세요." |
| `settings.aiUsage.burnRate.title` | "Monthly Burn Rate" | "월간 소진율" |
| `settings.aiUsage.burnRate.used` | "{{used}} / {{limit}} credits used" | "{{used}} / {{limit}} 크레딧 사용" |
| `settings.aiUsage.burnRate.unlimited` | "Unlimited ({{used}} used)" | "무제한 ({{used}} 사용)" |
| `settings.aiUsage.burnRate.daysLeft` | "{{n}} days left in billing cycle" | "청구 주기 {{n}}일 남음" |
| `settings.aiUsage.burnRate.estimatedDepletion` | "Estimated depletion: {{date}}" | "예상 소진일: {{date}}" |
| `settings.aiUsage.burnRate.onTrack` | "On track" | "정상 페이스" |
| `settings.aiUsage.burnRate.warning` | "Usage is outpacing plan" | "사용량이 플랜을 초과할 추세입니다" |
| `settings.aiUsage.period.30d` | "Last 30 days" | "최근 30일" |
| `settings.aiUsage.period.90d` | "Last 90 days" | "최근 90일" |
| `settings.aiUsage.period.6m` | "Last 6 months" | "최근 6개월" |
| `settings.aiUsage.period.12m` | "Last 12 months" | "최근 12개월" |
| `settings.aiUsage.period.upgradeTooltip` | "Upgrade to {{tier}} to view longer history" | "{{tier}} 플랜으로 업그레이드하여 더 긴 기록 보기" |
| `settings.aiUsage.chart.title` | "Daily Usage" | "일별 사용량" |
| `settings.aiUsage.chart.yAxis` | "Credits" | "크레딧" |
| `settings.aiUsage.chart.ariaLabel` | "Daily AI credit usage stacked bar chart" | "일별 AI 크레딧 사용량 누적 막대 차트" |
| `settings.aiUsage.mode.text` | "Test Cases (Text)" | "테스트 케이스 (텍스트)" |
| `settings.aiUsage.mode.jira` | "Test Cases (Jira)" | "테스트 케이스 (Jira)" |
| `settings.aiUsage.mode.session` | "Test Cases (Session)" | "테스트 케이스 (세션)" |
| `settings.aiUsage.mode.runAnalysis` | "Run Analysis" | "런 분석" |
| `settings.aiUsage.mode.planAssistant` | "Plan Assistant" | "플랜 어시스턴트" |
| `settings.aiUsage.mode.riskPredictor` | "Risk Predictor" | "리스크 예측" |
| `settings.aiUsage.mode.milestoneRisk` | "Milestone Risk" | "마일스톤 리스크" |
| `settings.aiUsage.mode.requirementSuggest` | "Requirement Suggestions" | "요구사항 제안" |
| `settings.aiUsage.mode.other` | "Other" | "기타" |
| `settings.aiUsage.modeBreakdown.title` | "Breakdown by Feature" | "기능별 분해" |
| `settings.aiUsage.modeBreakdown.colFeature` | "Feature" | "기능" |
| `settings.aiUsage.modeBreakdown.colCredits` | "Credits" | "크레딧" |
| `settings.aiUsage.modeBreakdown.colPercent` | "% of total" | "전체 대비 %" |
| `settings.aiUsage.modeBreakdown.colCalls` | "Calls" | "호출 수" |
| `settings.aiUsage.memberTable.title` | "Team Contribution" | "팀원별 기여도" |
| `settings.aiUsage.memberTable.colMember` | "Member" | "팀원" |
| `settings.aiUsage.memberTable.colCredits` | "Credits used" | "사용 크레딧" |
| `settings.aiUsage.memberTable.more` | "and {{n}} more" | "외 {{n}}명" |
| `settings.aiUsage.empty.title` | "No AI usage yet" | "아직 AI 사용량이 없습니다" |
| `settings.aiUsage.empty.body` | "Start generating test cases with AI to see usage here." | "AI로 테스트 케이스를 생성하면 이곳에 사용량이 표시됩니다." |
| `settings.aiUsage.empty.cta` | "Try AI Generation" | "AI 생성 시작하기" |
| `settings.aiUsage.error.title` | "Failed to load AI usage" | "AI 사용량을 불러오지 못했습니다" |
| `settings.aiUsage.error.retry` | "Retry" | "다시 시도" |
| `settings.aiUsage.error.forbidden` | "You don't have permission to view team usage" | "팀 사용량을 볼 권한이 없습니다" |
| `settings.aiUsage.export.button` | "Export CSV" | "CSV 내보내기" |
| `settings.aiUsage.export.filename` | "ai-usage-{{date}}.csv" | "ai-usage-{{date}}.csv" |
| `settings.aiUsage.refresh` | "Refresh" | "새로고침" |
| `settings.aiUsage.viewDetails` | "View Details" | "자세히 보기" |

**개수:** 47개 i18n 키 (최소 요구 20개 초과 달성).

---

## 13. 종속성 / 병렬 작업

- **선행 필요:** `getEffectiveOwnerId` (이미 존재), `get_ai_shared_pool_usage` RPC (이미 존재)
- **병렬 가능:** @designer의 design-spec-f011 작성은 이 Dev Spec 승인 직후 시작 가능
- **충돌 파일:** `src/pages/settings/page.tsx` (tab 배열, activeTab union) — 다른 설정 탭 PR 과 머지 순서 조율 필요

---

## 개발 착수 전 체크리스트

- [x] 수용 기준이 전부 테스트 가능한 문장인가 (22개, 각 AC에 검증 방법 명시)
- [x] DB 스키마가 컬럼 타입/제약조건까지 명시되었는가 (신규 테이블 없음, RPC 반환 shape SQL로 명시)
- [x] RLS 정책이 정의되었는가 (변경 없음 선언 + SECURITY DEFINER caller 검증 SQL 포함)
- [x] 플랜별 제한이 명시되었는가 (§4-4 표)
- [x] RBAC 권한 매트릭스가 있는가 (§4-3 표)
- [x] 변경 파일 목록이 구체적인가 (§7, 실제 경로/라인 번호 기반)
- [x] 엣지 케이스가 식별되었는가 (13개, §8)
- [x] Out of Scope이 명시되었는가 (10개, §11)
- [x] i18n 키가 en/ko 둘 다 있는가 (47개, §12)
- [x] 마이그레이션 파일명 규칙 명시 (§10)
- [x] 성능 목표 명시 (§9, p95 < 500ms)
- [x] API 반환 TypeScript 타입 포함 (§6 `AiUsageBreakdownRow`)
- [ ] 관련 디자인 명세가 Approved 상태인가 (→ @designer 단계)
