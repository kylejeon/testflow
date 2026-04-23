# QA Report: f001 + f002 — Environment AI Insights + Chip Workflows

> 검수일: 2026-04-24
> 검수 커밋: `c4ccbee`
> Dev Spec: `docs/specs/dev-spec-f001-f002-env-ai-insights.md`
> Design Spec: `docs/specs/design-spec-f001-f002-env-ai-insights.md`

---

## §1 요약 판정

**Ship with fixes**

- 총 검수 항목: 91개 (AC-A1~M1)
- Pass: 75 / Partial: 8 / Missing: 8
- `npx tsc --noEmit`: 0 errors
- vitest: 255/255 passed
- i18n parity: 0 diff
- i18n hardcoded scan: 0 in scope

**P0: 0 / P1: 2 / P2: 4**

---

## §2 AC 대조 (요약)

| 그룹 | Pass | Partial | Fail |
|------|------|---------|------|
| AC-A (config) | 4 | 0 | 0 |
| AC-B (DB) | 7 | 0 | 0 |
| AC-C (Edge Function) | 17 | 1 | 0 |
| AC-D (캐시) | 6 | 0 | 0 |
| AC-E (크레딧/f018) | 7 | 0 | 0 |
| AC-F (Hook) | 3 | 2 | 2 |
| AC-G (EnvironmentAIInsights) | 10 | 0 | 0 |
| AC-H (Create Issue) | 10 | 0 | 0 |
| AC-I (Filter) | 7 | 0 | 0 |
| AC-J (Assign Run) | 3 | 1 | 0 |
| AC-K (i18n) | 5 | 0 | 0 |
| AC-L (테스트) | 3 | 2 | 1 |
| AC-M (OOS) | 1 | 0 | 0 |

---

## §3 이슈 리스트

### P0 — 릴리즈 차단
없음.

### P1 — 릴리즈 전 수정 권장

**P1-01: Edge Function Deno 테스트 파일 미존재 (AC-L1)**
- 기대: `supabase/functions/env-ai-insights/index.test.ts` 에 13 케이스 (cache hit, locale mismatch, too_little_data, force_refresh, race-lost, malformed JSON, rate limit, tier gate 등)
- 실제: 파일 없음
- 영향: 서버 분기 자동화 검증 없음

**P1-02: `useEnvAiInsights` 훅 시그니처 AC-F1/F2/F3 미준수**
- 기대 (AC-F1): `useEnvAiInsights(planId, locale)` 시그니처
- 기대 (AC-F2): `useQuery` + `enabled: false` 패턴
- 기대 (AC-F3): `{ data, isLoading, error, regenerate, isFromCache, creditsUsed, creditsRemaining }` 반환
- 실제: `useEnvAiInsights(planId)` / `useMutation` 패턴 / TanStack mutation 객체 반환
- 파일: `src/hooks/useEnvAiInsights.ts:7,19`
- 영향: 기능 동작 OK. 계약 불일치로 재사용 혼란 우려

### P2

**P2-01: Assign Run 토스트 duration 6000ms 미적용 (AC-J3)**
- `Toast.tsx` 시그니처가 duration 옵션 미지원
- 파일: `src/pages/plan-detail/page.tsx:1686`

**P2-02: 마운트 시 캐시 pre-load 에서 `credits_remaining: 0` 하드코딩 (AC-D6)**
- 파일: `src/pages/plan-detail/page.tsx:1577-1578`
- Regenerate 후엔 정상값, 초기 페이지 로드 시에만 잘못 표시

**P2-03: 마운트 캐시 pre-load 24h 만료 체크 없음**
- Edge Function 은 재생성하지만 프론트 마운트 시 만료 캐시가 "Cached" 로 표시
- 파일: `src/pages/plan-detail/page.tsx:1562-1563`

**P2-04: AC-H6 Jira Edge Function body 형식 spec 편차**
- 기존 `create-jira-issue` API 계약 (credentials 직접 전달) 재사용 — 기능 정상, spec 서명만 다름

---

## §4 보안 리뷰

| 항목 | 판정 |
|-----|------|
| Prompt injection (env name/TC title) | Pass — `sanitizeShortName(50)` + `sanitizeTitle(120)` + 구조 토큰 제거 |
| Jira API token | Pass — RLS `user_id = auth.uid()`, 로그 8자 마스킹 (기존 패턴 계승) |
| GitHub PAT | Pass — 로그 미포함 + RLS |
| `test_plans.ai_env_insights_cache` RLS | Pass — project_members 재검증, cross-workspace 차단 |
| XSS (AI headline/body) | Pass — 텍스트 노드 렌더 only, textarea value 바인딩 |
| locale injection | Pass — validated enum only |

---

## §5 에러 시나리오 매트릭스

| 시나리오 | 판정 |
|---------|------|
| plan 미존재 → 404 | ✅ |
| executed < 5 → too_little_data, credit 0 | ✅ |
| Claude 5xx → 500 + rule-based 유지 | ✅ |
| credit 0 → 429 monthly_limit_reached | ✅ |
| Free/Hobby → 403 tier_too_low | ✅ |
| 캐시 hit (24h, locale match) → from_cache:true | ✅ |
| force_refresh → 캐시 무시 + credit 차감 | ✅ |
| Jira/GitHub 둘 다 없음 → Settings 링크 | ✅ |
| race-lost → 429 + AI payload 보존 | ✅ |
| Claude timeout (25s) → 504 ai_timeout, credit 0 | ✅ |
| Claude 429 → 429 upstream_rate_limit, credit 0 | ✅ |
| Claude malformed JSON → 422 ai_parse_failed, credit 0 | ✅ |

---

## §6 테스트 커버리지

**프론트엔드 vitest (255 total, 신규 23)**
- `useEnvAiInsights.test.ts`: 6 케이스
- `EnvironmentAIInsights.test.tsx`: 10 케이스
- `IssueCreateInlineModal.test.tsx`: 6 케이스
- 기존 `environmentInsights.test.ts`: 7 케이스 회귀 없음

**누락 (P1-01)**
- Edge Function Deno 13 케이스 (locale mismatch, force_refresh, rate limit, tier gate, 422, 504 전부 미존재)

---

## §7 회귀 리스크

- `environmentInsights.test.ts`: 7/7 green (rule-based 변경 없음)
- `useAiFeature.ts AI_FEATURES`: 신규 키만 추가 (`as const satisfies`), 기존 영향 0
- `EnvironmentAIInsights.tsx`: AI props 전부 optional, rule-based only 호출처 호환
- `plan-detail/page.tsx`: 다른 탭 (TC/Runs/Activity/Issues) 영향 0
- Milestone AI Risk Insight: `ai-config.ts` 신규 키만, 기존 `milestone_risk` 미변경
- `AITriggerButton`: 신규 props 전부 optional

---

## §8 OOS 준수

§9-1~§9-10 10개 전부 의도적 미구현 확인:
critical env threshold auto-tune / 다중 플랜 집계 / Slack 알림 / IssueCreateModal 공유 컴포넌트화 / AI insight 이력 / priority 가중치 / streaming response / 자동 트리거 / 프롬프트 A/B / Assign Run 담당자 AI 추천

`// OOS §9-N` 코드 주석 형식은 미적용 — P2 영향 0

---

## §9 CEO 실행 액션

### 반드시 (P1)
1. **Edge Function Deno 테스트 13 케이스 추가** (P1-01)
2. **useEnvAiInsights 훅 시그니처 정비 or Dev Spec 갱신** (P1-02) — useMutation 패턴을 공식 채택으로 명시 or spec 준수 refactor

### 가능하면 (P2)
3. Toast duration 지원 추가
4. 마운트 pre-load `credits_remaining` 실시간값 (AC-D6)
5. 마운트 pre-load 24h 만료 체크

### 배포 전 수동
- Supabase Dashboard SQL Editor 에서 `20260424_f001_ai_env_insights_cache.sql` 적용
- `ANTHROPIC_API_KEY` Edge Function 환경변수 확인
- `supabase functions deploy env-ai-insights`

---

**최종 판정: Ship with fixes — P1 2 건 수정 후 재검수 권장**
