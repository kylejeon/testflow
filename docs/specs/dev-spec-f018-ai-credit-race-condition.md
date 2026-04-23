# Dev Spec: f018 — AI Credit 소비 Race Condition 방어 (Advisory Lock)

> **작성일:** 2026-04-23
> **작성자:** PM (Planner)
> **상태:** Draft → Review → Approved
> **관련 디자인:** 없음 (백엔드 전용, UI 변경 無)
> **Feature ID:** f018 (priority: P2, impact: medium, effort: small, category: security)
> **보안 태그:** SEC-H-2
> **타임라인:** 2026-05-11 SDK 런칭 **전 필수 배포**

---

## 1. 개요

- **문제:** Edge Function이 `checkAiAccess` 로 usage 를 SUM 조회한 뒤 Claude API 호출 후 `ai_generation_logs` INSERT 하는 구조라, **SELECT 와 INSERT 사이에 원자성이 없어** 동시 N 요청 시 owner 팀의 shared-pool credit 이 monthly limit 을 N-1 개까지 over-shoot 가능. Hobby 한도 15 에서 동시 5 요청 → 실제 20 차감, AI Usage KPI UI 가 "20 / 15" 로 표시되어 UX 붕괴.
- **해결:** PostgreSQL `pg_advisory_xact_lock(owner_id hash)` 기반의 `SECURITY DEFINER` RPC `consume_ai_credit_and_log()` 로 (usage SUM → limit 재확인 → INSERT) 를 **owner 단위 직렬화된 단일 트랜잭션**으로 묶는다. 4개 Edge Function 의 `INSERT INTO ai_generation_logs` 호출 지점을 이 RPC 로 교체.
- **성공 지표:**
  - Hobby 계정(limit=15) 을 대상으로 동시 5 req 부하 테스트 시 `SUM(credits_used) ≤ 15` 보장 (현재는 최대 20).
  - `consume_ai_credit_and_log` 호출 p95 latency < 100ms (Claude 호출 제외).
  - 기존 단일 요청 플로우 회귀 없음 (generate-testcases 단일 호출 E2E 통과).

---

## 2. 유저 스토리

- **As a** Hobby 구독자 Alice (월 15 credit),
  **I want to** 동시에 여러 탭에서 AI TC 생성을 눌러도
  **so that** "15 / 15" 를 넘는 차감이 발생하지 않고, 초과분은 "quota reached" 로 명확히 거부되어야 한다.
- **As a** Pro owner Bob (월 150 credit, 5명 팀),
  **I want to** 팀원 전원이 동일 시각에 AI Risk Predictor 를 요청해도
  **so that** shared pool 합계가 정확히 150 에서 멈추고, 151 번째 요청은 HTTP 429 로 거부되어야 한다.
- **As a** Site Reliability 엔지니어,
  **I want to** RPC 내부에서 advisory lock contention / retry 이벤트를 로깅하도록
  **so that** 향후 대시보드에서 burst 패턴을 추적할 수 있다.

---

## 3. 수용 기준 (Acceptance Criteria)

### DB / RPC 계약

- [ ] **AC-1 (RPC 시그니처):** `consume_ai_credit_and_log(p_user_id uuid, p_owner_id uuid, p_project_id uuid, p_mode text, p_step int, p_credit_cost int, p_tokens_used int, p_latency_ms int, p_input_data jsonb, p_output_data jsonb, p_titles_generated int default null, p_titles_selected int default null, p_model_used text default null, p_session_id uuid default null, p_input_text text default null)` RETURNS jsonb. 반환 JSON: `{"allowed": bool, "used": bigint, "limit": int, "credit_cost": int, "log_id": uuid | null, "reason": null | "quota_exceeded"}`.
- [ ] **AC-2 (SECURITY DEFINER + search_path):** 함수는 `LANGUAGE plpgsql SECURITY DEFINER SET search_path = public`. `GRANT EXECUTE` 를 `authenticated, service_role` 에게만 부여 (anon 차단).
- [ ] **AC-3 (Advisory lock 키):** 락 키는 `pg_advisory_xact_lock(hashtextextended('ai_credit:' || p_owner_id::text, 0))`. 트랜잭션 종료 시 자동 해제 (xact-scoped). 동일 트랜잭션 내 타 락 호출 없음 → 데드락 불가.
- [ ] **AC-4 (원자적 재검증):** 락 획득 후 RPC 내부에서 `get_ai_shared_pool_usage(p_owner_id)` 를 다시 호출하여 usage 재계산. 계산된 `used + p_credit_cost > limit` 인 경우 INSERT 하지 않고 `{allowed:false, reason:"quota_exceeded"}` 반환.
- [ ] **AC-5 (Unlimited tier skip):** `p_credit_cost` 가 0 이거나 호출자가 unlimited tier(limit=-1)인 경우에도 RPC 는 lock + INSERT 를 수행하되 limit 체크를 skip. (tier/limit 판단은 호출자 책임이며, RPC 는 `p_limit int default -1` 파라미터로 전달받음 → AC-1 파라미터에 `p_limit` 포함으로 확정.)
- [ ] **AC-6 (Limit 전달):** AC-1 파라미터 목록에 **`p_limit int`** 추가. Edge Function 이 `PLAN_LIMITS[tier]` 를 그대로 전달. `-1` 이면 무제한, `>=0` 이면 hard cap. (이로써 RPC 는 profiles/subscription 쿼리를 다시 하지 않음 → latency 최소화.)

### Advisory Lock 수학

- [ ] **AC-7 (락 키 충돌 확률):** `hashtextextended` 는 64-bit signed bigint(`int8`) 반환. Postgres 16 문서상 seed=0 일 때 `xxhash64` 기반. Collision probability ≈ `N² / 2^64` (N = 동시 활성 owner 수). `N=1M` 기준 충돌 확률 ≈ `5.4 × 10⁻⁸` → 무시 가능. 스펙 섹션 §11 에 수치로 명시.
- [ ] **AC-8 (네임스페이스 격리):** 모든 락 키 문자열이 `'ai_credit:'` prefix 를 가져 타 기능과 충돌 불가. (코드 상 `pg_advisory_xact_lock` 사용처 기존 0건 → `rg "pg_advisory" supabase` 로 확인됨.)

### 호출 사이트 변경 (4개 Edge Function)

- [ ] **AC-9 (generate-testcases step=1):** `supabase/functions/generate-testcases/index.ts:1271-1284` (step=1 text/jira/session INSERT), `1586-1596` (run-summary INSERT), `827-837` (coverage-gap INSERT), `935-945` (requirement-suggest INSERT), `1067-1077` (flaky-analysis INSERT) — **총 5개 INSERT 지점**을 모두 `adminClient.rpc('consume_ai_credit_and_log', {...})` 로 교체. step=2 INSERT (`1307-1316`) 는 creditCost=0 이므로 **skip** (credit 차감 없음, OOS 로 명시).
- [ ] **AC-10 (milestone-risk-predictor):** `supabase/functions/milestone-risk-predictor/index.ts:559-580` INSERT 를 RPC 호출로 교체. 반환이 `allowed:false` 인 경우 기존 429 응답 포맷(`{error:'monthly_limit_reached', used, limit, upgradeUrl}`) 유지.
- [ ] **AC-11 (risk-predictor):** `supabase/functions/risk-predictor/index.ts:321-341` INSERT 를 RPC 로 교체.
- [ ] **AC-12 (plan-assistant):** `supabase/functions/plan-assistant/index.ts:308-321` INSERT 를 RPC 로 교체. 이 파일은 `tokens_used`, `latency_ms`, `output_data` 를 INSERT 하지 않던 기존 버그가 있으므로 함께 수정하여 RPC 파라미터로 전달.
- [ ] **AC-13 (checkAiAccess 유지):** `supabase/functions/_shared/ai-usage.ts:177-239` `checkAiAccess` 함수는 **변경하지 않음** (tier gate + pre-flight UX 용도). 실제 원자성 보장은 RPC 단에서 재검증으로 처리. 주석으로 "pre-flight only; authoritative check is in consume_ai_credit_and_log" 추가.

### 에러 처리 / 관측성

- [ ] **AC-14 (RPC 실패 fallback):** RPC 호출이 `error` 반환 시 Edge Function 은 `console.error('[f018] consume_ai_credit_and_log failed', { ownerId, mode, error })` 로 로깅하고, 사용자에게는 **Claude 응답은 성공적으로 반환 (payload 보존)** + 응답 meta 에 `credits_logged: false` 플래그 추가. 즉, 이미 받은 AI 결과는 버리지 않음(customer-friendly). 프론트는 이 플래그를 현재 사용하지 않으므로 추가 작업 X — 모니터링용.
- [ ] **AC-15 (Quota exceeded at RPC):** RPC 가 `allowed:false, reason:"quota_exceeded"` 반환 시 Edge Function 은 HTTP 429 + 기존 포맷 응답. AI 응답은 이미 받았으므로 **응답 payload 는 유지하되, meta 에 `credits_used: 0, credits_remaining: 0, rate_limited_post_check: true`** 표시.
- [ ] **AC-16 (RAISE NOTICE on contention):** RPC 내부에서 lock 획득까지 걸린 시간이 50ms 초과 시 `RAISE NOTICE '[f018] lock contention owner=% wait_ms=%', p_owner_id, elapsed` 호출. Supabase Postgres 로그에서 grep 으로 추적 가능. (추적용 단순 로깅, 대시보드화는 follow-up.)

### 동시성 / 성능 테스트

- [ ] **AC-17 (pgTAP 동시성 테스트):** `supabase/tests/f018_ai_credit_race.test.sql` 신규. `pg_sleep` + 두 개의 트랜잭션 블록으로 Hobby owner (limit=14 / usage=14) 에서 동시 2 호출 시뮬레이션 → 1개만 `allowed:true` 반환, 한 개는 `allowed:false, reason:"quota_exceeded"` 반환. 최종 `SUM(credits_used) = 15` assert.
- [ ] **AC-18 (Deno 통합 테스트):** `supabase/functions/tests/ai_credit_race_test.ts` 신규. Node 의 `Promise.all([ fn(), fn(), fn(), fn(), fn() ])` 5 concurrent call (Hobby, usage 11) 시 최대 4개 only allowed. service_role 로 직접 RPC 호출하는 integration 수준 테스트.
- [ ] **AC-19 (Latency):** staging 환경에서 `consume_ai_credit_and_log` 호출 100회 p50 < 50ms, p95 < 100ms (Claude 호출 미포함). 초과 시 `get_ai_shared_pool_usage` index 검토 필요 → 현재 `idx_ai_generation_logs_credits (user_id, step, created_at DESC) INCLUDE (credits_used)` 로 cover 가능.

### 회귀 / 배포

- [ ] **AC-20 (단일 요청 회귀):** 기존 E2E `generate-testcases` 단일 요청이 이전과 동일한 response shape + HTTP status 반환. Playwright/Cypress 기준 smoke 통과.
- [ ] **AC-21 (Idempotent 마이그레이션):** `CREATE OR REPLACE FUNCTION`. `supabase db reset` 여러 번 실행해도 안전.
- [ ] **AC-22 (Rollback 가능):** §12 Rollback SQL 1개 파일로 즉시 되돌릴 수 있어야 함. 호출 사이트 revert 는 git revert 단일 커밋으로.

---

## 4. 기능 상세

### 4-1. 동작 흐름

**Happy Path (여유 있는 Hobby 계정 usage=10/15):**
1. 프론트 → `supabase.functions.invoke('generate-testcases', {...})`.
2. Edge Function: `checkAiAccess(user.id, 'tc_generation_text')` — tier gate 통과, usage=10, limit=15, allowed=true.
3. Claude API 호출 (2-5s).
4. Edge Function: `adminClient.rpc('consume_ai_credit_and_log', { p_user_id, p_owner_id, p_project_id, p_mode:'text', p_step:1, p_credit_cost:1, p_limit:15, ... })`.
5. RPC 내부:
   a. `pg_advisory_xact_lock(hashtextextended('ai_credit:'||p_owner_id::text, 0))` — 즉시 획득.
   b. `v_used := get_ai_shared_pool_usage(p_owner_id);` → 10.
   c. `10 + 1 <= 15` → INSERT ai_generation_logs; `RETURN jsonb_build_object('allowed',true,'used',11,'limit',15,'log_id',new_id,'credit_cost',1)`.
6. Edge Function: `success:true, ...result, meta:{ credits_used:1, credits_remaining:4 }` 반환.

**Alternative (경계값 동시 2요청, owner usage=14/15, creditCost=1):**
1. Req A: step 1-4 Claude 호출 완료, RPC 호출 직전.
2. Req B: step 1-4 Claude 호출 완료, RPC 호출 직전.
3. Req A 의 RPC 먼저 `pg_advisory_xact_lock` 획득 → usage=14, `14+1 ≤ 15` → INSERT → return allowed:true, used=15.
4. Req B 는 Req A 의 트랜잭션 commit 까지 대기 (보통 <10ms).
5. Req A commit → lock 해제.
6. Req B RPC 가 lock 획득 → usage=15 (방금 A 가 insert), `15+1 > 15` → INSERT 하지 않고 return `{allowed:false, reason:"quota_exceeded", used:15, limit:15}`.
7. Req B Edge Function 은 HTTP 429 + AI payload 보존 응답 (AC-15).

**에러 흐름 — RPC 자체 실패 (DB down 등):**
1. `consume_ai_credit_and_log` 가 `PostgresError` throw.
2. Edge Function: `console.error('[f018] consume_ai_credit_and_log failed', ...)`.
3. 사용자에게는 `success:true, ...result, meta:{ credits_logged:false, ... }` 반환 (AC-14). AI 응답은 이미 받았으므로 손실 방지.
4. 해당 사건은 모니터링 시스템(Postgres logs + Supabase Edge Function logs grep)에서 `[f018]` 태그로 추적.

### 4-2. 비즈니스 규칙

| 규칙 ID | 규칙 | 비고 |
|---------|------|------|
| BR-1 | Lock scope = owner 단위 (project/user 아님) | shared pool 의 billing entity 와 일치 |
| BR-2 | Lock 은 xact-scoped (`pg_advisory_xact_lock`) | 세션 종료 시 누수 불가, DEADLOCK 불가 |
| BR-3 | creditCost=0 (step=2 등) INSERT 는 RPC 경유하지 않고 기존 직접 INSERT 유지 | OOS |
| BR-4 | Unlimited tier (limit=-1) 는 lock 을 획득하되 limit 체크 skip | monitoring INSERT 만 목적 |
| BR-5 | Pre-flight `checkAiAccess` 는 변경 없음 | UX hint 용도, 실제 원자성은 RPC 가 책임 |
| BR-6 | RPC 는 항상 success HTTP 응답을 위한 payload 만 반환하고, HTTP status 는 Edge Function 이 매핑 | |

### 4-3. 권한 (RBAC)

이 변경은 백엔드 전용이며 **사용자 대면 기능 없음**. 기존 RBAC 유지.

| 역할 | AI 기능 호출 | 비고 |
|------|-----------|------|
| Owner | ✓ | 변경 없음 |
| Admin | ✓ | 변경 없음 |
| Manager | ✓ (milestone-risk 는 Manager+) | 변경 없음 |
| Tester | △ (기능별) | 변경 없음 |
| Viewer | ✗ | 변경 없음 |
| Guest | ✗ | 변경 없음 |

RPC `EXECUTE` 권한은 `authenticated` + `service_role` 에만 GRANT (anon 차단). 호출은 Edge Function 이 service_role 로 수행하므로 RLS 우회 필요.

### 4-4. 플랜별 제한

shared-pool credit 한도 자체는 **변경 없음** (f018 는 hardening 이지 limit 변경이 아님).

| 플랜 | 월 credit | f018 효과 |
|------|----------|-----------|
| Free (tier 1) | 3 | 한도 over-shoot 방지 (최대 +1 에서 +0 으로) |
| Hobby (tier 2) | 15 | **핵심 타겟** — Hobby 한도 15 에서 over-shoot 방지 |
| Starter (tier 3) | 30 | 동일 |
| Professional (tier 4) | 150 | 동일 |
| Enterprise S/M/L (tier 5-7) | -1 (무제한) | RPC 는 lock + log INSERT, limit 체크 skip |

---

## 5. 데이터 설계

### 신규 테이블
없음.

### 기존 테이블 변경
없음 (schema 변경 無, RPC 만 추가).

### 신규 RPC (완전 정의)

**파일:** `supabase/migrations/20260424_f018_ai_credit_atomic_consume_rpc.sql`
(2026-04-24 로 작성. 2026-04-24 에 이미 `20260424_f011_ai_usage_breakdown_rpc.sql` 존재하므로 timestamp suffix `_02` 사용 대신 별도 파일명으로 충돌 없음.)

```sql
-- ============================================================
-- f018 — AI Credit 원자적 소비 RPC
--
-- Related spec: docs/specs/dev-spec-f018-ai-credit-race-condition.md
--
-- 목적:
--   checkAiAccess 의 SELECT SUM 과 ai_generation_logs INSERT 사이에 있는
--   race condition 을 owner 단위 advisory lock 으로 직렬화한다.
--   락 획득 후 usage 를 재계산하여 limit 초과 시 INSERT 하지 않는다.
--
-- 호출자:
--   supabase/functions/generate-testcases/index.ts (5개 지점)
--   supabase/functions/milestone-risk-predictor/index.ts
--   supabase/functions/risk-predictor/index.ts
--   supabase/functions/plan-assistant/index.ts
--
-- Idempotency: CREATE OR REPLACE FUNCTION
-- Rollback: 본 파일 하단 주석 참조
-- ============================================================

CREATE OR REPLACE FUNCTION consume_ai_credit_and_log(
  p_user_id           uuid,
  p_owner_id          uuid,
  p_project_id        uuid,
  p_mode              text,
  p_step              int,
  p_credit_cost       int,
  p_limit             int,
  p_tokens_used       int       DEFAULT 0,
  p_latency_ms        int       DEFAULT 0,
  p_input_data        jsonb     DEFAULT NULL,
  p_output_data       jsonb     DEFAULT NULL,
  p_titles_generated  int       DEFAULT NULL,
  p_titles_selected   int       DEFAULT NULL,
  p_model_used        text      DEFAULT NULL,
  p_session_id        uuid      DEFAULT NULL,
  p_input_text        text      DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lock_key       bigint;
  v_lock_start     timestamptz := clock_timestamp();
  v_lock_wait_ms   int;
  v_used           bigint;
  v_log_id         uuid;
  v_month_start    timestamptz := date_trunc('month', (now() AT TIME ZONE 'UTC')) AT TIME ZONE 'UTC';
BEGIN
  -- Input validation
  IF p_owner_id IS NULL OR p_user_id IS NULL THEN
    RAISE EXCEPTION 'p_owner_id and p_user_id are required';
  END IF;
  IF p_credit_cost < 0 THEN
    RAISE EXCEPTION 'p_credit_cost must be >= 0';
  END IF;

  -- 1) Advisory xact-lock: owner 단위 직렬화.
  --    hashtextextended 는 64-bit. seed=0.
  --    prefix 'ai_credit:' 로 네임스페이스 격리 (타 기능과 충돌 불가).
  v_lock_key := hashtextextended('ai_credit:' || p_owner_id::text, 0);
  PERFORM pg_advisory_xact_lock(v_lock_key);

  -- Observability: lock 획득까지 걸린 시간 기록 (50ms 초과만 로깅)
  v_lock_wait_ms := EXTRACT(MILLISECOND FROM (clock_timestamp() - v_lock_start))::int;
  IF v_lock_wait_ms > 50 THEN
    RAISE NOTICE '[f018] lock contention owner=% wait_ms=%', p_owner_id, v_lock_wait_ms;
  END IF;

  -- 2) 재검증: 락 안에서 usage 를 다시 계산.
  --    기존 get_ai_shared_pool_usage 재사용 (20260420_ai_usage_rpc.sql).
  v_used := get_ai_shared_pool_usage(p_owner_id, v_month_start);

  -- 3) Quota 초과 판정 (p_limit = -1 이면 무제한 → skip).
  IF p_limit >= 0 AND (v_used + p_credit_cost) > p_limit THEN
    RETURN jsonb_build_object(
      'allowed',     false,
      'reason',      'quota_exceeded',
      'used',        v_used,
      'limit',       p_limit,
      'credit_cost', p_credit_cost,
      'log_id',      NULL
    );
  END IF;

  -- 4) INSERT (원자적으로 lock 안에서 수행)
  INSERT INTO ai_generation_logs (
    user_id, project_id, mode, step,
    credits_used, tokens_used, latency_ms,
    input_data, output_data,
    titles_generated, titles_selected,
    model_used, session_id, input_text
  ) VALUES (
    p_user_id, p_project_id, p_mode, p_step,
    p_credit_cost, COALESCE(p_tokens_used, 0), COALESCE(p_latency_ms, 0),
    p_input_data, p_output_data,
    p_titles_generated, p_titles_selected,
    p_model_used, p_session_id, p_input_text
  )
  RETURNING id INTO v_log_id;

  -- 5) 성공 반환 (used 는 INSERT 이후 합계)
  RETURN jsonb_build_object(
    'allowed',     true,
    'used',        v_used + p_credit_cost,
    'limit',       p_limit,
    'credit_cost', p_credit_cost,
    'log_id',      v_log_id,
    'reason',      NULL
  );
END;
$$;

COMMENT ON FUNCTION consume_ai_credit_and_log(
  uuid, uuid, uuid, text, int, int, int,
  int, int, jsonb, jsonb, int, int, text, uuid, text
) IS
  'f018 — owner-level advisory lock + re-check + INSERT. '
  'Guarantees SUM(credits_used) <= p_limit under concurrent requests. '
  'Callers: generate-testcases, milestone-risk-predictor, risk-predictor, plan-assistant. '
  'Related: checkAiAccess is pre-flight only; this RPC is authoritative.';

REVOKE ALL ON FUNCTION consume_ai_credit_and_log(
  uuid, uuid, uuid, text, int, int, int,
  int, int, jsonb, jsonb, int, int, text, uuid, text
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION consume_ai_credit_and_log(
  uuid, uuid, uuid, text, int, int, int,
  int, int, jsonb, jsonb, int, int, text, uuid, text
) TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';

-- ── Rollback (수동 실행) ─────────────────────────────────────────
-- DROP FUNCTION IF EXISTS consume_ai_credit_and_log(
--   uuid, uuid, uuid, text, int, int, int,
--   int, int, jsonb, jsonb, int, int, text, uuid, text
-- );
-- NOTIFY pgrst, 'reload schema';
-- 호출 사이트 revert: git revert <commit-sha>
```

### RLS 정책

변경 없음. `ai_generation_logs` RLS 는 기존 `auth.uid() = user_id` 유지. RPC 는 SECURITY DEFINER 로 RLS 우회하되 `GRANT EXECUTE` 제한으로 호출자 통제.

---

## 6. API 설계

### Supabase Edge Function → RPC 호출 패턴

**호출 전 (변경 전 — 모든 Edge Function 공통):**
```typescript
await adminClient.from('ai_generation_logs').insert({
  user_id: user.id,
  project_id,
  mode: 'run-summary',
  step: 1,
  credits_used: AI_FEATURES.run_summary.creditCost,
  tokens_used: tokensUsed,
  latency_ms: latencyMs,
  input_data: { ... },
  output_data: aiSummary,
});
```

**호출 후 (변경 후 — 모든 Edge Function 공통):**
```typescript
const { data: consume, error: consumeErr } = await adminClient.rpc(
  'consume_ai_credit_and_log',
  {
    p_user_id: user.id,
    p_owner_id: ownerId,                         // checkAiAccess 에서 얻음
    p_project_id: projectId,
    p_mode: 'run-summary',
    p_step: 1,
    p_credit_cost: AI_FEATURES.run_summary.creditCost,
    p_limit: PLAN_LIMITS[tier] ?? -1,
    p_tokens_used: tokensUsed,
    p_latency_ms: latencyMs,
    p_input_data: { run_id, total_tcs: totalCount, locale },
    p_output_data: aiSummary,
  }
);

if (consumeErr) {
  console.error('[f018] consume_ai_credit_and_log failed', { ownerId, mode: 'run-summary', err: consumeErr });
  // AI payload 보존. meta 에 credits_logged:false 추가.
  return jsonResponse({
    success: true,
    summary: aiSummary,
    usage: { current: -1, limit: PLAN_LIMITS[tier] },
    meta: { credits_logged: false, error: 'credit_log_failed' },
  });
}

if (!consume.allowed) {
  // quota 초과 (lock 안에서 재검증 실패)
  return jsonResponse({
    error: 'monthly_limit_reached',
    used: consume.used,
    limit: consume.limit,
    upgradeUrl: 'https://testably.app/pricing',
    // AI 응답 payload 는 보존 (이미 Claude 호출됨)
    summary: aiSummary,
    meta: { credits_used: 0, credits_logged: false, rate_limited_post_check: true },
  }, 429);
}

// Happy path
return jsonResponse({
  success: true,
  summary: aiSummary,
  usage: { current: consume.used, limit: consume.limit },
  meta: {
    credits_used: consume.credit_cost,
    credits_remaining: consume.limit === -1 ? -1 : Math.max(0, consume.limit - consume.used),
    log_id: consume.log_id,
  },
});
```

---

## 7. 영향 범위 (변경 파일 목록)

### 신규 파일

| 파일 | 역할 |
|------|------|
| `supabase/migrations/20260424_f018_ai_credit_atomic_consume_rpc.sql` | RPC 정의 + GRANT |
| `supabase/tests/f018_ai_credit_race.test.sql` | pgTAP 동시성 테스트 (AC-17) |
| `supabase/functions/tests/ai_credit_race_test.ts` | Deno integration 테스트 (AC-18) |

### 수정 파일

| 파일 | 변경 내용 |
|------|---------|
| `supabase/functions/generate-testcases/index.ts` | 5개 INSERT 지점을 `rpc('consume_ai_credit_and_log', ...)` 로 교체. 지점: step1 generate(1271-1284), run-summary(586-596), coverage-gap(827-837), requirement-suggest(935-945), flaky-analysis(1067-1077). step2 INSERT(1307-1316) 는 credit 0 이므로 변경 X. |
| `supabase/functions/milestone-risk-predictor/index.ts` | INSERT(559-580) 를 RPC 로 교체. 응답 meta 에 `credits_logged` 추가 (AC-14). |
| `supabase/functions/risk-predictor/index.ts` | INSERT(321-341) 를 RPC 로 교체. |
| `supabase/functions/plan-assistant/index.ts` | INSERT(308-321) 를 RPC 로 교체. 기존에 누락된 `tokens_used, latency_ms, output_data` 파라미터도 함께 전달. |
| `supabase/functions/_shared/ai-usage.ts` | 주석 추가: `checkAiAccess` 는 pre-flight only, 원자성 보장은 `consume_ai_credit_and_log` (변경 없음, 주석만). |
| `docs/specs/dev-spec-f018-ai-credit-race-condition.md` | 본 파일 (신규) |
| `progress.txt` | 작업 로그 기록 (CLAUDE.md 규칙) |

### 변경하지 않는 파일 (명시)

| 파일 | 사유 |
|------|------|
| `src/**/*.tsx` 프론트 전체 | 응답 shape 호환 유지 (meta.credits_used/credits_remaining 기존 필드 사용). |
| `src/lib/aiUsage.ts` | 프론트 usage 조회 로직은 변경 없음. |
| `supabase/migrations/20260420_ai_usage_rpc.sql` `get_ai_shared_pool_usage` | 재사용만. 수정 없음. |
| `AI_FEATURES`, `PLAN_LIMITS` | 상수 변경 없음. |

---

## 8. 엣지 케이스

| 케이스 | 예상 동작 |
|--------|---------|
| **Lock 획득 실패 (DB 과부하)** | Postgres statement_timeout(기본 60s) 도달 시 RPC 자체 실패 → AC-14 fallback. |
| **동일 트랜잭션 내 같은 lock 재획득** | `pg_advisory_xact_lock` 은 재진입 가능(reentrant). 문제 없음. |
| **owner 가 프로젝트 전체 삭제** | `get_ai_shared_pool_usage` 가 0 반환 → 항상 INSERT 가능. 기존과 동일. |
| **`p_owner_id` 와 `p_user_id` 가 다른 경우 (팀원이 owner shared pool 사용)** | 락은 owner 기준, INSERT 의 user_id 는 호출자. 의도된 동작. |
| **Claude 호출 중 함수 timeout (Edge Function 25s)** | RPC 호출 못함 → credit 미차감. 이미 현재 동작과 동일 (Claude 응답 못받으면 차감 안 됨). |
| **`p_credit_cost = 0`** | limit 체크 skip (v_used + 0 ≤ limit 항상 참) → INSERT 수행. |
| **`p_limit = -1` (Enterprise)** | limit 체크 skip, INSERT 만 수행. |
| **UTC 월 경계 전후 동시 요청** | `v_month_start := date_trunc('month', now() AT TIME ZONE 'UTC')` 는 RPC 호출 시점 기준. 1 트랜잭션 당 1회 계산이므로 경계에서 2개 요청이 서로 다른 month_start 를 쓰더라도 본질적 race 아님 (새 월은 무조건 0부터). |
| **`checkAiAccess` 에서 allowed:true → RPC 에서 quota_exceeded** | 정상 경로. 응답은 429 + payload 보존 (AC-15). 프론트 토스트는 기존 429 핸들러가 처리. |
| **plan-assistant 의 기존 payload 차이 (tokens_used 미 INSERT)** | RPC 전환 시 tokens_used 도 전달 → 기존 누락 데이터 복구 효과. |

---

## 9. Out of Scope (이번에 안 하는 것)

- [ ] **이미 호출된 Claude API 비용 환불** — quota 초과로 log insert 가 skip 되어도 Anthropic 측 비용은 이미 발생. 5/11 런칭 이후 재검토.
- [ ] **Per-user quota** — owner-level shared pool 만 대상. 개별 팀원 subquota 는 별도 스펙 (f??).
- [ ] **Historical 데이터 정합성 보정** — 이미 over-shoot 된 기존 log 행은 그대로 유지. UI 는 "N / 15" 로 계속 표시될 수 있으나 수동 관리자 개입 없이는 보정 안 함.
- [ ] **Lock contention 메트릭 대시보드** — 현재는 RAISE NOTICE 로만 기록. Grafana/Metabase 대시보드화는 f011 AI Usage Dashboard 확장으로 follow-up.
- [ ] **Multi-region active-active 락** — Supabase single-region 전제. 향후 멀티 리전 채택 시 별도 검토 필요 (advisory lock 은 single-DB-node 기준).
- [ ] **step=2 (상세 케이스 생성) credit 정책 변경** — creditCost=0 으로 차감 없음. 현행 유지.
- [ ] **`checkAiAccess` 자체의 원자화** — pre-flight 용도로만 사용. 허위 양성(false positive)이 있을 수 있으나 RPC 재검증으로 보호됨.
- [ ] **프론트 UI 변경** — 응답 shape 호환 유지. UI 변경 없음.
- [ ] **i18n 변경** — 사용자 대면 문구 변경 없음.
- [ ] **다른 Edge Function (rate-limit, activity-summary 등)** — 현재 credit log INSERT 를 사용하지 않는 함수는 대상 외. 향후 추가되는 기능은 RPC 사용을 표준으로.

---

## 10. i18n 키

**변경 없음.** 본 스펙은 백엔드 전용이며 사용자 대면 문구 추가/수정 없음. 기존 `monthly_limit_reached` 에러 경로가 그대로 재사용됨 (AC-15).

---

## 11. Lock 키 충돌 분석 (AC-7 상세)

| 항목 | 값 |
|------|----|
| Hash function | `hashtextextended(text, seed)` (PostgreSQL 13+, xxhash64-based) |
| 반환 타입 | `bigint` (64-bit signed, 실질 64-bit key space) |
| Seed | 0 (상수) |
| Keyspace | 2^64 ≈ 1.84 × 10^19 |
| 예상 동시 활성 owner 상한 (2026 Q4) | ~10K active owners (Testably 현 시점) |
| Birthday paradox 충돌 확률 (N=10K) | ≈ 10^8 / 2 × 2^64 ≈ 2.7 × 10^-12 |
| Birthday paradox 충돌 확률 (N=1M) | ≈ 10^12 / 2 × 2^64 ≈ 2.7 × 10^-8 |
| 판정 | **무시 가능.** 충돌 시에도 영향은 "서로 무관한 owner 2명이 동시에 같은 락을 기다림" → 불필요한 직렬화만 발생, 데이터 오염 없음. |
| 네임스페이스 | 문자열 prefix `'ai_credit:'` 로 타 advisory lock 과 격리. 현재 codebase 내 `pg_advisory` 사용처 0건 확인 (`rg "pg_advisory" supabase` 결과 기반). |

## 12. Deadlock 위험 평가

- `consume_ai_credit_and_log` 내부에서 획득하는 lock 은 **단 1개**.
- 함수 내 다른 table-level lock 없음 (INSERT 는 row-level lock 자동이나 advisory lock 과는 순서 의존 없음).
- `SECURITY DEFINER` + `SET search_path = public` 로 환경 영향 배제.
- 호출 트랜잭션에서 함수 호출 후 다른 advisory lock 을 추가로 획득하는 코드는 없음 → 교차 lock 불가 → **Deadlock 위험 없음.**

## 13. 호출 사이트 diff 가이드

아래는 구현자가 참조할 라인 단위 변경 가이드. 전체 diff 는 구현 PR 에서 확정.

### (A) `supabase/functions/generate-testcases/index.ts`

**지점 1:** line 586-596 (run-summary INSERT)
- Before: `await adminClient.from('ai_generation_logs').insert({ ... credits_used: AI_FEATURES.run_summary.creditCost, ... });`
- After: `const { data: consume, error } = await adminClient.rpc('consume_ai_credit_and_log', { p_user_id: user.id, p_owner_id: ownerId, p_project_id: runData.project_id, p_mode: 'run-summary', p_step: 1, p_credit_cost: AI_FEATURES.run_summary.creditCost, p_limit: PLAN_LIMITS[tier] ?? -1, p_tokens_used: tokensUsed, p_latency_ms: latencyMs, p_input_data: { run_id, total_tcs: totalCount, locale }, p_output_data: aiSummary });`
- `consume.allowed === false` 인 경우 429 반환 경로 추가 (AC-15 포맷).

**지점 2:** line 827-837 (coverage-gap INSERT) — 동일 패턴. mode='run-summary', input_data.action='coverage-gap'.

**지점 3:** line 935-945 (requirement-suggest INSERT) — 동일 패턴. mode='requirement-suggest'.

**지점 4:** line 1067-1077 (flaky-analysis INSERT) — 동일 패턴. mode='run-summary', action='analyze-flaky'.

**지점 5:** line 1271-1284 (step=1 text/jira/session INSERT) — 동일 패턴. mode=body.mode, p_credit_cost=AI_FEATURES.tc_generation_text.creditCost.

**지점 6 (변경 금지):** line 1307-1316 (step=2 INSERT) — credit_cost=0 이므로 기존 직접 INSERT 유지.

### (B) `supabase/functions/milestone-risk-predictor/index.ts`

**지점:** line 559-580. `feature.creditCost` 와 `feature.minTier` 그대로 사용. `ownerId` 는 line 162 에서 이미 확보. RPC 실패 시 AC-14 fallback. `consume.allowed === false` 시 기존 `monthly_limit_reached` 포맷 (line 216-223) 재사용.

### (C) `supabase/functions/risk-predictor/index.ts`

**지점:** line 321-341. `ownerId` 는 line 118 에서 이미 확보. 동일 패턴.

### (D) `supabase/functions/plan-assistant/index.ts`

**지점:** line 308-321. **기존 누락된 필드(tokens_used, latency_ms, output_data) 를 RPC 파라미터로 전달** — RPC 전환과 동시에 버그 수정 효과. `ownerId` 는 line 128 에서 이미 확보.

---

## 14. 테스트 계획

### 단위 — pgTAP (`supabase/tests/f018_ai_credit_race.test.sql`)

```sql
BEGIN;
SELECT plan(4);

-- Setup: owner with usage=14/15 (Hobby)
INSERT INTO auth.users (id) VALUES ('11111111-1111-1111-1111-111111111111');
INSERT INTO profiles (id, subscription_tier) VALUES ('11111111-1111-1111-1111-111111111111', 2);
INSERT INTO projects (id, owner_id) VALUES ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111');
-- 14 existing log rows at step=1 this month
INSERT INTO ai_generation_logs (user_id, project_id, mode, step, credits_used)
SELECT '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 'text', 1, 1
FROM generate_series(1, 14);

-- Test 1: single allowed call
SELECT is(
  (consume_ai_credit_and_log(
    '11111111-1111-1111-1111-111111111111'::uuid,
    '11111111-1111-1111-1111-111111111111'::uuid,
    '22222222-2222-2222-2222-222222222222'::uuid,
    'text', 1, 1, 15
  ) ->> 'allowed')::bool,
  true,
  'Single call at boundary should be allowed'
);

-- Test 2: next call should be blocked (usage now 15/15)
SELECT is(
  (consume_ai_credit_and_log(
    '11111111-1111-1111-1111-111111111111'::uuid,
    '11111111-1111-1111-1111-111111111111'::uuid,
    '22222222-2222-2222-2222-222222222222'::uuid,
    'text', 1, 1, 15
  ) ->> 'reason'),
  'quota_exceeded',
  'Over-limit call should return quota_exceeded'
);

-- Test 3: SUM(credits_used) must equal 15 exactly
SELECT is(
  (SELECT SUM(credits_used) FROM ai_generation_logs WHERE user_id = '11111111-1111-1111-1111-111111111111'),
  15::bigint,
  'Final SUM must equal limit exactly'
);

-- Test 4: unlimited tier (-1) always allowed
SELECT is(
  (consume_ai_credit_and_log(
    '11111111-1111-1111-1111-111111111111'::uuid,
    '11111111-1111-1111-1111-111111111111'::uuid,
    '22222222-2222-2222-2222-222222222222'::uuid,
    'text', 1, 1, -1
  ) ->> 'allowed')::bool,
  true,
  'Unlimited tier should always be allowed'
);

SELECT * FROM finish();
ROLLBACK;
```

### 통합 — Deno (`supabase/functions/tests/ai_credit_race_test.ts`)

```typescript
import { assertEquals } from 'https://deno.land/std@0.208.0/assert/mod.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const admin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

Deno.test('f018 — 5 concurrent requests at boundary do not over-shoot', async () => {
  // Setup: seed owner with usage=11/15 (Hobby, 4 credits remaining)
  const ownerId = crypto.randomUUID();
  const projectId = crypto.randomUUID();
  // ... seed 11 existing log rows ...

  // Launch 5 concurrent RPC calls
  const results = await Promise.all(
    Array.from({ length: 5 }, () =>
      admin.rpc('consume_ai_credit_and_log', {
        p_user_id: ownerId,
        p_owner_id: ownerId,
        p_project_id: projectId,
        p_mode: 'text',
        p_step: 1,
        p_credit_cost: 1,
        p_limit: 15,
      })
    )
  );

  const allowedCount = results.filter(r => r.data?.allowed === true).length;
  const blockedCount = results.filter(r => r.data?.reason === 'quota_exceeded').length;

  assertEquals(allowedCount, 4, 'Exactly 4 should be allowed (11+4=15)');
  assertEquals(blockedCount, 1, 'Exactly 1 should be blocked');

  // Final SUM must equal 15
  const { data: logs } = await admin
    .from('ai_generation_logs')
    .select('credits_used')
    .eq('user_id', ownerId);
  const sum = logs!.reduce((a: number, r: any) => a + r.credits_used, 0);
  assertEquals(sum, 15, 'Final usage must equal limit exactly');
});
```

### 회귀 (수동 / smoke)
- generate-testcases: text 모드 단일 호출 → 정상 응답 + ai_generation_logs row 1개 insert 확인.
- milestone-risk-predictor: cache hit → 응답에 `from_cache:true` 여전히 유지.
- plan-assistant: 기존 누락된 tokens_used 가 이제 log 에 저장되는지 확인 (버그 수정 효과).

---

## 15. Rollback 전략

1. **DB 레벨:** `DROP FUNCTION IF EXISTS consume_ai_credit_and_log(...)` 실행 (마이그레이션 파일 하단 주석 참조). 즉시 반영.
2. **Edge Function 레벨:** `git revert <feature-commit-sha>` 로 4개 파일의 INSERT 직접 호출 상태로 복구. Supabase Edge Function 재배포.
3. **프론트 레벨:** 변경 없으므로 별도 조치 불요.

예상 Rollback 시간: 5분 이내 (DB DROP + git revert + deploy).

---

## 16. 권장 구현 옵션 비교

| 옵션 | 장점 | 단점 | 채택 |
|------|------|------|------|
| **A. 신규 `consume_ai_credit_and_log()` RPC** | 호출자 코드 단순(1회 호출), 모든 책임이 RPC 내부에 격리, 테스트 용이 | 기존 `checkAiAccess` 와 중복된 usage 조회 발생 (락 안에서 1회 추가) | ✅ **권장** |
| B. `try_log_ai_credit()` RPC + checkAiAccess 유지 | A 와 거의 동일하나 이름 분리로 "로깅 전용" 뉘앙스 | 실질 차이 無. A 와 동일한 SQL 본체 필요. | — |
| C. SERIALIZABLE 트랜잭션 | DB 표준 방식 | 충돌 시 `SerializationFailure` 재시도 로직을 Edge Function(Deno) 에 구현해야 함 → 코드 복잡. 락 wait 보다 retry latency 가 크고 non-deterministic. | ❌ |
| D. `ai_credit_reservations` 테이블 + CAS | 분산 환경까지 대비 | 신규 테이블 + GC cron + 2-phase commit 필요. effort=small 범위 초과. | ❌ |

**결정: Option A** — effort=small 제약 부합, 1일 내 구현/테스트/배포 가능, Rollback 명확.

---

## 17. 예상 구현 시간

| 작업 | 시간 |
|------|------|
| 마이그레이션 SQL 작성 + `supabase db reset` 검증 | 1.5h |
| 4개 Edge Function 리팩토링 (INSERT → RPC) | 2.5h |
| pgTAP + Deno 통합 테스트 | 2h |
| 로컬 E2E 회귀 (generate-testcases, milestone-risk) | 1h |
| PR 리뷰 대응 + staging 배포 + smoke | 1h |
| **Total** | **8h (1 man-day)** |

타임라인: 2026-04-23 착수 → 2026-04-24 staging → 2026-04-28 production (5/11 런칭 대비 **13일 여유**).

---

## 18. 개발 착수 전 체크리스트

- [x] 수용 기준이 전부 테스트 가능한 문장인가 (AC 22개, 각 검증 방법 명시)
- [x] DB 스키마가 컬럼 타입/제약조건까지 명시되었는가 (RPC 시그니처 16 파라미터 전부, 반환 JSON 구조)
- [x] RLS 정책이 정의되었는가 (변경 없음 명시, GRANT EXECUTE 범위 명시)
- [x] 플랜별 제한이 명시되었는가 (Free~Enterprise 전체)
- [x] RBAC 권한 매트릭스가 있는가 (변경 없음 명시)
- [x] 변경 파일 목록이 구체적인가 (라인 번호까지 포함)
- [x] 엣지 케이스가 식별되었는가 (10개)
- [x] Out of Scope 이 명시되었는가 (10개)
- [x] i18n 키가 en/ko 둘 다 있는가 (해당 없음, 이유 명시)
- [x] Rollback SQL 포함
- [x] Lock 키 충돌 확률 수치 포함
- [x] 동시성 테스트 스펙 (pgTAP + Deno) 포함
