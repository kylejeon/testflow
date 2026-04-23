# QA Report: f011 — AI Token Budget Monitoring Dashboard

> 검수일: 2026-04-23
> 개발지시서: `docs/specs/dev-spec-f011-ai-token-budget-dashboard.md`
> 디자인 명세: `docs/specs/design-spec-f011-ai-token-budget-dashboard.md`
> 검수 커밋: `194832e` (branch: `claude`)

---

## 1. 요약 판정: **Ship with fixes**

P0 이슈 1개 (마이그레이션 파일명 불일치), P1 이슈 2개 (upgrade tooltip 로직 오류, 403 Forbidden 전용 UI 미구현)가 있음. P0는 반드시 릴리즈 전 수정 필요. P1은 UX 결함으로 배포 전 수정 권장.

---

## 2. AC 22개 대조 테이블

| AC # | 판정 | 증거 위치 | 노트 |
|------|------|---------|------|
| AC-1 | Pass | `settings/page.tsx:358,575,1908,1929,3995` | `?tab=ai-usage` 딥링크 + 탭 union 타입 + 렌더 블록 모두 구현됨 |
| AC-2 | Pass | `AiUsagePanel.tsx:232,259,283,287` | `isOwnerSelf \|\| isOrgAdmin` 분기 + Self View fallback |
| AC-3 | Pass | `BurnRateCard.tsx:33-54`, `BurnRateCard.test.tsx:42-45` | `calcBurnRatePerDay`, `calcEstimatedDepletionDays` 단위 테스트로 검증. `(150-40)/1.8=61` 케이스 통과 |
| AC-4 | Pass | `DailyUsageChart.tsx:81-115`, `aiUsageMeta.ts:55-65` | 7 mode 색상 상수 + Recharts BarChart stackId="a" 구현됨 |
| AC-5 | Partial | `aiUsageMeta.ts:139-147`, `PeriodFilter.tsx:147-148` | **P1 버그**: `requiredTierLabelFor('90d')` = 'Starter' 반환 — Design Spec §3-1에 따르면 Free 계정의 90d tooltip은 "Upgrade to **Hobby**"여야 함 |
| AC-6 | Pass | `AiUsagePanel.tsx:111-133`, `ModeBreakdownTable.tsx` | credits DESC 정렬 + % 계산 + 호출 횟수 렌더링 |
| AC-7 | Pass | `aiUsageMeta.ts:74` | `MODE_LABEL_KEYS['run-summary']='settings.aiUsage.mode.runAnalysis'`. i18n EN/KO 양쪽 'Run Analysis'/'런 분석' |
| AC-8 | Pass | `MemberContributionTable.tsx:66-109` | avatar + full_name fallback email + credits DESC 정렬 |
| AC-9 | Pass | `AiUsagePanel.tsx:620-626` | `isTeamView` false 시 `MemberContributionTable` 렌더 블록 미실행 |
| AC-10 | Pass | `20260423_f011_ai_usage_breakdown_rpc.sql:34-91` | SECURITY DEFINER + caller_authorized CTE + 빈 결과 반환 |
| AC-11 | Partial | `useAiUsageBreakdown.ts:64` | 성능 목표(p95 < 500ms)는 런타임 측정 불가. 인덱스 + staleTime=60s 전략은 구현됨 |
| AC-12 | Pass | `BurnRateCard.tsx:77-95` | `limit < 0` 분기 → "Unlimited" + 프로그레스 바 미렌더 + Enterprise 뱃지 |
| AC-13 | Pass | `AiUsagePanel.tsx:586-610` | `isEmpty` 조건 → EmptyState + CTA onClick |
| AC-14 | Partial | `AiUsagePanel.tsx:468-488,579-585` | Error 배너 + Retry 버튼 구현됨. 차트 영역은 placeholder 대체. 단 **403 권한 오류 전용 배너 미구현** — 빈 배열 반환 시 Empty State로 처리됨 (Dev Spec §4-1 대안 흐름 2 불충족) **P1** |
| AC-15 | Pass | `en/settings.ts:60-173`, `ko/settings.ts:60-174` | 73개 키 en/ko 양쪽 존재. `scan:i18n:check` clean |
| AC-16 | Pass | `PeriodFilter.tsx:55-93,101-108`, `DailyUsageChart.tsx:77-78,120-144` | `aria-haspopup="listbox"`, Arrow/Enter/Esc/Home/End, `role="img"`, SR-only 테이블 |
| AC-17 | Pass | `aiUsageMeta.ts:55-65` | indigo/violet/sky/cyan 브랜드 팔레트. WCAG AA 범위 |
| AC-18 | Pass | `ExportCsvButton.tsx:34-53`, `AiUsagePanel.tsx:454-464` | `isTeamView && !isEmpty && !isError` 조건. CSV 컬럼 date/user_email/mode/credits |
| AC-19 | Pass | `project-detail/page.tsx:1296-1298` | 기존 "Upgrade" 링크 → "View Details" + `/settings?tab=ai-usage` URL |
| AC-20 | **FAIL** | 파일명 불일치 | **P0 버그**: Dev Spec §10이 명시한 파일명은 `20260424_f011_ai_usage_breakdown_rpc.sql`이나, 실제 파일은 `20260423_...`. 날짜 `0423` vs `0424`. |
| AC-21 | Pass | `20260423_...sql:28-31` | `CREATE INDEX IF NOT EXISTS idx_ai_generation_logs_owner_date` + partial + INCLUDE covering |
| AC-22 | Pass | `useAiUsageBreakdown.ts:84-98`, `AiUsagePanel.tsx:287` | `!isTeamView` 분기에서 `useMyAiUsage` 호출 — RLS 직접 쿼리. RPC 미호출 |

---

## 3. 발견된 이슈 리스트

### P0 — 반드시 릴리즈 전 수정

**P0-1: 마이그레이션 파일명 AC-20 위반**
- 심각도: P0 (AC 직접 위반)
- 위치: `supabase/migrations/20260423_f011_ai_usage_breakdown_rpc.sql`
- 재현: AC-20 수용 기준 `20260424_...` vs 실제 `20260423_...`
- 제안 수정: 파일명 `20260424_f011_ai_usage_breakdown_rpc.sql` 로 변경 OR Dev Spec §10 갱신

### P1 — 배포 전 수정 권장

**P1-1: `requiredTierLabelFor` upgrade tooltip 로직 오류 (AC-5 부분)**
- 심각도: P1 (UX 오해 유발)
- 위치: `src/lib/aiUsageMeta.ts:141`
- 현재:
  ```ts
  case '30d':  return 'Hobby';   // 버그: 30d는 Free가 이미 허용
  case '90d':  return 'Starter'; // 버그: 90d는 Hobby에서 해금 → 'Hobby'여야 함
  case '6m':   return 'Professional'; // 버그: 6m은 Starter에서 해금
  ```
- 정정: `'90d' → 'Hobby'`, `'6m' → 'Starter'`, `'12m' → 'Professional'`
- `aiUsageMeta.test.ts:122-127` 도 함께 수정

**P1-2: 403 Forbidden 전용 UI 미구현 (AC-14, Dev Spec §4-1)**
- 심각도: P1 (스펙 명시 UX 누락)
- 위치: `src/pages/settings/components/AiUsagePanel.tsx:468-488`
- 현재: 빈 배열 반환 시 Empty State만 표시
- 제안: RPC 빈 결과 + Member 역할 조건에서 forbidden 배너 분기 추가

### P2 — 개선 권장

**P2-1: `project-detail/page.tsx` "View Details" 하드코딩** (i18n 일관성)

**P2-2: RPC 날짜 범위 상한 제한 없음** (잠재적 성능 공격 벡터)
- 제안: `WHERE ... AND p_to - p_from <= INTERVAL '2 years'` 가드

**P2-3: `tokens_used` INCLUDE 추가 — Dev Spec 불일치** (문서 불일치, 기능 영향 없음)

**P2-4: OOS-4 프로젝트별 필터 인덱스 준비 확인됨** (OOS 경계 유지 확인)

---

## 4. 보안 리뷰 결과

| 카테고리 | 판정 | 근거 |
|---------|------|------|
| RLS 우회 위험 (SECURITY DEFINER) | Pass | `caller_authorized` CTE + `SET search_path = public` |
| 비멤버 타 project 데이터 노출 | Pass | `team_ids` CTE는 owner 소유 프로젝트의 members만 포함 |
| Member의 Team View 강제 접근 | Partial | UI에서 차단 + RPC 빈 결과. P1-2 참고 |
| Export CSV 권한 (Member 차단) | Pass | `isTeamView` 조건으로 버튼 렌더 차단 |
| sensitive 데이터 노출 (input/output_data) | Pass | RPC SELECT에서 미포함. CSV에도 미포함 |
| XSS | Pass | `dangerouslySetInnerHTML` 미사용 |
| 날짜 범위 상한 미제한 | Warn | P2-2 |
| GRANT EXECUTE 범위 | Pass | `authenticated, service_role`. anon 제외 |

---

## 5. 성능 리뷰 결과

| 항목 | 평가 | 근거 |
|-----|------|------|
| RPC p95 < 500ms | 확인 불가 (정적) | 인덱스 + partial + INCLUDE 전략 적절 |
| React Query 캐싱 | Pass | staleTime=60_000ms, gcTime=5*60_000ms (Dev Spec §9 일치) |
| 대용량 차트 렌더 | Partial | 테이블은 slice + "and N more". 차트는 90d/12m 시 virtualization 없음 (1000 point 이하 OK) |
| Self View RPC 미호출 | Pass | AC-22 준수 — `useMyAiUsage`는 RLS 직접 쿼리 |
| 대용량 쿼리 가드 | Warn | P2-2 |

---

## 6. 회귀 리스크 평가

| 변경 파일 | 리스크 | 평가 |
|---------|------|------|
| `src/pages/settings/page.tsx` | 낮음 | 기존 탭 배열 끝에 추가. 기존 탭 조건 분기 미변경 |
| `src/pages/project-detail/page.tsx` | 낮음 | 4줄 변경 (링크 텍스트/URL만) |
| i18n settings.ts 73 키 | 낮음 | 키 추가만. 번들 영향 미미 |
| 기존 `get_ai_shared_pool_usage` 와 충돌 | 없음 | 신규 RPC 완전 독립 |

---

## 7. OOS 준수 확인 (10개 모두 미구현 — 범위 준수)

| OOS 항목 | 준수 |
|---------|:---:|
| OOS-1: retention policy | ✅ |
| OOS-2: run-summary mode 분리 | ✅ |
| OOS-3: burn rate alert | ✅ |
| OOS-4: 프로젝트별 필터 | ✅ |
| OOS-5: tokens_used UI | ✅ |
| OOS-6: 시간대별 drilldown | ✅ |
| OOS-7: spending cap | ✅ |
| OOS-8: anomaly detection | ✅ |
| OOS-9: 차단/승인 워크플로우 | ✅ |
| OOS-10: Slack/Discord 리포트 | ✅ |

---

## 8. 코드 품질

- `tsc --noEmit`: PASS
- `scan:i18n:check`: PASS
- `scan:i18n:parity (en↔ko)`: PASS
- 테스트: **230/230 PASS** (기존 170 + 신규 60)
- TypeScript 타입: `AiUsageBreakdownRow`, `DailySeriesPoint`, `MemberContributionRow`, `ModeBreakdownRow` 명확 정의

---

## 9. 런칭 준비도 (2026-05-11 기준)

- **P0 차단 이슈 1개** — 배포 전 반드시 수정
- **P1 이슈 2개** — 배포 전 수정 권장
- P0/P1 수정 후 최종 **Ship** 판정

---

## 10. 권장 후속 작업

1. **P0-1**: 마이그레이션 파일명 `20260423` → `20260424` 리네임 (또는 dev-spec 갱신)
2. **P1-1**: `requiredTierLabelFor` 반환값 + 테스트 수정
3. **P1-2**: 403 Forbidden 전용 배너 추가 (빈 배열 vs 권한 실패 구분 메커니즘 설계)
4. **P2-1**: `project-detail/page.tsx` "View Details" i18n 처리
5. **P2-2**: RPC 날짜 범위 서버 레벨 가드
6. **후속 백로그**: OOS-3 burn rate alert (`#f012-ai-burn-rate-alerts`) — 5/11 이후 우선순위
