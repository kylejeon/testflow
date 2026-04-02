# Testably PM 세션 핸드오프

> **세션 ID:** funny-zealous-carson
> **작성일:** 2026-04-02
> **역할:** PM Agent — CEO 지시 기반으로 기획서/개발 지시서 작성, Dev/Desi 세션에 전달

---

## 1. 이번 세션에서 완료한 작업

### 작업 1: Dev1 개발 지시서 전송 ✅

**파일:** `pm/dev1-task-dashboard-analytics-activity-feed.md` (1,600줄)

Dashboard Analytics & Activity Feed 구현 지시서. 7개 PART로 구성:
- PART 1: DB 스키마 (activity_logs 테이블 + 트리거)
- PART 2: page.tsx 메인 레이아웃
- PART 3-4: Analytics 위젯 8개 (StatusDistribution, PassRateTrend, ExecutionVelocity, PriorityBreakdown, FlakyTests, MilestoneTracker, CoverageHeatmap, AIInsights)
- PART 5: Activity Feed 컴포넌트
- PART 6: AI Edge Function
- PART 7: TierGate + Phase 구현 계획

이전 세션에서 작성 완료, 이번 세션에서 호스트로 전송 완료.

---

### 작업 2: Dev2 개발 지시서 작성 + 전송 ✅

**파일:** `pm/dev2-task-dashboard-export-pdf-8page.md` (1,435줄)

8페이지 Executive Report PDF 구현 지시서. 12개 PART:
- PART 1: 아키텍처 (jsPDF 직접 드로잉, A4 210×297mm)
- PART 2: 공통 헬퍼 (drawHeader, drawFooter, addPage)
- PART 3: 데이터 준비 함수
- PART 4: 메인 엔트리 (handleExportPDF)
- PART 5: P1-P8 각 페이지별 jsPDF 좌표/코드 (가장 상세)
- PART 6-8: 폰트(NotoSansKR), 로고, 티어 게이팅
- PART 9-12: 색상 시스템, 체크리스트, 버그 수정, Phase 계획

---

### 작업 3: Dev2 PDF 시각적 비교 가이드 ✅

**파일:** `pm/dev2-pdf-visual-comparison-guide.html` (1,385줄)

CEO가 3번 수정해도 PDF가 목업과 다르다고 함. 텍스트 지시서 대신 **시각적 비교 HTML** 문서 작성.
- 3차 PDF(`connevo-suite-quality-report-2026-04-01.pdf`, 9페이지)를 분석
- Desi 목업(`desi/dashboard-export-pdf-mockup.html`)과 페이지별 비교
- **18개 FIX** 식별 (Critical 5, High 5, Medium 6, Low 2)

핵심 FIX 목록:
| # | 페이지 | 문제 | 심각도 |
|---|--------|------|--------|
| 1 | P1 | KPI 델타 ▲/▼ 화살표 없음 | Medium |
| 2 | P1,P8 | 페이지 수 불일치 (TOC vs 푸터) | Medium |
| 3 | P2 | Automation Rate 0% (쿼리 문제) | Low |
| 4 | P2 | Priority 막대 텍스트 겹침 | High |
| 5 | P3 | Pass Rate Trend 불규칙 지그재그 | High |
| 6 | P3 | WoW 지난주 모두 0 | Critical |
| 7 | P3 | WoW 변화 색상 반대 | High |
| 8 | P4 | 빈 Run Name | Low |
| 9 | P4 | Coverage 막대 vs Pass% 혼동 | Medium |
| 10 | P4 | 결과 없는 Run "0%" 표시 | Low |
| 11 | P5 | 1개 마일스톤만 (하위 누락) | Critical |
| 12 | P5 | 마일스톤 카드 세부정보 누락 | Critical |
| 13 | P5 | Burndown 차트 완전 누락 | Critical |
| 14 | P5 | Quality Gates 테이블 완전 누락 | Critical |
| 15 | P6 | Coverage Gaps 정의 너무 좁음 | High |
| 16 | P7 | 모든 멤버 "Unknown" | Critical |
| 17 | P7 | Defect Discovery 섹션 누락 | Medium |
| 18 | P8-9 | 푸터 전체 페이지 수 틀림 | Medium |

---

### 작업 4: Milestone Roll-up 구조 변경 기획서 ✅

**파일:** `pm/milestone-rollup-restructure.md` (1,010줄)

CEO 승인된 milestone 구조 변경. Parent = Sub의 자동 집계(Roll-up).

핵심 내용:
1. **진행률 집계** — Parent progress = 모든 sub TC + 직속 TC 합산
2. **상태 자동 결정** — 모든 sub completed → parent completed, 하나라도 past_due → parent past_due
3. **기간 자동 계산** — Parent start = min(sub.start), end = max(sub.end), date_mode auto/manual
4. **Quality Gate** — 전체 집계 기준 Pass/Fail
5. **Parent 직속 TC 허용** — Regression test 등 특정 Sprint에 속하지 않는 TC

포함 사항:
- DB Migration SQL (`date_mode` 컬럼, `fn_milestone_rollup_stats` Function, 트리거)
- TypeScript 타입 (`MilestoneWithRollup` 인터페이스)
- 재사용 유틸리티 (`src/lib/milestoneRollup.ts`) 전체 코드
- UI 변경 (목록 페이지, 상세 페이지, 편집 모달)
- Dashboard 영향 (MilestoneTracker, PDF P5, Runs/Sessions 필터)
- 엣지 케이스 7가지
- 4 Phase 구현 계획 (8일)
- 현재 코드 위치 참조 (파일명:줄번호)

---

## 2. 미완료 / 대기 중인 작업

### 2.1 Dev2: PDF 18개 FIX 실행 대기 ⏳

`dev2-pdf-visual-comparison-guide.html`을 Dev2 세션(`local_8d012bfd`)에 전달해야 함. Dev2가 18개 FIX를 코드에 적용 후 재 렌더링하여 CEO 확인 필요.

### 2.2 Milestone Roll-up 개발 지시서 미작성 ⏳

기획서(`milestone-rollup-restructure.md`)는 완료했으나, 이를 기반으로 **Dev 개발 지시서**(PART별 구체적 코드 변경 사항)는 아직 작성하지 않았음. CEO가 담당 Dev를 지정하면 작성 필요.

### 2.3 Run Detail Export 수정 (4건) ⏳

`pm-review-run-detail-export.md`에 문서화됨. Dev1 개발 지시서 미작성 (CEO 확인 대기).

### 2.4 Dashboard Export 수정 (6건) ⏳

`dev2-task-dashboard-export-fixes.md` 작성 완료, Dev2 실행 대기.

### 2.5 Lemon Squeezy 결제 연동 ⏳

`pm-plan-lemon-squeezy-integration.html` 기획 완료. CEO의 LS Dashboard 정보 입력 대기.

---

## 3. 프로젝트 기술 컨텍스트

### 아키텍처
- **프레임워크:** React + Supabase + TanStack Query
- **라우팅:** File-based routing (`src/pages/`)
- **PDF:** jsPDF 직접 드로잉 (html2canvas 미사용)
- **A4:** 210mm × 297mm, margin 20mm, contentW 170mm

### 색상 시스템 (RGB)
| 용도 | RGB |
|------|-----|
| Primary Indigo | 99, 102, 241 |
| Passed Green | 16, 163, 127 |
| Failed Red | 239, 68, 68 |
| Blocked Orange | 249, 115, 22 |
| Retest Yellow | 234, 179, 8 |
| Untested Gray | 203, 213, 225 |
| Text Dark | 15, 23, 42 |
| Text Light | 100, 116, 139 |

### 핵심 수식
- **Release Readiness Score:** `(passRate × 0.40) + (critBugResolution × 0.25) + (coverage × 0.20) + (milestoneProgress × 0.15)`
- **Quality Gates:** Pass Rate ≥90%, Critical Failures = 0, Coverage ≥80%, Blocked ≤5%
- **Flaky Score:** `(state transitions in last 10) / 9 × 100`

### Dev 세션
| 역할 | 세션 ID |
|------|---------|
| Dev1 | local_6725ced1 |
| Dev2 | local_8d012bfd |
| Desi | local_a2550f2f |

### 주요 파일 위치
| 용도 | 경로 |
|------|------|
| PM 문서 전체 | `/Users/yonghyuk/testflow/pm/` |
| Desi 목업 (PDF) | `desi/dashboard-export-pdf-mockup.html` |
| Desi 목업 (Analytics) | `desi/dashboard-analytics-activity-feed-mockup.html` |
| Milestone 타입 | `src/lib/supabase.ts:87-97` |
| Milestone 목록 | `src/pages/project-milestones/page.tsx` |
| Milestone 상세 | `src/pages/milestone-detail/page.tsx` |
| Dashboard 데이터 | `src/pages/project-detail/queryFns.ts` |
| MilestoneTracker | `src/pages/project-detail/widgets/MilestoneTracker.tsx` |
| PDF 타입 | `src/pages/project-detail/pdf/pdfTypes.ts` |
| PDF 메인 | `src/pages/project-detail/page.tsx (handleExportPDF)` |

---

## 4. pm/ 디렉토리 전체 파일 목록

```
pm/
├── 기획서 (HTML)
│   ├── pm-plan-dashboard-analytics-activity-feed.html
│   ├── pm-plan-dashboard-export-pdf-enhancement.html
│   ├── pm-plan-dashboard-export-report.html
│   ├── pm-plan-dashboard-redesign.html
│   ├── pm-plan-discovery-log-redesign.html
│   ├── pm-plan-discovery-session-ux-improvement.html
│   ├── pm-plan-focus-mode-sidebar.html
│   ├── pm-plan-get-started-checklist-improvement.html
│   ├── pm-plan-gitlab-tokens-and-documentation.html
│   ├── pm-plan-jira-auto-create-improvements.html
│   ├── pm-plan-jira-issue-workflow-improvement.html
│   ├── pm-plan-legal-pages-refund-policy.html
│   ├── pm-plan-lemon-squeezy-integration.html
│   ├── pm-plan-milestone-assignee-avatar-review.html
│   ├── pm-plan-milestone-detail-redesign.html
│   ├── pm-plan-onboarding-button-flows.html
│   ├── pm-plan-project-overview-redesign.html
│   ├── pm-plan-run-detail-more-actions.html
│   ├── pm-plan-runs-results-redesign.html
│   ├── pm-plan-settings-redesign.html
│   ├── pm-plan-status-unification.html
│   └── pm-plan-unimplemented-homepage-features.html
│
├── 분석/리뷰 (HTML/MD)
│   ├── pm-analysis-focus-mode-enhancement.html
│   ├── pm-analysis-keyboard-shortcuts.html
│   ├── pm-analysis-run-workflow-usability.html
│   ├── pm-review-dashboard-export.md
│   ├── pm-review-run-detail-export.md
│   ├── pm-docs-content-guide.html
│   ├── pm-docs-content-guide-part2.html
│   └── pm-homepage-content-audit.html
│
├── Desi 지시서 (MD)
│   ├── desi-task-dashboard-analytics-activity-feed-mockup.md
│   ├── desi-task-dashboard-export-pdf-mockup.md
│   ├── desi-task-dashboard-export-report-mockup.md
│   ├── desi-task-design-requests.md
│   └── desi-task-run-detail-more-actions-mockup.md
│
├── Dev 지시서 (MD/HTML)
│   ├── dev1-task-dashboard-analytics-activity-feed.md   ← 이번 세션
│   ├── dev1-task-session-reopen.md
│   ├── dev2-task-dashboard-export-pdf-8page.md          ← 이번 세션
│   ├── dev2-task-dashboard-export-fixes.md
│   ├── dev2-task-footer-pages-update.md
│   ├── dev2-task-jira-auto-create.md
│   ├── dev2-task-unimplemented-features.md
│   └── dev2-pdf-visual-comparison-guide.html            ← 이번 세션
│
├── 구조 변경 기획 (MD)
│   └── milestone-rollup-restructure.md                  ← 이번 세션
│
├── AI Assist 기획 (HTML)
│   └── pm-plan-ai-assist-workflow.html
│   └── pm-plan-ai-generate-modal-improvements.html
│
└── SESSION-HANDOFF.md                                   ← 이 파일
```

---

## 5. 다음 세션에서 이어갈 작업 (우선순위순)

1. **Dev2에게 PDF 시각적 비교 가이드 전달** → `dev2-pdf-visual-comparison-guide.html` 파일을 Dev2 세션에 공유하고 18개 FIX 실행 지시
2. **Milestone Roll-up Dev 지시서 작성** → `milestone-rollup-restructure.md` 기획서를 기반으로 담당 Dev(미정)에게 구체적 PART별 코드 변경 지시서 작성
3. **CEO 확인 대기 항목 follow-up** → Run Detail Export 4건, Lemon Squeezy LS Dashboard 정보
4. **Dev2 Dashboard Export Fixes 6건 실행 확인** → `dev2-task-dashboard-export-fixes.md` 진행 상태 체크
