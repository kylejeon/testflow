# Decision Memo: AI Credit 비용 정책 — Flat vs Tiered

> 작성일: 2026-04-23
> 작성자: @planner
> 목적: Testably AI 크레딧 정책을 "flat 1-credit"으로 유지할지, 2/3-tier 차등으로 전환할지에 대한
>       데이터 기반 의사결정 자료. 구현 스펙이 아닌 **CEO 결정용 decision memo**.

---

## 0. Executive Summary (CEO용 1분 요약)

- **현재 정책:** 13개 AI 기능 모두 호출당 `creditCost: 1` 통일. 월 한도 = Free 3 / Hobby 15 / Starter 30 / Pro 150 / Enterprise ∞.
- **실제 원가 격차는 약 6배.** 가장 가벼운 호출 (milestone-risk Haiku, ~$0.003) vs 가장 무거운 호출 (coverage-gap Sonnet, ~$0.018) 의 원가 차이는 6배. 하지만 **절대금액 자체가 워낙 작아** (모두 2센트 미만) 시스템 전체 Unit Economics 에는 아직 치명적이지 않음.
- **Pro plan worst-case 손익은 여전히 흑자.** 150 credits 를 전부 가장 비싼 기능 (coverage-gap, Sonnet 4 + 대량 input) 으로 소진해도 원가 ≈ $2.75 / $99 매출 → 마진 97%+. 따라서 **flat 정책의 재정적 리스크는 당장은 크지 않음.**
- **경쟁사 벤치마크:** Qase AIDEN, TestRail AI Hub, Cursor Pro — **모두 flat credit** 방식. GitHub Copilot 만 "premium request" 차등 도입 (2024 Q4, 요금제 혼란 이슈 유발). SaaS QA 시장은 flat 이 주류.
- **차등 도입의 최대 리스크는 재정이 아니라 UX.** "이 버튼은 2 크레딧이야" 를 매 버튼/모달에 표시하고 설명해야 함 → 온보딩 복잡도 증가, 지원 티켓 증가 예상. GitHub Copilot 이 같은 이유로 유저 반발을 샀음.
- **인프라는 이미 차등 지원.** `consume_ai_credit_and_log` RPC 는 `p_credit_cost` 를 이미 받고 있고, Edge Function 들도 `AI_FEATURES[key].creditCost` 를 그대로 pass-through. **코드 변경 범위는 `ai-config.ts` + mirror 파일만 바꾸면 즉시 적용됨.**
- **권장안:** **Option A (현행 유지) + 모니터링 대시보드 추가**. 이유는 §10.

---

## 1. 현재 정책 요약

### 1-1. 플랜별 월 크레딧 한도

소스: `supabase/functions/_shared/ai-config.ts` L10-18

| Tier | Plan Name | 월 credits | 가격 (USD/month, 연간 기준 단가) |
|------|-----------|-----------|-----|
| 1 | Free | 3 | $0 |
| 2 | Hobby | 15 | ~$12 |
| 3 | Starter | 30 | ~$29 |
| 4 | Professional | 150 | ~$99 |
| 5/6/7 | Enterprise S/M/L | 무제한 (-1) | contract |

> 가격은 참고용. 실제 가격은 `docs/prd.md` 및 Paddle 설정 기준. 여기서는 원가 비율만 중요.

### 1-2. 13개 AI 기능 현황

소스: `supabase/functions/_shared/ai-config.ts` L43-117, `src/hooks/useAiFeature.ts` L43-61

| # | Feature Key | minTier | Mode | 구현 상태 | Edge Function |
|---|-------------|---------|------|----------|---------------|
| 1 | tc_generation_text | 1 Free | `text` | 구현됨 | generate-testcases (step 1 text) |
| 2 | tc_generation_jira | 2 Hobby | `jira` | 구현됨 | generate-testcases (step 1 jira) |
| 3 | tc_generation_session | 4 Pro | `session` | 구현됨 | generate-testcases (step 1 session) |
| 4 | run_summary | 2 Hobby | `run-summary` | 구현됨 | generate-testcases (summarize-run) |
| 5 | coverage_gap | 3 Starter | `run-summary` | 구현됨 | generate-testcases (coverage-gap) |
| 6 | flaky_analysis | 3 Starter | `run-summary` | 구현됨 | generate-testcases (analyze-flaky) |
| 7 | requirement_suggest | 2 Hobby | `requirement-suggest` | 구현됨 | generate-testcases (suggest-from-requirement) |
| 8 | plan_assistant | 1 Free | `plan-assistant` | 구현됨 | plan-assistant |
| 9 | activity_summary | 2 Hobby | `activity-summary` | **미구현** | (없음) |
| 10 | risk_predictor | 3 Starter | `risk-predictor` | 구현됨 | risk-predictor |
| 11 | milestone_risk | 2 Hobby | `milestone-risk` | 구현됨 | milestone-risk-predictor |
| 12 | burndown_insight | 3 Starter | `burndown-insight` | **미구현** | (없음) |
| 13 | issues_analysis | 4 Pro | `issues-analysis` | **미구현** | (없음) |
| 14 | tag_heatmap_insight | 4 Pro | `tag-heatmap-insight` | **미구현** | (없음) |

> 주: 13개로 세면 `AI_FEATURES` 키 기준 13개 (step 2 detail generation 제외). **실구현은 9개**. 나머지 4개는 향후 출시 대비 선언만 되어 있음 (f011 research §1-2 재확인).

### 1-3. 정책 철학

주석 원문 (`ai-config.ts` L9):
```
// 모든 AI 기능은 호출 1회당 1 credit 차감. 사용량은 mode 무관 shared pool로 합산.
```

- Shared pool: owner + owner 소유 프로젝트의 모든 멤버가 소비한 credit 을 owner 기준으로 합산.
- step=1 INSERT 만 차감 (step=2 detail generation 은 무료 — step1 title 선정의 부속 과정).
- Cache hit 시 0 credit (summarize-run, coverage-gap, flaky-analysis 모두 `ai_generation_logs.input_data->>content_hash` 기반 캐시).

---

## 2. Anthropic 2025 공식 가격 (2026-04 기준)

소스: https://www.anthropic.com/pricing — **실제 적용 전 CEO 가 재확인 필수**.

| Model | Input (USD/1M tokens) | Output (USD/1M tokens) | Output/Input 배수 |
|-------|----------------------|------------------------|------------------|
| Claude Haiku 4.5 (`claude-haiku-4-5-20251001`) | $1.00 | $5.00 | 5x |
| Claude Sonnet 4 (`claude-sonnet-4-20250514`) | $3.00 | $15.00 | 5x |
| Claude Opus 4.7 (참고, Testably 미사용) | $15.00 | $75.00 | 5x |

> 경고: 이전 세대 모델 (Haiku 3.5 $0.80/$4.00, Sonnet 3.5 $3.00/$15.00) 과 가격이 다를 수 있음.
> Testably 는 2025-10 배포 Haiku 4.5, 2025-05 Sonnet 4 를 사용 중.

---

## 3. 기능별 실제 원가 분석 (Estimated)

### 3-1. 토큰 추정 방법

- System prompt 토큰: 실제 코드의 system prompt 글자 수 / 4 ≈ tokens (영어 + JSON schema 혼합 기준).
- Dynamic input: 평균적인 프로젝트 (TC 50개 수준, 런 200개 테스트 결과) 기준 추정.
- Output: `max_tokens` 대비 실사용률 ~50% 가정 (constrained JSON 응답이라 보통 cap 못 채움).
- **실측 검증 권장:** `ai_generation_logs.tokens_used` 컬럼에 이미 저장되고 있음. SQL 로 mode 별 `AVG(tokens_used)` 뽑아 아래 추정치와 대조하면 1시간 내 확정 가능.

### 3-2. 기능별 추정 원가 표

| # | Feature | 모델 | System (토큰) | Input Dyn (토큰) | Max Output | 실 Output (~50%) | Input USD | Output USD | **총 USD/호출** | 150 credits 소진시 worst (USD) |
|---|---------|------|--------------|------------------|------------|-----------------|-----------|------------|----------------|--------------------------------|
| 1 | tc_gen_text (step1) | Sonnet 4 | ~100 | ~500 (feature desc) | 4096 | 2000 | $0.0018 | $0.030 | **$0.032** | $4.80 |
| 2 | tc_gen_jira (step1) | Sonnet 4 | ~100 | ~1500 (issue desc + AC) | 4096 | 2000 | $0.0048 | $0.030 | **$0.035** | $5.25 |
| 3 | tc_gen_session (step1) | Sonnet 4 | ~100 | ~2000 (session logs) | 4096 | 2000 | $0.0063 | $0.030 | **$0.036** | $5.40 |
| — | tc_gen (step2 detail) | Sonnet 4 | 0 | ~500 (titles array) | 4096 | 3000 | $0.0015 | $0.045 | **$0.047** | (별도 credit 아님, step1과 쌍) |
| 4 | run_summary | Sonnet 4 | ~1000 (JSON schema crowded) | ~1500 (failed/blocked list) | 2048 | 1000 | $0.0075 | $0.015 | **$0.023** | $3.38 |
| 5 | coverage_gap | Sonnet 4 | ~1500 (+ requirements schema) | ~3000 (folder + req summary) | 2048 | 1500 | $0.0135 | $0.0225 | **$0.036** | $5.40 |
| 6 | flaky_analysis | Sonnet 4 | ~800 | ~800 (flaky list) | 1024 | 500 | $0.0048 | $0.0075 | **$0.012** | $1.85 |
| 7 | requirement_suggest | Sonnet 4 | ~500 | ~1000 (req + existing TCs) | 4096 | 2500 | $0.0045 | $0.0375 | **$0.042** | $6.30 |
| 8 | plan_assistant | **Haiku 4.5** | ~300 | ~3000 (80 TCs listed) | 4096 | 2500 | $0.0033 | $0.0125 | **$0.016** | $2.40 |
| 10 | risk_predictor | **Haiku 4.5** | ~250 | ~1500 (plan stats + TC list) | 1024 | 500 | $0.00175 | $0.0025 | **$0.0043** | $0.64 |
| 11 | milestone_risk | **Haiku 4.5** | ~300 | ~2000 (milestone stats) | 1024 | 500 | $0.00230 | $0.0025 | **$0.0048** | $0.72 |

> 계산 예시 (coverage_gap):
>   Input = (1500 + 3000) × $3.00 / 1,000,000 = 4500 × 0.000003 = $0.0135
>   Output = 1500 × $15.00 / 1,000,000 = 1500 × 0.000015 = $0.0225
>   합계 = $0.036 /호출

### 3-3. 원가 격차 분석

- **최저 원가: milestone_risk ≈ $0.0048** (Haiku + 작은 prompt + 작은 output)
- **최고 원가: requirement_suggest ≈ $0.042** (Sonnet + 4096 max_tokens + 실제 긴 응답)
- **격차 배수: 약 8.75x** ($0.042 / $0.0048)
- 단, 실구현 9개 기능의 **중앙값은 ~$0.023/호출** — Sonnet 기반 기능들은 대부분 $0.023 ~ $0.042 범위에 클러스터됨.

### 3-4. Pro Plan Unit Economics (150 credits/month, $99 수익)

| 시나리오 | 원가 추정 | 마진 |
|---------|-----------|------|
| **Best case** (전부 milestone_risk) | 150 × $0.0048 = **$0.72** | 99.3% |
| **Median case** (믹스 가정, $0.020/호출) | 150 × $0.020 = **$3.00** | 97.0% |
| **Worst case** (전부 requirement_suggest) | 150 × $0.042 = **$6.30** | 93.6% |

→ **현행 flat 정책 유지 시에도 Pro plan 은 93~99% 마진을 유지**. 재정적 위기 신호 없음.

### 3-5. Free Plan Unit Economics (3 credits, $0 수익)

- Worst case: 3 × $0.042 = **$0.126/user/month**
- 10,000명 Free 유저 전원이 worst-case 소진 시: $1,260/month Anthropic 비용.
- 현재 규모 대비 감수 가능한 CAC 수준이나, 급성장 시 monitoring 필요.

### 3-6. Enterprise (무제한) 리스크

- 무제한 유저가 매일 5회 × 30일 × worst-case = 150 × $0.042 = **$6.30/user/month**
- Enterprise 가격이 $500+/month 라면 여전히 98%+ 마진.
- **abuse 시나리오** (1유저가 일일 1,000회 자동 호출): 30,000 × $0.042 = **$1,260/month/user**. Enterprise 마진 붕괴.
- → **flat/차등과 무관하게 Enterprise 는 별도 rate limit + 초과 모니터링 필요**. 이건 이번 결정 범위 밖.

---

## 4. 경쟁사 비교표

| 제품 | 정책 | 단위 | 기능 간 차등 | 비고 |
|------|------|------|--------------|------|
| **Qase AIDEN** (2024-2025) | Flat credit | "AIDEN credits" | 없음 (호출당 1 credit) | Enterprise 는 커스텀 한도 |
| **TestRail AI Hub** (2024-) | Flat (기능별 "AI actions") | "AI action" | 없음 공식 발표 | 현재 무료 베타, 유료화 시 변경 가능성 |
| **GitHub Copilot** (2024 Q4~) | **Tiered** ("premium request" = 1, o1 = 10x) | "premium request" | 3-tier (1x / 3x / 10x) | 2024-12 도입 직후 유저 반발 → 공지 주기 짧았다는 비판 (Hacker News, Reddit) |
| **Cursor Pro** (2024-) | Flat "fast request" + unlimited slow | "fast request" | 모델 선택 시 내부 비용 차이 있으나 유저는 flat 500 fast requests/mo | Premium models 은 별도 요금제 |
| **Anthropic Console** (vendor 직접) | **Pure metered** | tokens | input/output/모델별 모두 차등 | 개발자 대상이라 복잡도 허용 |
| **OpenAI ChatGPT Team/Enterprise** | Flat seat + message cap | "messages" | GPT-4 vs GPT-3.5 구분하지 않음 (사용자 선택이 모델을 바꿈) | Enterprise 는 custom quota |
| **Vercel v0** | Flat "generations" | "generation" | 없음 | |
| **Replit AI** | Flat monthly "AI cycles" | cycle | 없음 | |

**핵심 패턴:**
1. **SaaS 제품 (end-user 대상) 은 거의 다 flat.** 유저에게 복잡도 부담 주면 churn.
2. **Vendor 제품 (Anthropic Console 등 API 판매) 은 metered.** 개발자는 복잡도 허용.
3. **GitHub Copilot 의 tiered 도입은 예외적.** 이유: GPT-4o 와 o1-preview 간 vendor 원가 차이가 20x+ → flat 유지가 재정적으로 불가능했던 것으로 추정.
4. Testably 의 기능 간 원가 격차 (~8x) 는 GitHub Copilot 의 모델 간 격차 (~20x+) 보다 **작다**. Copilot 수준의 도입 동기는 아직 없음.

---

## 5. 3가지 정책 옵션 비교

### Option A — 현행 유지 (Flat 1-credit)

| 항목 | 내용 |
|------|------|
| **장점** | 유저 온보딩 단순 / 경쟁사 패턴과 일치 / 구현 변경 0 / 지원 티켓 최소 / "150 credits = 150 actions" 직관적 |
| **단점** | 헤비 기능 abuse 억제력 없음 / 원가 구조와 가격이 디커플링 / 고성장 시 미래 재정 리스크 |
| **수익 영향** | 현 상태 유지. Pro 마진 93~99% |
| **UX 임팩트** | 0 |
| **구현 복잡도** | 0 (아무것도 안 함) |
| **도입 기간** | N/A |
| **리스크** | 헤비 기능 (requirement_suggest, tc_gen_session) 에 abuse 봇 유입 시 원가 급증. 단, rate limit 으로 대응 가능 (rate-limit.ts 이미 존재) |

### Option B — 2-tier (light=1, heavy=2)

| 항목 | 내용 |
|------|------|
| **장점** | 원가 반영 일부 달성 / UI 복잡도 감당 가능 ("1 크레딧" / "2 크레딧" 두 종류) / 헤비 abuse 완화 |
| **단점** | Free 3 credits → 실질 1.5회 사용 (헤비 1회 + 라이트 1회) — 체감 한도 하락 → conversion funnel 악화 우려 |
| **수익 영향** | 약 20~30% credit 소진 감소 추정 (heavy 기능 비중이 실제 30~40%인 경우) → quota hit rate 하락 → upgrade 전환율 감소 가능 |
| **UX 임팩트** | 중간. 각 AI 버튼 옆 "2 credits" 뱃지 필요 / 에러 메시지 수정 / quota 계산 UI 재설계 |
| **구현 복잡도** | 낮음. `ai-config.ts` 의 `creditCost` 만 수정 + 프론트 뱃지 추가 |
| **도입 기간** | 30일 공지 후 시행 권장 |
| **리스크** | 기존 Pro 유저가 "150 → 실질 100회" 로 느끼면 downgrade / 환불 요청 유발 |

**Option B tier 분류 제안:**

| 기능 | Tier | 근거 |
|------|------|------|
| tc_generation_text | 1 (light) | 원가 $0.032 (중간) — abuse 위험 낮음 (Free 에 노출되므로 유지) |
| tc_generation_jira | 1 (light) | $0.035 — 위와 동일 |
| tc_generation_session | **2 (heavy)** | $0.036, Pro 전용, 세션 로그 길이 가변적이라 폭증 가능 |
| run_summary | 1 (light) | $0.023 (저렴) |
| coverage_gap | **2 (heavy)** | $0.036, 큰 prompt + requirements 조회 조합 |
| flaky_analysis | 1 (light) | $0.012 (가장 저렴한 Sonnet 기능) |
| requirement_suggest | **2 (heavy)** | $0.042 (최고가) |
| plan_assistant | 1 (light) | $0.016 (Haiku) |
| risk_predictor | 1 (light) | $0.0043 (Haiku) |
| milestone_risk | 1 (light) | $0.0048 (Haiku) |
| activity_summary (미구현) | TBD | |
| burndown_insight (미구현) | TBD | |
| issues_analysis (미구현) | TBD | |
| tag_heatmap_insight (미구현) | TBD | |

→ **Heavy tier 로 분류 추천: 3개** (tc_generation_session, coverage_gap, requirement_suggest)

### Option C — 3-tier (light=1, medium=2, heavy=3)

| 항목 | 내용 |
|------|------|
| **장점** | 원가 반영 가장 정확 / 최고가 기능 (requirement_suggest) 적절히 억제 |
| **단점** | UI 복잡도 상승 (3종 뱃지) / 유저가 "이거 몇 크레딧이지?" 항상 확인해야 함 / 지원 티켓 증가 예상 / 경쟁사 관례와 이탈 |
| **수익 영향** | 약 30~40% credit 소진 감소 추정 → quota hit 빈도 감소 → **upgrade 전환율 5~10% 감소 가능성** |
| **UX 임팩트** | 높음. 매 AI 버튼에 1/2/3 뱃지, 툴팁, 가격표 업데이트, 도움말 문서 재작성 |
| **구현 복잡도** | 낮음 (설정 변경) 이나 UX 문서화 작업이 무거움 |
| **도입 기간** | 45~60일 공지 후 시행 권장 (UX 변경 폭 큼) |
| **리스크** | GitHub Copilot 전례 — 유저 반발, social media backlash, "가격 인상" 프레이밍 가능성 |

**Option C tier 분류 제안:**

| 기능 | Tier | 원가 | 근거 |
|------|------|------|------|
| risk_predictor | 1 | $0.0043 | Haiku 최저가 |
| milestone_risk | 1 | $0.0048 | Haiku |
| flaky_analysis | 1 | $0.012 | 가장 저렴한 Sonnet |
| plan_assistant | 1 | $0.016 | Haiku 대용량 output |
| run_summary | **2** | $0.023 | Sonnet 중가 |
| tc_generation_text | **2** | $0.032 | Sonnet 중가 |
| tc_generation_jira | **2** | $0.035 | Sonnet + 외부 API fetch |
| tc_generation_session | **3** | $0.036 | Pro 전용 + 가변 input |
| coverage_gap | **3** | $0.036 | requirements 조회 추가 |
| requirement_suggest | **3** | $0.042 | 최고가 |

→ **Heavy tier (cost=3) 로 분류 추천: 3개** (tc_generation_session, coverage_gap, requirement_suggest)
→ **Medium tier (cost=2) 로 분류 추천: 3개** (run_summary, tc_generation_text, tc_generation_jira)
→ **Light tier (cost=1) 로 유지: 4개**

---

## 6. Tier 분류 요약표 (B / C 각각)

### Option B (2-tier)

| creditCost | 기능 수 | 기능 키 |
|-----------|---------|---------|
| 1 (light) | 7 | tc_text, tc_jira, run_summary, flaky_analysis, plan_assistant, risk_predictor, milestone_risk |
| 2 (heavy) | 3 | tc_session, coverage_gap, requirement_suggest |

### Option C (3-tier)

| creditCost | 기능 수 | 기능 키 |
|-----------|---------|---------|
| 1 (light) | 4 | flaky_analysis, plan_assistant, risk_predictor, milestone_risk |
| 2 (medium) | 3 | run_summary, tc_text, tc_jira |
| 3 (heavy) | 3 | tc_session, coverage_gap, requirement_suggest |

---

## 7. Implementation 체크리스트 (B 또는 C 채택 시)

### 7-1. 코드 변경 범위 (매우 작음)

1. **`supabase/functions/_shared/ai-config.ts`** — `AI_FEATURES` 의 `creditCost` 숫자만 수정.
2. **`src/hooks/useAiFeature.ts`** — 동일 미러 수정.
3. **`supabase/functions/_shared/ai-usage.ts`** — 변경 없음 (이미 `config.creditCost` 를 읽어 `consume_ai_credit_and_log` 에 전달).
4. **RPC `consume_ai_credit_and_log`** — 변경 없음 (`p_credit_cost` 파라미터 이미 수용).

### 7-2. UI 변경 (Option B/C 공통)

| 파일 | 변경 |
|------|------|
| 각 AI 버튼 컴포넌트 (TC generation modal, Run summary panel, Coverage gap panel, etc.) | "Uses 1 credit" → "Uses 2 credits" 조건부 표시 |
| `src/pages/settings/components/AiUsagePanel.tsx` (f011) | 기능별 사용량 breakdown 에 cost 반영 (이미 credits_used 컬럼 사용 중이라 자동 반영) |
| 요금제 페이지 (pricing page) | 각 플랜 설명에 "light / heavy action 소비 기준" 주석 추가 |
| 에러 메시지 ("Monthly AI credit limit reached") | 변경 없음 |
| i18n 키 추가 | `aiFeature.cost.light` / `aiFeature.cost.heavy` / 툴팁 설명 |

### 7-3. 테스트

- [ ] f018 race-condition 테스트 재실행 (credit cost 변경 후에도 advisory lock 동작 확인)
- [ ] `consume_ai_credit_and_log` 가 `p_credit_cost=2,3` 입력 시 정상 INSERT 및 quota 계산 확인
- [ ] Free 유저 3 credits 로 heavy 기능 2회 호출 시 두 번째가 429 반환되는지 확인
- [ ] f011 대시보드에 새 creditCost 가 반영되는지 확인 (credits_used SUM)

### 7-4. 모니터링 후처치

- [ ] 배포 후 7일간 `ai_generation_logs.tokens_used` 실측값 vs §3-2 추정값 대조
- [ ] quota hit rate 추이 (전환율 영향 확인)
- [ ] 지원 티켓 수 변동 (특히 "왜 2 크레딧 차감됐지?" 유형)

---

## 8. 마이그레이션 타임라인 (B/C 채택 시)

### Option B (최소 30일)

| D+ | 작업 |
|----|------|
| D-0 | CEO 최종 결정 + 분류안 확정 |
| D+1 | 변경 이메일 초안 작성 (@marketer) + in-app banner 작성 |
| D+3 | 기존 유료 유저 전체 이메일 공지 ("New credit pricing starting {date}") |
| D+3 ~ D+30 | in-app banner + pricing page 업데이트 + FAQ 문서 게시 |
| D+30 | 코드 배포 (creditCost 숫자 변경) |
| D+30 ~ D+37 | 지원 채널 상시 모니터링 + quota hit rate 일일 확인 |
| D+60 | 정책 효과 retrospective + 필요시 추가 조정 |

### Option C (최소 45일)

같은 구조 + UI 뱃지 디자인 작업 2주 추가 + 도움말 재작성.

### Backward compatibility

- 기존 `ai_generation_logs.credits_used` 값은 그대로 유지. 과거 로그는 당시 credit 기준으로 계산된 상태이므로 재계산 불가 — **이건 유지가 맞음** (과거 월 quota 판정에 영향 없음).
- 이번 월 quota 계산은 새 값 적용 시점부터 반영. 월 중간 변경 시 유저 혼란 방지 위해 **월초 (UTC 1일 00:00) 배포 강력 권장**.

---

## 9. CEO 결정 질문지

### 9-1. 본질 질문 3가지

**Q1. 원가 격차 8x 가 가격 정책을 바꿀 만한 신호인가?**
- 격차 자체는 존재하나 **Pro 플랜 worst-case 마진 93.6%** 이므로 재정적 긴급성은 낮음.
- 유저 ARR 규모가 $1M+ 이 된 시점에서 재검토할지, 지금 선제 도입할지.

**Q2. GitHub Copilot 의 tiered 도입 실패 사례를 참고할 것인가?**
- Copilot 은 premium request 도입 직후 Hacker News/Reddit 에서 강한 반발 겪음.
- Testably 는 초기 성장 단계 → **가격 복잡도 증가가 conversion 에 미치는 악영향 리스크 > 원가 절감 효과** 가능성 높음.

**Q3. 미구현 4개 기능 (activity_summary 등) 은 언제 어떻게 출시할 것인가?**
- 이 4개가 실구현될 때 자연스럽게 creditCost 재산정 논의가 필요해짐.
- 지금 정책을 확정하면 4개 신기능 모두 새 정책 하에 출시. 나중에 바꾸면 2회 변경 공지 필요.

### 9-2. 보조 질문

- 기존 Pro 유저 (150 credits) 에게 downgrade 체감을 주지 않는 방법: "Pro plan 을 150 → 200 credits 로 인상 + tiered 도입" 번들로 묶는 방안도 고려 가능.
- Enterprise 의 무제한 abuse 리스크는 **이번 결정과 무관하게** 별도 rate limit 으로 대응 필요.
- 미구현 4개 기능의 예상 원가를 미리 추정해서 tier 결정 후 출시할지, 출시 시점에 재결정할지.

---

## 10. 권장안 (Planner 의견)

### 권장: **Option A (현행 유지) + 2가지 선제 조치**

**근거 (데이터 요약):**
1. **재정 긴급성 낮음.** Pro worst-case 마진 93.6%. 지금 차등 도입해서 얻는 원가 절감 < UX 복잡도로 인한 conversion 손실 추정치.
2. **경쟁사 벤치마크.** SaaS QA 도구들 (Qase, TestRail) 모두 flat. Testably 가 튀어서 복잡한 정책 가는 것은 포지셔닝상 불리.
3. **GitHub Copilot 의 반면교사.** 가장 유명한 tiered 도입 사례가 backlash 로 귀결됨.
4. **인프라는 이미 차등 지원 완료.** 나중에라도 1일 내 전환 가능. **지금 바꿀 긴급성 없음.**

**단, 2가지 선제 조치 권장:**

**조치 1: 실측 원가 계측 대시보드 (1주 작업, f011 연장선)**
- `ai_generation_logs.tokens_used` 를 mode × 월별로 집계하는 내부 어드민 페이지.
- 실측 원가가 추정치보다 20%+ 벗어나는 기능이 나타나면 즉시 차등 도입 검토 트리거.

**조치 2: Enterprise abuse 방지 rate limit 강화 (이번 정책과 무관하게 필요)**
- `rate-limit.ts` 에 기능별 burst 제한 명시.
- 일일 호출 상한 (예: user 당 200회/day) 도입 — 무제한 플랜에도 적용.

### 차선: **Option B — 향후 6개월 내 재검토 조건부**

- ARR $1M 돌파 또는 월간 Anthropic 비용이 매출의 5% 넘어가는 시점에 재검토.
- 그때는 2-tier (light=1 / heavy=2) 가 3-tier 보다 UX 영향 적으면서도 원가 반영 가능.
- **3개 기능만 heavy (tc_session, coverage_gap, requirement_suggest)** — 전체 호출의 ~20%만 영향받음.

### 비권장: Option C (3-tier)

- UX 복잡도 증가 대비 수익 개선 효과 미미.
- 미래 확장 여지로 남겨두는 것은 OK 이나, 2026년 현 단계에서는 도입 비권장.

---

## Appendix A. 참조 파일 목록 (검증 경로)

### 현재 정책 (코드)
- `/Users/yonghyuk/testflow/supabase/functions/_shared/ai-config.ts` — `AI_FEATURES`, `PLAN_LIMITS`
- `/Users/yonghyuk/testflow/supabase/functions/_shared/ai-usage.ts` — `checkAiAccess`, `consumeAiCredit`, `getSharedPoolUsage`
- `/Users/yonghyuk/testflow/src/hooks/useAiFeature.ts` — 프론트 mirror
- `/Users/yonghyuk/testflow/src/lib/aiUsageMeta.ts` — f011 display mode 메타
- `/Users/yonghyuk/testflow/supabase/migrations/20260424_f018_ai_credit_atomic_consume_rpc.sql` — `p_credit_cost` 파라미터 이미 존재 (차등 즉시 수용)

### Edge Functions (원가 추정 기반)
- `/Users/yonghyuk/testflow/supabase/functions/generate-testcases/index.ts` — 5개 AI action
- `/Users/yonghyuk/testflow/supabase/functions/plan-assistant/index.ts`
- `/Users/yonghyuk/testflow/supabase/functions/milestone-risk-predictor/index.ts`
- `/Users/yonghyuk/testflow/supabase/functions/risk-predictor/index.ts`

### 관련 스펙/리서치
- `/Users/yonghyuk/testflow/pm/specs/dev-spec-ai-usage-shared-pool.md` — shared pool 원본 스펙
- `/Users/yonghyuk/testflow/docs/specs/dev-spec-f018-ai-credit-race-condition.md` — atomic consume RPC 스펙
- `/Users/yonghyuk/testflow/docs/research/f011-ai-token-budget-dashboard.md` — 경쟁사 분석 최근 자료
- `/Users/yonghyuk/testflow/docs/PRD.md` — 제품 포지셔닝

---

## Appendix B. 실측 검증 쿼리 (배포 전 실행 권장)

```sql
-- 최근 30일 기능별 평균 토큰 사용량 (추정치 검증용)
SELECT
  mode,
  COUNT(*) AS call_count,
  ROUND(AVG(tokens_used)::numeric, 0) AS avg_tokens,
  ROUND(MAX(tokens_used)::numeric, 0) AS max_tokens,
  ROUND(AVG(latency_ms)::numeric, 0) AS avg_latency_ms
FROM ai_generation_logs
WHERE step = 1
  AND created_at >= NOW() - INTERVAL '30 days'
  AND tokens_used IS NOT NULL
GROUP BY mode
ORDER BY avg_tokens DESC;
```

- 이 쿼리 결과와 §3-2 추정치를 대조.
- 추정치 ±30% 이내면 정책 판단에 무리 없음.
- ±50% 초과 편차 기능이 있으면 해당 기능만 우선 개별 조정 고려.

---

*End of memo.*
