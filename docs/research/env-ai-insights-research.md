# Research: Environment Heatmap AI Insights 강화 (f001 + f002)

> 작성일: 2026-04-24
> Phase 1 / CLAUDE.md 파이프라인 — researcher 산출물

---

## 핵심 발견 (3줄 요약)

- 경쟁사(Qase, Xray, Zephyr, TestRail, Testmo) 중 **Environment Coverage에 직접 AI 인사이트를 붙인 제품은 없음**. Qase AIDEN은 flaky 감지 + 자연어 요약을 제공하지만 env×TC 히트맵 단위가 아닌 실행 전체 단위에서만 작동. Testably의 env heatmap 사이드바 AI는 이 영역의 공백을 최초로 메우는 포지션.
- `create-jira-issue` / `create-github-issue` Edge Function이 이미 존재하고, FocusMode에서 title/body pre-fill 패턴이 구현되어 있음. IssueCreateModal 전용 컴포넌트는 없으나 FocusMode 내부 inline 모달(showGithubIssueModal)을 분리 추출하거나, 직접 Edge Function을 호출하는 인라인 폼을 EnvironmentAIInsights 내에 구현하는 것이 현실적.
- milestone-risk-predictor의 하이브리드 패턴(rule-based context 수집 → Claude Haiku 호출 → JSONB 캐시)은 env-ai-insights Edge Function에 그대로 적용 가능. 인풋 context를 "env별 pass rate, untested TC 목록, 최근 7일 실행 추이"로 특화하면 된다.

---

## 상세 분석

### 1. 경쟁사 Environment Coverage AI 패턴 비교

#### Qase — "Configurations + AIDEN"
Qase는 "Configurations" 로 브라우저/OS 조합을 테스트 런에 붙일 수 있음. 그러나 이는 **런 태그** 역할이며 매트릭스 뷰는 공식 문서에 나타나지 않는다. AIDEN은 automation flaky 감지, 유사 실패 그룹핑, Timeline View에서 "동시 실패가 환경 문제인지" 감지하는 수준. **env×TC 히트맵 단위 AI 분석 없음.**
- [Qase Product Overview](https://qase.io/product), [AIDEN QA Architect Docs](https://docs.qase.io/aiden-qase-ai/qa-architect), [Configurations Docs](https://docs.qase.io/general/execution/using-configurations-in-qase-tms)

#### Xray (Jira) — "Test Plan Coverage Report"
Test Plan 매트릭스는 자동/수동 TC 타입별 커버리지 + env 필터링까지 지원. 단 요구사항 → TC 추적성 중심이며 browser/OS 차원 히트맵은 없음. AI 기능은 2025년 기준 "Gherkin 생성" 수준.
- [Xray vs Zephyr](https://testsigma.com/blog/xray-vs-zephyr/), [Atlassian Community AI TC Generator](https://community.atlassian.com/forums/App-Central-articles/New-in-AI-Test-Case-Generator-for-Jira-Xray-and-Zephyr-Latest-AI/ba-p/3114819)

#### Zephyr Scale (SmartBear)
Coverage gadget은 user story→untested 가시화만. Enterprise 변형에만 "ML 결함 누출 예측"이 언급되나 SmartBear Analytics 별도 제품. env/browser 매트릭스 AI 없음.
- [TestRail vs Zephyr vs Xray](https://testrigor.com/blog/testrail-vs-zephyr-vs-xray/)

#### TestRail
v10.2에서 "Jira requirement → TC 커버리지 확인" 추가. "AI Test Script Generation"(9.5)/"Sembi IQ"(2025.9)는 TC 생성 특화이지 env 분석이 아님.
- [TestRail 10.2](https://yrkan.com/tools-updates/testrail-10-2-whats-new/), [TestRail AI](https://www.testrail.com/ai-test-management/)

#### Testmo
2025년 "Testmo AI" 출시, 단 공식 페이지에 env 분석 세부 내용 확인 불가. 강점은 통합 대시보드(manual + exploratory + automated).
- [Testmo 2025 Year in Review](https://www.testmo.com/blog/testmo-2025-year-in-review/)

#### 경쟁사 매트릭스 요약

| 도구 | Env×TC 히트맵 | AI Env 인사이트 | 자연어 설명 | 액션 연계 |
|------|-------------|--------------|-----------|---------|
| Testably (현재) | ✅ rule-based | ❌ | ❌ | ❌ Coming soon |
| **Testably (f001+f002 목표)** | ✅ | ✅ | ✅ | ✅ |
| Qase | 런 태그 수준 | AIDEN (실행 전체) | 부분 | ❌ |
| Xray | 요구사항 커버리지 | ❌ | ❌ | ❌ |
| Zephyr Scale | ❌ | ML (엔터프라이즈만) | ❌ | ❌ |
| TestRail | RTM 커버리지 | TC 생성만 | ❌ | ❌ |
| Testmo | 통합 대시보드 | ? | ? | ? |

**Testably 차별점:** env×TC 2차원 히트맵에서 rule-based 트리거 조건(pass rate < 40%, untested ≥ 50%)을 먼저 파악한 뒤 Claude Haiku가 자연어 추천을 생성하는 하이브리드 방식은 현존 경쟁사에 없는 포지션.

---

### 2. Claude Haiku 프롬프트 구조 분석 및 env coverage 응용안

#### milestone-risk-predictor 프롬프트 구조 분석

코드베이스 분석 결과 (`supabase/functions/milestone-risk-predictor/index.ts`):
- **System prompt:** "QA risk analyst. Respond ONLY with valid JSON. Be data-driven, cite specific TC IDs and tags."
- **User prompt 구성:** 마일스톤 이름, 날짜, 실행 요약(passed/failed/untested, pass rate), velocity 7일 배열, 상위 실패 태그, 실패/blocked TC 목록(최근 10개), sub-milestone 목록
- **Output JSON schema:** `{ risk_level, confidence, summary, bullets[], recommendations[] }`
- **캐시 전략:** `milestones.ai_risk_cache` JSONB 컬럼, 24시간 유효, locale mismatch 시 재생성
- **크레딧 처리:** `consumeAiCredit()` (f018 패턴) — 클로드 호출 성공 후 원자적 차감

#### env-ai-insights 응용 프롬프트 설계안

**Edge Function 이름 제안:** `supabase/functions/env-ai-insights/index.ts`

**Request Body:**
```jsonc
{
  "plan_id": "<uuid>",
  "force_refresh": false,
  "locale": "en"
}
```

**서버 측 context 수집 항목** (milestone-risk-predictor와 동일 패턴):
- `environments` 테이블에서 plan에 연결된 env 목록 (id, name, os_name, browser_name)
- `test_results` + `test_runs` join으로 각 env별 passed/failed/untested count
- 최근 7일 실행 추이 (날짜별 실행 수 per env)
- `test_plan_test_cases`에서 plan에 속한 TC 목록 (id, title, custom_id, priority)
- critical/high priority TC 중 untested 비율

**User Prompt 초안:**
```
Environment Coverage Analysis for Test Plan: "{plan_name}"
Total TCs in plan: {total_tcs}
Overall pass rate (executed): {overall_pass_rate}%

Environment Breakdown:
{env_name} ({os} / {browser}): {passed} passed, {failed} failed, {untested} untested → {pass_rate}% pass rate
[...반복...]

Critical + High priority TCs untested count: {critical_untested}
Top untested TC (by env count): {tc_title} — untested in {n}/{total_envs} envs

Recent 7-day execution trend (total results/day): [{day1},...,{day7}]

Return this exact JSON:
{
  "headline": "<1 sentence, max 120 chars>",
  "critical_env": "<env name or null>",
  "critical_reason": "<why this env is risky, cite pass rate and TC count>",
  "coverage_gap_tc": "<TC title or null>",
  "coverage_gap_reason": "<why this TC needs attention>",
  "recommendations": ["<action 1>", "<action 2>", "<action 3>"],
  "confidence": <0-100 integer>
}

Rules:
- critical_env = env with lowest pass rate among envs with >= 3 executed TCs
- coverage_gap_tc = TC untested in >= 50% of envs
- recommendations must be specific (cite env names, TC IDs, numbers)
- If < 5 total executed results, confidence <= 40
- recommendations: 2-4 items, each actionable within 1-3 days
```

**Output TS type:**
```ts
interface EnvAiInsightsResult {
  headline: string;
  critical_env: string | null;
  critical_reason: string | null;
  coverage_gap_tc: string | null;
  coverage_gap_reason: string | null;
  recommendations: string[];
  confidence: number;
  generated_at: string;
}
```

**캐시 전략 제안:** `test_plans.ai_env_insights_cache JSONB` 컬럼. 유효 24시간. milestone-risk-predictor와 동일하게 `force_refresh` + locale mismatch 시 재생성.

**토큰 추정:** 입력 600-800 토큰, 출력 200-300 토큰. Claude Haiku 기준 $0.0003-0.0005/호출. 크레딧 1개 (flat) 적합.

---

### 3. Issue 생성 pre-fill UX 레퍼런스 및 현존 컴포넌트 재사용 맵

**업계 패턴:** GitHub Issues URL 쿼리(`?title=&body=&labels=&assignee=`) / Jira URL 파라미터 / Linear 컨텍스트 → 모달 자동 입력. 공통 원칙: **컨텍스트 객체를 모달 open 시 props로 전달.**
- [GitHub pre-fill URL](https://github.com/sindresorhus/new-github-issue-url), [Jira Community](https://community.atlassian.com/forums/Jira-questions/Pre-filled-fields-upon-create-issue-for-jira-cloud/qaq-p/582022)

**현존 코드베이스 조사:**
- 공유 `IssueCreateModal` 전용 컴포넌트는 **존재하지 않는다.**
- `FocusMode.tsx` — `createGithubIssue()` 함수 (인라인 `showGithubIssueModal`), title pre-fill 지원.
- `supabase/functions/create-jira-issue/index.ts` — summary/description/priority/labels/assignee/components/fieldMappings 지원.
- `supabase/functions/create-github-issue/index.ts` — title/body/labels/assignee 지원.

**f002 "Create Issue" 칩 구현 옵션:**
- **Option A (추천, 경량):** EnvironmentAIInsights 또는 plan-detail 페이지에 인라인 미니 모달 추가. title pre-fill = "Critical env failure: {env_name}", description = AI 인사이트 텍스트. `jira_settings` / `github_settings` 쿼리로 Jira/GitHub 라우팅.
- **Option B (장기):** FocusMode 로직을 `IssueCreateModal` 공유 컴포넌트로 추출 후 재사용. **f002 스코프 외.**

**f002 "Assign Run" 칩:** `project-runs/page.tsx`의 `showAddRunModal` + `addRunStep` 2단계 모달이 실질적 진입점. EnvironmentAIInsights는 현재 `matrix` prop만 받음 → props 확장 필요.

**f002 "Filter" 칩:** plan-detail/page.tsx에서 heatmap은 filter state를 갖지 않음. `activeEnvHighlight` state 신규 추가 필요. 히트맵 테이블 env column CSS 강조.

---

### 4. 리스크 및 OOS 후보

**f001 Edge Function 리스크**
- `test_plans` 테이블에 `ai_env_insights_cache` 컬럼 없음 → **DB 마이그레이션 필요**
- plan에 env가 없거나 결과 3개 미만 → AI 호출 의미 없음 → 조기 종료 (milestone-risk-predictor `no_tcs` 패턴)
- Cold start + Claude API 지연 최대 5-8초 → 로딩 인디케이터 필수
- `AI_FEATURES`에 `environment_ai_insights` 등록 시 `ai-config.ts`(백엔드) + `useAiFeature.ts`(프론트) 양쪽 동기화 필수

**f002 UX 리스크**
- "Create Issue": Jira/GitHub 설정 없는 유저에게 어떤 UI? (설정 페이지 유도 vs 토스트)
- "Assign Run": plan-detail에 run 생성 모달 없음 → (a) AddRunModal 이식 / (b) navigate with pre-select / (c) runs 탭 스크롤+토스트. **(c) 1차 추천.**
- "Filter": column highlight CSS는 단순. 다른 env 클릭 시 이전 highlight 해제 로직 필요.

---

## 데이터 소스
- [Qase Product Overview](https://qase.io/product)
- [Qase AIDEN QA Architect Docs](https://docs.qase.io/aiden-qase-ai/qa-architect)
- [TestRail AI & Innovation](https://www.testrail.com/ai-test-management/)
- [TestRail 10.2 Update](https://yrkan.com/tools-updates/testrail-10-2-whats-new/)
- [Zephyr vs Xray (SmartBear)](https://smartbear.com/blog/whats-the-difference-between-zephyr-and-xray/)
- [Testmo 2025 Year in Review](https://www.testmo.com/blog/testmo-2025-year-in-review/)
- [GitHub Issues URL pre-fill](https://github.com/sindresorhus/new-github-issue-url)
- [Jira Community pre-fill 논의](https://community.atlassian.com/forums/Jira-questions/Pre-filled-fields-upon-create-issue-for-jira-cloud/qaq-p/582022)
- 코드베이스: `src/components/EnvironmentAIInsights.tsx`, `src/lib/environmentInsights.ts`, `supabase/functions/milestone-risk-predictor/index.ts`, `supabase/functions/_shared/ai-config.ts`, `supabase/functions/create-jira-issue/index.ts`, `supabase/functions/create-github-issue/index.ts`, `src/components/FocusMode.tsx`, `src/pages/plan-detail/page.tsx`

---

## 기획 시사점
경쟁사 공백이 명확. env×TC 히트맵 AI 인사이트는 Testably가 시장 최초 포지션 가능. 기술적 선례(milestone-risk-predictor)가 명확하게 존재하므로 f001은 패턴 재사용. f002 병목은 "Create Issue 통합 컴포넌트 부재"와 "Assign Run 모달 plan-detail 내 미구현"이며, scope-in 크기 정의가 기획 핵심.

---

## f001/f002 Dev Spec 전 핵심 결정 포인트 (planner 에게 전달)

**f001 AI Insights Edge Function:**
1. **캐시 저장 위치**: `test_plans.ai_env_insights_cache JSONB` (추천) vs 별도 테이블
2. **최소 데이터 임계값**: 실행 결과 < 5개 → AI skip, rule-based만 표시
3. **AI_FEATURES 키 이름**: `environment_ai_insights` (snake_case, 기존 일관성), mode 값 `'env-ai-insights'`
4. **minTier 결정**: rule-based는 모든 플랜 무료. AI 증강은 Starter(Tier 3) 이상 추천 — `coverage_gap`과 동일 레벨
5. **"Regenerate" 버튼 UX**: 기존 `AITriggerButton` + `useAiFeature('environment_ai_insights')` 훅 연결

**f002 Chip 워크플로우:**
6. **"Create Issue" 칩 스코프**: Jira/GitHub 라우팅 + 기존 Edge Function 호출하는 경량 인라인 모달 (추천). title/body pre-fill.
7. **"Assign Run" 칩 스코프**: (c) plan-detail runs 섹션으로 스크롤 + 안내 토스트가 1차. AddRunModal 이식은 OOS.
8. **"Filter" 칩 상태 관리**: `onHighlightEnv` 콜백 prop → plan-detail `highlightedEnv` state → 히트맵 column CSS highlight.

---

## OOS 후보 리스트 (f001/f002 범위 제외)

1. Critical env threshold 자동 튜닝
2. 다중 플랜/워크스페이스 집계
3. Slack/Teams 알림 연동
4. IssueCreateModal 공유 컴포넌트화
5. AI insight 이력 히스토리 뷰
6. Priority 기반 env 가중치
7. 실시간 스트리밍 응답
8. 자동 트리거 (실행 완료 후 자동 갱신)
9. 멀티 언어 프롬프트 A/B 테스트
10. "Assign Run" 담당자 AI 추천
