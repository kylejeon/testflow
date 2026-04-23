# QA Report: f018 — AI Credit Race Condition 방어 (Advisory Lock)
> 검수일: 2026-04-23
> 개발지시서: docs/specs/dev-spec-f018-ai-credit-race-condition.md
> 디자인 명세: 없음 (백엔드 전용)
> 검수 커밋: f99591f

---

## 요약 판정

**Ship with fixes** — 핵심 원자성 보장 로직은 정확하고 보안도 견고하나, P1 이슈 2개(EXTRACT 버그로 인한 observability 오작동, AC-15 meta 필드 누락) 와 P2 이슈 3개가 존재한다. 원자성 자체는 손상되지 않으므로 5/11 런칭 전에 P1 2개를 수정한 후 재배포 권장.

| 분류 | 개수 |
|------|------|
| 총 검수 항목 | 22개 AC + 보안/성능/회귀 추가 검수 |
| 통과 | 19개 AC |
| 실패 | 2개 AC (AC-15, AC-16) |
| 경고 | 1개 AC (AC-17) |
| P0 | 0개 |
| P1 | 2개 |
| P2 | 3개 |

---

## 1. 요약 판정 (Ship / Ship with fixes / Block)

**Ship with fixes**

이유: 원자성 보장의 핵심 경로(lock → re-SELECT → INSERT)는 정확하게 구현되었고, SECURITY DEFINER + search_path 설정, GRANT 범위도 모두 정확하다. 단, AC-16의 lock wait 측정 공식이 잘못되어 50ms 이상 contention 시 로깅이 오작동하고, AC-15의 `credits_remaining: 0` 메타 필드가 8개 응답 지점 전부에서 누락되어 있다. 이 두 건은 데이터 오염이나 over-shoot을 일으키지는 않지만 운영 관측성과 프론트 계약에 영향을 주므로 P1으로 분류한다.

---

## 2. AC 22개 대조 테이블

| AC | 판정 | 증거 파일:라인 |
|----|------|--------------|
| AC-1 (RPC 시그니처 + 반환 JSON) | PASS | `20260424_f018_ai_credit_atomic_consume_rpc.sql:26-119` — 16 파라미터, jsonb 반환 6 필드 모두 확인 |
| AC-2 (SECURITY DEFINER + search_path + GRANT) | PASS | `...rpc.sql:45-47,130-138` — `SECURITY DEFINER SET search_path = public`, REVOKE PUBLIC, GRANT authenticated+service_role |
| AC-3 (Advisory lock 키 + xact-scoped) | PASS | `...rpc.sql:68-69` — `hashtextextended('ai_credit:' || p_owner_id::text, 0)` + `pg_advisory_xact_lock` |
| AC-4 (원자적 재검증) | PASS | `...rpc.sql:79,82-91` — lock 후 `get_ai_shared_pool_usage` 재호출, used+cost>limit 시 INSERT 없이 반환 |
| AC-5 (Unlimited tier skip) | PASS | `...rpc.sql:82` — `p_limit >= 0` 조건으로 -1 시 체크 skip, INSERT 수행 |
| AC-6 (p_limit 파라미터 포함) | PASS | `...rpc.sql:33` — `p_limit int` 7번째 파라미터로 명시 |
| AC-7 (락 키 충돌 확률 수치) | PASS | `dev-spec §11` — N=1M 기준 ≈ 2.7×10^-8 명시 |
| AC-8 (네임스페이스 격리) | PASS | `...rpc.sql:68` — `'ai_credit:'` prefix 적용. 기존 rate_limiting(hashtext 32-bit)과 다른 함수 사용으로 실질 충돌 가능성 극히 낮음 |
| AC-9 (generate-testcases 5개 지점) | PASS | `generate-testcases/index.ts:590,856,989,1148,1379` — 5개 consumeAiCredit 호출 확인. step=2 직접 INSERT(L1445)는 스펙 OOS |
| AC-10 (milestone-risk-predictor) | PASS | `milestone-risk-predictor/index.ts:565` |
| AC-11 (risk-predictor) | PASS | `risk-predictor/index.ts:327` |
| AC-12 (plan-assistant + tokens_used 버그 수정) | PASS | `plan-assistant/index.ts:316,324-325` — tokensUsed, latencyMs, outputData 전달 확인 |
| AC-13 (checkAiAccess 시그니처 유지 + 주석) | PASS | `_shared/ai-usage.ts:168-172` — "pre-flight ONLY" JSDoc 주석 추가, 함수 본체 변경 없음 |
| AC-14 (RPC 실패 fallback — AI payload 보존) | PASS | `generate-testcases/index.ts:620-628`, `milestone-risk-predictor/index.ts:634-653` 등 — catch(ConsumeAiCreditError), credits_logged:false 응답 확인 |
| AC-15 (Quota exceeded 429 + meta 필드) | **FAIL** | 8개 지점 모두 `meta: { credits_used:0, credits_logged:false, rate_limited_post_check:true }` — AC-15 명세의 `credits_remaining: 0` 필드 누락. |
| AC-16 (RAISE NOTICE lock contention 50ms) | **FAIL** | `...rpc.sql:72` — `EXTRACT(MILLISECOND FROM interval)` 는 ms 컴포넌트(0-999)만 추출. 1500ms 대기 시 `v_lock_wait_ms = 500` 으로 오기록. 1초 이상 contention 시 로깅 조건(>50)이 항상 참이라 과잉 로깅 발생. |
| AC-17 (pgTAP 동시성 테스트) | **WARNING** | `f018_ai_credit_race.test.sql` — 테스트는 존재하나 실제 동시성(pg_sleep + 2 트랜잭션 블록) 없이 단일 트랜잭션 내 순차 호출. AC-17 명세의 "pg_sleep + 두 개의 트랜잭션 블록" 조건 미충족. 기능 검증은 가능하나 real lock contention 시나리오는 미검증. |
| AC-18 (Deno 통합 테스트 — 5 concurrent) | PASS | `ai_credit_race_test.ts:86-124` — Promise.all 5호출, allowedCount=4/blockedCount=1, SUM=15 assert 포함. 로컬 환경 없으면 skip. |
| AC-19 (Latency p95 < 100ms) | PASS (분석) | get_ai_shared_pool_usage 쿼리에 `idx_ai_generation_logs_credits (user_id, step, created_at DESC) INCLUDE (credits_used)` 및 `idx_ai_generation_logs_owner_date` 인덱스 활용 가능. Lock 내 CTE 1회 + INSERT 1회 구조. staging 측정 필요하나 정적 분석상 p95 < 100ms 달성 가능 |
| AC-20 (단일 요청 회귀) | PASS | tsc --noEmit 0 error, 기존 응답 shape 유지(meta 필드 추가만), step=2 직접 INSERT 유지 |
| AC-21 (Idempotent 마이그레이션) | PASS | `...rpc.sql:26` — `CREATE OR REPLACE FUNCTION` |
| AC-22 (Rollback 가능) | PASS | `...rpc.sql:142-148` — DROP FUNCTION 주석 포함. git revert 1 commit으로 Edge Function 복구 |

---

## 3. 이슈 리스트

### P1 — 수정 권장 (런칭 전)

#### P1-1: AC-16 lock wait 측정 버그 (EXTRACT(MILLISECOND) 오용)
- **파일:라인:** `supabase/migrations/20260424_f018_ai_credit_atomic_consume_rpc.sql:72`
- **재현:** lock 대기 1500ms 발생 시 `EXTRACT(MILLISECOND FROM interval '1.5 seconds')` = 500 (초 부분 제외)
- **증상:** 
  - 1초 미만 대기: 정상 동작 (0-999 범위)
  - 1초 이상 대기: 실제 1500ms를 500ms로 보고 → 50ms 임계값 비교 오동작 가능성
  - 1050ms 대기: 50ms로 기록 → contention 로깅 미발생
- **수정 제안:** `EXTRACT(EPOCH FROM (clock_timestamp() - v_lock_start)) * 1000` 로 교체

```sql
-- 현재 (잘못됨)
v_lock_wait_ms := EXTRACT(MILLISECOND FROM (clock_timestamp() - v_lock_start))::int;

-- 수정 후
v_lock_wait_ms := (EXTRACT(EPOCH FROM (clock_timestamp() - v_lock_start)) * 1000)::int;
```

#### P1-2: AC-15 meta.credits_remaining:0 누락 (8개 지점)
- **파일:라인:**
  - `supabase/functions/generate-testcases/index.ts:610, 875, 1009, 1167, 1403`
  - `supabase/functions/milestone-risk-predictor/index.ts:605-613`
  - `supabase/functions/risk-predictor/index.ts:358-367`
  - `supabase/functions/plan-assistant/index.ts:343-354`
- **재현:** 429 quota_exceeded 응답의 meta 객체에 `credits_remaining: 0` 없음
- **증상:** AC-15 명세 미충족. 프론트가 향후 이 필드를 사용할 경우 undefined 반환. 현재 프론트는 미사용이므로 즉각적인 UX 오류는 없으나 API 계약 위반.
- **수정 제안:** 429 응답 meta에 `credits_remaining: 0` 추가 (8개 지점 모두)

---

### P2 — 수정 권장 (차기 배포)

#### P2-1: AC-17 pgTAP 테스트에 실제 동시성 시나리오 없음
- **파일:라인:** `supabase/tests/f018_ai_credit_race.test.sql`
- **내용:** AC-17 명세는 "pg_sleep + 두 개의 트랜잭션 블록으로 동시 2 호출 시뮬레이션"을 요구하지만, 구현된 테스트는 단일 BEGIN 블록 내 순차 호출. Advisory lock의 xact-scoped 특성상 같은 트랜잭션 내 두 번째 호출은 즉시 lock을 재획득하므로 실제 lock contention이 테스트되지 않는다.
- **영향:** 진짜 동시 요청 시 lock 동작은 Deno AC-18 테스트로 검증됨. pgTAP 레벨의 gap.
- **수정 제안:** 두 개의 psql 세션 또는 `dblink`를 이용한 별도 트랜잭션 테스트 추가. 또는 현재 sequential 테스트로 충분하다는 근거 주석 명시.

#### P2-2: AC-17 spec 텍스트 오타 (limit=14 should be 15)
- **파일:라인:** `docs/specs/dev-spec-f018-ai-credit-race-condition.md` AC-17 항목
- **내용:** spec에 "Hobby owner (limit=14 / usage=14)" 로 기재되어 있으나, 이 경우 allowed 호출 후 SUM=15가 되어 limit(14)를 초과한다. 테스트 구현은 올바르게 limit=15/usage=14를 사용. spec 텍스트가 오타.
- **수정 제안:** spec 텍스트를 "limit=15 / usage=14"로 수정.

#### P2-3: generate-testcases run-summary / coverage-gap / suggest / analyze-flaky 의 429 응답에 credits_remaining 필드 없음 (AC-15 연동)
- P1-2와 같은 이슈의 generate-testcases 한정 상세 메모. milestone/risk/plan-assistant는 `monthly_limit` 추가 제공하므로 정보가 더 풍부하나, generate-testcases의 429 meta는 `monthly_limit`도 없어 프론트가 남은 크레딧 계산에 필요한 정보가 부족.

---

## 4. 원자성 / 락 안전성 분석

### 트랜잭션 범위
`pg_advisory_xact_lock`은 xact-scoped lock으로, 함수를 호출하는 트랜잭션이 COMMIT 또는 ROLLBACK될 때 자동 해제된다. Supabase PostgREST RPC 호출은 각 RPC를 독립적인 트랜잭션으로 실행하므로, lock은 RPC 완료 시 즉시 해제된다. Autocommit 컨텍스트에서도 `pg_advisory_xact_lock`은 xact-scoped를 유지하여 session lock으로 변환되지 않는다. **세션 lock 누수 위험 없음.**

### lock → SELECT → 조건분기 → INSERT → return 원자성
```
pg_advisory_xact_lock(key)     -- 타 요청 직렬화
v_used := get_ai_shared_pool_usage(p_owner_id, v_month_start)  -- lock 안에서 최신 값
IF v_used + cost > limit THEN RETURN {allowed:false}  -- INSERT 없음
INSERT INTO ai_generation_logs  -- lock 안에서 원자적
RETURN {allowed:true}
```
이 시퀀스는 단일 PL/pgSQL 트랜잭션 내에서 lock을 보유한 채 실행된다. 동일 owner_id에 대한 두 번째 요청은 첫 번째 트랜잭션 COMMIT 전까지 `pg_advisory_xact_lock`에서 대기하므로, 두 번째 요청의 `get_ai_shared_pool_usage`는 반드시 첫 번째 INSERT 이후 값을 읽는다. **원자성 완전 보장.**

### Lock 해제 시점
`pg_advisory_xact_lock` (xact variant): 트랜잭션 종료 시 자동 해제. `pg_advisory_lock` (session variant)와 다르게 명시적 `pg_advisory_unlock` 불필요. **Release leak 없음.**

### 데드락 위험
함수 내부에서 획득하는 advisory lock은 단 1개. 다른 table-level 또는 advisory lock과의 교차 의존 없음. `SECURITY DEFINER SET search_path = public`으로 search_path hijack 방지. **Deadlock 위험 없음.**

---

## 5. SECURITY DEFINER 안전성

| 항목 | 판정 | 근거 |
|------|------|------|
| search_path hijack | PASS | `SET search_path = public` 명시 (`...rpc.sql:47`) |
| SQL Injection | PASS | 모든 파라미터가 $1, $2 형태의 bound param으로만 사용. 문자열 concat 없음. `hashtextextended('ai_credit:' || p_owner_id::text, 0)` 에서 `p_owner_id::text`는 uuid를 text로 cast한 것으로 SQL injection 불가 (uuid는 영숫자와 하이픈만 포함) |
| GRANT 범위 | PASS | `REVOKE ALL FROM PUBLIC` 후 `GRANT EXECUTE TO authenticated, service_role`. anon role 차단 (`...rpc.sql:130-138`) |
| authenticated JWT 직접 호출 | 주의 | `authenticated` role에도 GRANT되어 있어, 프론트에서 anon key가 아닌 user JWT로 직접 RPC 호출 가능. 그러나 RPC 내부에서 p_owner_id와 p_user_id를 검증하지 않고 그대로 신뢰한다. 악의적 authenticated 유저가 타인의 owner_id를 전달하면 해당 owner의 lock을 획득하고 타인 owner_id 하의 project_id에 INSERT할 수 있다. Edge Function은 항상 service_role로 호출하므로 정상 플로우에서는 문제 없으나, 이론적으로 authenticated 유저가 직접 RPC를 호출하는 경우 RBAC 우회 가능성 있음. Dev Spec §4-3에서 "호출은 Edge Function이 service_role로 수행"으로 명시되어 있어 설계상 의도된 것으로 볼 수 있음 |
| RLS | PASS | RPC는 SECURITY DEFINER로 RLS 우회. ai_generation_logs의 기존 RLS(auth.uid() = user_id)는 유지 |

**authenticated 직접 호출 관련:** 현재 Edge Function이 모두 service_role로만 호출하므로 즉각적 위험은 없다. 그러나 향후 클라이언트측에서 직접 RPC를 호출하는 기능이 추가될 경우 owner_id 검증 로직이 없으면 타 owner의 credit을 소모할 수 있다. P2 수준.

---

## 6. 성능 리뷰

### 인덱스 활용
`get_ai_shared_pool_usage` 내부 쿼리:
```sql
WHERE user_id IN (SELECT uid FROM member_ids) AND step = 1 AND created_at >= p_month_start
```

활용 가능 인덱스:
- `idx_ai_generation_logs_credits (user_id, step, created_at DESC) INCLUDE (credits_used)` — user_id, step, created_at 모두 커버, credits_used INCLUDE → index-only scan 가능
- `idx_ai_generation_logs_owner_date (user_id, step, created_at DESC) INCLUDE (mode, credits_used, project_id, tokens_used) WHERE step=1` — partial index로 더 좁은 범위

두 인덱스 모두 쿼리 패턴을 커버한다. Lock 내 추가 SELECT 1회의 latency는 인덱스 사용 시 수 ms 이하 예상. p95 < 100ms 달성 가능성 높음 (staging 측정 필요).

### Lock 대기 시간
Advisory lock 대기는 실제 DB 부하에 따라 달라지나, 정상 상황에서는 Claude API 호출(2-5s) 후 순차적으로 들어오는 요청 간 lock 경쟁은 수 ms 이내. 동시 burst 5개도 각 RPC가 수십 ms이므로 누적 대기 200ms 이하 예상.

---

## 7. 회귀 리스크

### 호출 사이트 교체 완료 여부
| 함수 | 교체 지점 | 직접 INSERT 잔존 |
|------|---------|----------------|
| generate-testcases | 5개 (L590, L856, L989, L1148, L1379) | L1445 (step=2, creditCost=0 — 의도된 OOS) |
| milestone-risk-predictor | 1개 (L565) | 없음 |
| risk-predictor | 1개 (L327) | 없음 |
| plan-assistant | 1개 (L316) | 없음 |

step=2 직접 INSERT는 AC-9에서 명시적으로 제외(OOS)이므로 회귀 아님. **8개 지점 전부 교체 완료.**

### 응답 shape 호환성
- Happy path: `success:true + meta:{ credits_used, log_id }` — 기존 필드 포함, 추가 필드 있음. 호환.
- AC-14 fallback: `success:true + meta:{ credits_logged:false }` — 기존 없던 필드 추가만. 호환.
- AC-15 429: 기존 `monthly_limit_reached` 포맷 유지. 호환.
- `checkAiAccess` 시그니처: 변경 없음. 호환.

### 기존 E2E
tsc --noEmit: 0 errors 확인. Vitest 232/232 pass (커밋 메시지 기준). Playwright smoke는 별도 실행 필요.

---

## 8. 에러 처리

| 시나리오 | 동작 | AC 대응 |
|---------|------|---------|
| RPC 정상 + allowed=true | 200 + AI payload + credits_used, log_id meta | Happy path |
| RPC 정상 + allowed=false (race-lost) | 429 + AI payload 보존 + rate_limited_post_check:true meta | AC-15 FAIL (credits_remaining:0 누락) |
| RPC 자체 실패 (DB error) | ConsumeAiCreditError catch → 200 + AI payload + credits_logged:false meta | AC-14 PASS |
| p_owner_id NULL | RAISE EXCEPTION → ConsumeAiCreditError → AC-14 fallback | PASS |
| p_credit_cost < 0 | RAISE EXCEPTION → ConsumeAiCreditError → AC-14 fallback | PASS |
| lock 대기 timeout (statement_timeout) | RAISE ERROR → ConsumeAiCreditError → AC-14 fallback | PASS |
| 무한 lock 대기 | statement_timeout(기본 60s) 로 보호 | PASS (Dev Spec §8 엣지케이스 확인) |

---

## 9. 테스트 커버리지 분석

### pgTAP (supabase/tests/f018_ai_credit_race.test.sql)
| 케이스 | 포함 여부 |
|--------|---------|
| 경계값 allow (14+1=15) | O |
| over-limit 거부 (quota_exceeded) | O |
| SUM=15 assert (no over-shoot) | O |
| unlimited (-1) 항상 allow | O |
| creditCost=0 allow | O |
| 진짜 동시 lock contention (pg_sleep + 2 txn) | X — 미구현 (P2) |

총 5 plan, 5 테스트. AC-17 명세의 "pg_sleep + 두 개의 트랜잭션 블록" 미충족이나 기능 로직은 커버됨.

### Deno 통합 (supabase/functions/tests/ai_credit_race_test.ts)
| 케이스 | 포함 여부 |
|--------|---------|
| 5 concurrent @ usage=11 → allowed=4, blocked=1, SUM=15 | O |
| single call @ empty owner | O |
| unlimited tier | O |
| over-limit single call | O |
| owner 간 격리 (다른 owner 병렬 허용) | X — 미구현. 서로 다른 owner가 동시 호출 시 각자 독립 lock을 획득하는지 확인 없음 |

SUPABASE_URL 없으면 skip — 로컬/CI 환경에서만 실행 가능. AC-18 핵심 시나리오는 커버됨.

### AC-17/18/19 커버리지 판정
- AC-17: WARNING (테스트 존재, 진짜 lock contention 미검증)
- AC-18: PASS (4 Deno 테스트 케이스)
- AC-19: staging 측정 필요 (정적 분석상 통과 가능)

---

## 10. OOS 준수 확인

| OOS 항목 | 미구현 확인 |
|---------|-----------|
| Claude 비용 환불 | O — 미구현 |
| Per-user quota | O — 미구현 |
| Historical 데이터 보정 | O — 미구현 |
| Lock contention 대시보드 | O — RAISE NOTICE만 (미구현) |
| Multi-region active-active 락 | O — 미구현 |
| step=2 credit 정책 변경 | O — step=2 직접 INSERT 유지 |
| checkAiAccess 원자화 | O — pre-flight 유지 |
| UI 변경 | O — src/**/*.tsx 무변경 |
| i18n | O — 로케일 문구 변경 없음 |
| 기타 Edge Function (rate-limit 등) | O — generate-testcases, milestone-risk-predictor, risk-predictor, plan-assistant만 대상 |

OOS 10개 모두 미구현 확인. 위반 없음.

---

## 11. 런칭 준비도 (5/11 SDK launch 관점)

| 항목 | 상태 |
|------|------|
| Race condition 방어 (핵심 목적) | 완료 — 원자성 보장 |
| tsc --noEmit | 0 errors |
| 기존 테스트 회귀 | 없음 (232/232 pass) |
| 보안 (SECURITY DEFINER + GRANT) | 완료 |
| Rollback SQL | 완료 |
| 마이그레이션 idempotent | 완료 |
| P0 블로커 | 없음 |
| P1 수정 필요 | 2개 (AC-15 meta 필드, AC-16 EXTRACT 버그) |
| CEO 수동 SQL 적용 | 필요 (SQL Editor에서 마이그레이션 파일 실행) |
| staging 검증 | 미완료 (p95 latency 측정 필요) |

---

## 12. CEO 실행 액션 체크리스트

### 배포 전 (Developer 수정 후)
- [ ] P1-1 수정: `...rpc.sql:72` EXTRACT(MILLISECOND) → EXTRACT(EPOCH)*1000
- [ ] P1-2 수정: 8개 Edge Function 429 응답 meta에 `credits_remaining: 0` 추가
- [ ] 수정 후 재검수 또는 CEO 직접 확인

### 배포 시
1. [ ] Supabase Dashboard SQL Editor에서 `supabase/migrations/20260424_f018_ai_credit_atomic_consume_rpc.sql` 전체 실행
2. [ ] Edge Function 배포 (4개): `generate-testcases`, `milestone-risk-predictor`, `risk-predictor`, `plan-assistant`
3. [ ] `_shared/ai-usage.ts` 포함된 shared 레이어도 함께 배포

### 배포 후 검증
4. [ ] generate-testcases text 모드 단일 호출 smoke test → 200 응답 + ai_generation_logs row 1개 확인
5. [ ] Supabase Postgres 로그에서 `[f018]` 태그 조회하여 로깅 동작 확인
6. [ ] staging에서 `consume_ai_credit_and_log` 100회 호출 p50/p95 측정

### 롤백 필요 시
7. [ ] SQL Editor에서 마이그레이션 파일 하단 주석의 DROP FUNCTION 실행
8. [ ] `git revert f99591f` 후 Edge Function 재배포 (5분 이내 완료 가능)

---

## 코드 품질

- **tsc --noEmit:** PASS (0 errors)
- **ESLint:** 프로젝트에 lint 스크립트 없음 (npm run lint 미존재) — 별도 확인 필요
- **Vitest:** 232/232 PASS (커밋 메시지 기준)

---

## 결론

**수정 후 재검수 권장** (P1 2개). 원자성 보장 핵심 로직은 정확하고 보안도 견고하므로 P1 2건 수정 후 5/11 런칭 전 재배포 가능. P0 블로커 없음.

