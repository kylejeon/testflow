# Testably — Product Requirements Document (PRD)

> **버전:** 1.0  
> **작성일:** 2026-04-17  
> **작성자:** PM  
> **대상:** CEO, 투자자, 개발팀, 디자인팀

---

## 목차

1. [제품 비전](#1-제품-비전)
2. [타겟 사용자](#2-타겟-사용자)
3. [핵심 가치 제안](#3-핵심-가치-제안)
4. [제품 원칙](#4-제품-원칙)
5. [핵심 기능](#5-핵심-기능)
6. [AI 전략](#6-ai-전략)
7. [가격 전략](#7-가격-전략)
8. [경쟁 포지셔닝](#8-경쟁-포지셔닝)
9. [현재 로드맵 및 우선순위](#9-현재-로드맵-및-우선순위)
10. [성공 지표](#10-성공-지표)
11. [기술 스택](#11-기술-스택)
12. [제약 및 리스크](#12-제약-및-리스크)

---

## 1. 제품 비전

### 핵심 문제

QA 팀은 낡은 도구들로 일한다. TestRail은 2003년에 만들어졌고, Zephyr와 qTest는 지나치게 복잡하며 비용도 비싸다. 현대 스타트업과 성장하는 팀들은 다음 문제를 겪는다:

- **도구 파편화:** 테스트 케이스는 스프레드시트, 결과는 Jira 댓글, 커뮤니케이션은 Slack — 하나의 통합된 진실이 없다
- **느린 온보딩:** 기존 툴은 설정에 몇 주가 걸린다
- **AI 부재:** 테스트 케이스 작성, 분석, 리포팅이 여전히 수작업
- **불합리한 가격:** 인당(per-seat) 과금으로 팀이 커질수록 비용이 폭증

### 장기 방향

Testably는 단순한 테스트 관리 툴이 아닌 **QA 팀의 운영 시스템**이 되는 것을 목표로 한다. 테스트 케이스 작성부터 실행, 분석, CI/CD 연동, 요구사항 추적까지 — QA 라이프사이클 전체를 하나의 플랫폼에서 처리한다. AI가 반복 작업을 자동화하고, 팀이 품질에만 집중할 수 있도록 한다.

### 미션 스테이트먼트

> **"Modern QA teams deserve a tool built for speed — Testably brings your entire QA workflow together in one place."**

---

## 2. 타겟 사용자

### Primary: QA 엔지니어 / QA 리드

매일 테스트 케이스를 작성하고, 테스트 런을 관리하고, 버그를 추적하는 실무자. 빠른 실행, 키보드 중심 워크플로우, AI 보조 기능을 원한다.

### Secondary: 개발자 / 엔지니어링 매니저

CI/CD 파이프라인에 테스트 결과를 통합하거나, QA 팀의 진척도를 파악하고 싶은 사람. 팀 전체의 품질 지표를 대시보드에서 한눈에 보기를 원한다.

---

### 회사 규모별 세그먼트

| 세그먼트 | 규모 | 니즈 | 적합 플랜 |
|---------|------|-----|---------|
| 스타트업 | 1–5명 | 빠른 셋업, 무료/저비용, 기본 기능 | Free / Hobby |
| 성장 중인 스타트업 | 5–20명 | 팀 협업, Jira 연동, AI 지원 | Starter / Professional |
| 중소기업 | 20–100명 | 고급 분석, RTM, 감사 추적, RBAC | Professional / Enterprise S·M |
| 엔터프라이즈 | 100명+ | 커스텀 SLA, 전용 인프라, 컴플라이언스 | Enterprise L |

---

### 페르소나

#### 페르소나 A — Sarah, QA 엔지니어 (스타트업)
- **배경:** SaaS 스타트업의 유일한 QA, 2년차, 팀 4명
- **고통:** 스프레드시트로 테스트 케이스 관리, Jira와 수작업 동기화
- **목표:** 빠른 셋업, 직관적인 UI, AI로 테스트 케이스 자동 생성
- **플랜:** Hobby ($19/mo)

#### 페르소나 B — Jason, QA 리드 (중소기업)
- **배경:** 12명 QA팀 리드, 6년 경력, B2B SaaS
- **고통:** TestRail의 복잡한 설정과 높은 비용, 팀 워크플로우 파편화
- **목표:** 팀 퍼포먼스 추적, 마일스톤 관리, CI/CD 통합
- **플랜:** Professional ($99/mo)

#### 페르소나 C — Michael, 엔지니어링 매니저
- **배경:** 50명 엔지니어링 조직 관리, 품질 지표에 책임
- **고통:** QA 상태를 파악하기 위해 여러 툴을 전전해야 함
- **목표:** 통합 대시보드, 요구사항 추적성, 감사 추적
- **플랜:** Enterprise S ($249/mo)

---

## 3. 핵심 가치 제안

### 경쟁사 대비 차별점

| | Testably | TestRail | Zephyr Scale | qTest |
|---|---|---|---|---|
| 가격 | Flat-rate (팀 단위) | Per-seat | Per-seat | Per-seat |
| 셋업 시간 | 5분 | 수일~수주 | 수일 | 수주 |
| AI 내장 | ✅ 13가지 AI 기능 | ❌ | 제한적 | 제한적 |
| Focus Mode | ✅ 고유 기능 | ❌ | ❌ | ❌ |
| 모던 UI | ✅ | ❌ (2003년 설계) | △ | △ |
| Jira 양방향 | ✅ | ✅ | ✅ | ✅ |
| 무료 플랜 | ✅ 영구 무료 | ❌ | ❌ | ❌ |

### 3가지 핵심 Pillars

**Pillar 1 — Speed**
> 5분 만에 셋업 완료. 키보드 중심 워크플로우(Cmd+K, G-chord, Focus Mode)로 QA 생산성 극대화.

**Pillar 2 — AI-Native**
> 텍스트 한 줄로 테스트 케이스 생성. Jira 이슈에서 자동 변환. 리스크 예측, 플레이키 탐지, 커버리지 분석까지 — AI가 반복 작업을 대신한다.

**Pillar 3 — Transparent Pricing**
> 인당 과금 없음. 팀이 성장해도 가격이 폭증하지 않는다. 무료 플랜은 신용카드 없이, 만료 없이 영구 사용 가능.

---

## 4. 제품 원칙

### UX / 디자인 원칙

- **Speed First:** 모든 액션은 최소 클릭으로 완료. 키보드 단축키 우선 설계.
- **Distraction-free:** Focus Mode — 실행 중에는 불필요한 UI 제거
- **Instant Feedback:** 로딩 스테이트 최소화, 낙관적 UI 업데이트
- **Progressive Disclosure:** 고급 기능은 필요할 때 노출. 기본 UI는 단순하게.

### 개발 원칙

- **Edge Functions First:** 비즈니스 로직은 Supabase Edge Function으로 분리
- **Type-Safe:** TypeScript strict mode, 런타임 오류 최소화
- **Data Integrity:** Supabase RLS(Row Level Security)로 데이터 격리 보장
- **Observability:** Sentry 에러 추적, 헬스체크 엔드포인트 운영

### 가격 정책 원칙

- **No per-seat pricing:** 팀 규모 단위 Flat-rate
- **Free forever:** 2명 팀, 1프로젝트, 100 TC까지 영구 무료
- **Transparent:** 숨겨진 비용 없음, 플랜 비교표 공개
- **14-day free trial:** Starter 플랜에 무료 체험 제공

---

## 5. 핵심 기능

### 구현 완료 기능

#### Test Management (테스트 관리)

| 기능 | 설명 |
|-----|------|
| Test Case Management | 폴더 계층 구조, 우선순위/태그/타입/상태 필터링, 수천 개 TC 관리 |
| TC Versioning | Major/Minor 버전 관리, 버전 히스토리, 사이드바이사이드 diff 비교, 버전 복원 |
| Shared Steps Library | 재사용 가능한 스텝 라이브러리, Free=없음, Hobby=10개, Starter=20개, Pro+=무제한 |
| Bulk Operations | 다중 TC 선택, 일괄 이동/복사/삭제 |
| Import/Export | CSV 가져오기/내보내기, TestRail 임포터, JSON 백업, PDF 보고서 |

#### Test Execution (실행)

| 기능 | 설명 |
|-----|------|
| Test Run Execution | 런 생성, 팀원 배정, 실시간 결과 추적 (Pass/Fail/Blocked/Retest/Untested) |
| Focus Mode | 전체화면 집중 실행 모드, P/F/B/S 단축키, 300ms 자동 진행 |
| Exploratory Testing | 탐색적 테스트 세션, 리치 텍스트 노트, 인라인 스크린샷, 실시간 로그 캡처, TC 자동 변환 |
| Milestone Tracking | 릴리즈 마일스톤, 진척도 시각화, 기한 초과 감지 |

#### AI Features (AI 기능) — 별도 섹션 참조

#### Integration (연동)

| 기능 | 설명 |
|-----|------|
| Jira Cloud | 양방향 동기화, 실패 테스트에서 자동 이슈 생성, 필드 매핑, Free=읽기전용 |
| GitHub | 실패 테스트에서 GitHub 이슈 자동 생성 (Starter+) |
| Slack / MS Teams | 런/마일스톤 이벤트 웹훅 알림 (Starter+) |
| CI/CD Integration | REST API, 프로젝트별 토큰, GitHub Actions / GitLab CI / Jenkins 지원 (Professional+) |
| TestRail Import | 네이티브 TestRail 임포터 |

#### Reporting & Analytics (리포팅)

| 기능 | 설명 |
|-----|------|
| Dashboard | 합격률 트렌드(7일/14일/30일), 활성 런 상태, 팀 활동 히트맵, TC 개요 |
| Advanced Reporting | 4개 내장 대시보드, PDF 내보내기 |
| Run History Retention | Free=30일, Hobby=90일, Starter=1년, Pro=2년, Enterprise=무제한 |

#### Collaboration & Admin (협업/관리)

| 기능 | 설명 |
|-----|------|
| Team Collaboration | 멤버 초대, 프로젝트별 팀 배정, 활동 피드 |
| RBAC | Owner / Admin / Manager / Tester / Viewer / Guest — 6가지 역할 |
| RTM (Requirements Traceability Matrix) | 요구사항-TC 양방향 추적, 커버리지 상태, 감사 추적 (Professional+) |
| Webhooks | 커스텀 웹훅, 이벤트별 채널 설정 |
| API Tokens | REST API 접근, CI/CD 토큰 |
| Notification System | 인앱/이메일 알림, 세분화된 알림 설정 |

#### UX / Productivity

| 기능 | 설명 |
|-----|------|
| Cmd+K Command Palette | 어디서나 검색/이동/실행 |
| G-chord Shortcuts | Vim 스타일 G+키 단축키 (gt: 테스트케이스, gr: 런, gm: 마일스톤 등) |
| Keyboard Shortcuts Help | ? 키로 단축키 도움말 |
| i18n | 영어/한국어 지원 |
| Dark/Light Mode | 테마 전환 |

---

## 6. AI 전략

### AI가 제품에서 하는 역할

Testably에서 AI는 **핵심 기능(Core Feature)** 이다. 단순 보조 도구가 아니라 제품의 차별화 요소이며, 플랜별 크레딧 시스템으로 수익화된다.

### 현재 구현된 AI 기능 (13가지)

| 기능 키 | 이름 | 최소 Tier | 크레딧 비용 | 설명 |
|--------|------|---------|-----------|------|
| `tc_generation_text` | AI TC 생성 (텍스트) | Free (Tier 1) | 1 | 자연어 설명 → 구조화된 TC |
| `plan_assistant` | AI 플랜 어시스턴트 | Free (Tier 1) | 1 | 테스트 플랜 구성 제안 |
| `tc_generation_jira` | AI TC 생성 (Jira) | Hobby (Tier 2) | 1 | Jira 이슈 → TC 자동 변환 |
| `run_summary` | AI 런 요약 | Hobby (Tier 2) | 1 | 테스트 런 결과 자동 요약 |
| `requirement_suggest` | 요구사항 TC 제안 | Hobby (Tier 2) | 1 | 요구사항 기반 TC 추천 |
| `activity_summary` | AI 활동 요약 | Hobby (Tier 2) | 1 | 팀 활동 자동 요약 |
| `coverage_gap` | 커버리지 갭 분석 | Starter (Tier 3) | 1 | 테스트 커버리지 빈 영역 탐지 |
| `flaky_analysis` | 플레이키 테스트 분석 | Starter (Tier 3) | 1 | 불안정 테스트 자동 탐지 |
| `risk_predictor` | AI 리스크 예측 | Starter (Tier 3) | 2 | 릴리즈 리스크 수준 예측 |
| `burndown_insight` | AI 번다운 인사이트 | Starter (Tier 3) | 2 | 마일스톤 번다운 분석 |
| `tc_generation_session` | AI TC 생성 (세션) | Professional (Tier 4) | 1 | 탐색적 테스트 세션 → TC 변환 |
| `issues_analysis` | AI 이슈 분석 | Professional (Tier 4) | 2 | 이슈 패턴 분석 |
| `tag_heatmap_insight` | AI 태그 히트맵 | Professional (Tier 4) | 2 | 태그별 품질 분포 분석 |

### AI 크레딧 시스템

- 1 크레딧 = AI 기능 호출 1회 기본 단위
- 일부 고급 분석 기능은 2 크레딧 차감
- Enterprise (Tier 5~7): 무제한 (`-1` = infinite)
- 월 초 자동 리셋

### 향후 AI 확장 방향 (계획)

- **AI Test Plan Generator:** 요구사항 문서 → 완전한 테스트 플랜 자동 생성
- **Regression Predictor:** 코드 변경 → 영향받는 TC 자동 추천
- **Natural Language Search:** TC 라이브러리 자연어 검색
- **Auto Triage:** 실패 테스트 원인 자동 분류

---

## 7. 가격 전략

### 가격 정책 철학

- **No per-seat pricing:** 팀 규모 기반 Flat-rate, 팀이 성장해도 개인당 비용 폭증 없음
- **Value-based tiers:** 기능 단위가 아닌 팀 규모와 AI 사용량 기반
- **Free forever:** 진입 장벽 최소화, 소규모 팀 영구 무료 제공

### 플랜 구조

| 플랜 | 월 요금 | 연간 요금 | 멤버 수 | 프로젝트 | TC/프로젝트 | AI 크레딧/월 | 런/월 |
|-----|--------|---------|-------|---------|-----------|------------|------|
| **Free** | $0 | $0 | 2 | 1 | 100 | 3 | 10 |
| **Hobby** | $19 | $194 (≈$16/mo) | 5 | 3 | 200 | 15 | 무제한 |
| **Starter** | $49 | $499 (≈$42/mo) | 5 | 10 | 무제한 | 30 | 무제한 |
| **Professional** | $99 | $1,009 (≈$84/mo) | 20 | 무제한 | 무제한 | 150 | 무제한 |
| **Enterprise S** | $249 | $2,540 | 21–50 | 무제한 | 무제한 | 무제한 | 무제한 |
| **Enterprise M** | $499 | $5,090 | 51–100 | 무제한 | 무제한 | 무제한 | 무제한 |
| **Enterprise L** | 협의 | 협의 | 100+ | 무제한 | 무제한 | 무제한 | 무제한 |

### 런 히스토리 보존 기간

| 플랜 | 보존 기간 |
|-----|---------|
| Free | 30일 |
| Hobby | 90일 |
| Starter | 1년 |
| Professional | 2년 |
| Enterprise | 무제한 |

### 주요 기능별 Tier 분기점

| 기능 | 시작 Tier |
|-----|---------|
| Jira 읽기 전용 | Free |
| Jira 풀 연동 | Hobby |
| CSV 내보내기 | Hobby |
| RTM / 추적성 | Hobby |
| GitHub 연동 | Starter |
| Slack / Teams | Starter |
| Flaky Detection AI | Starter |
| Coverage Gap AI | Starter |
| CI/CD 연동 | Professional |
| Test Automation SDK | Professional |
| RBAC 12역할 | Professional |
| RTM 감사 추적 | Professional |
| Jira 양방향 자동 동기화 | Enterprise S |
| 전용 인프라 / 커스텀 SLA | Enterprise L |

---

## 8. 경쟁 포지셔닝

### 경쟁사 분석

#### TestRail
- **강점:** 가장 널리 알려진 TC 관리 툴, 풍부한 기능, 대형 커뮤니티
- **약점:** 2003년 설계 — UI/UX 노후화, 설정 복잡, Per-seat 가격, AI 미흡
- **Testably 우위:** 현대적 UI, AI-Native, Flat-rate 가격, 5분 셋업

#### Zephyr Scale (Atlassian 생태계)
- **강점:** Jira Cloud 완벽 통합, 대형 엔터프라이즈 채택
- **약점:** Jira 없이 사용 불가, 고가의 per-seat, 복잡한 설정
- **Testably 우위:** Jira 독립적 운영 가능, 가격 투명성, 빠른 온보딩

#### qTest (Tricentis)
- **강점:** 대형 엔터프라이즈 기능, 다양한 통합
- **약점:** 극도의 복잡성, 고가, 중소기업 진입 어려움
- **Testably 우위:** SMB/스타트업 최적화, 직관적 UX, AI 내장

#### PractiTest
- **강점:** 요구사항 추적, 커스터마이징
- **약점:** UI 노후화, Per-seat
- **Testably 우위:** 동등한 RTM 기능 + 모던 UX + AI

### 포지셔닝 맵

```
가격 ↑
(고가)     qTest ●              Zephyr ●
           (복잡, 엔터프라이즈)   (Jira 종속)

                        TestRail ●
                        (널리 알려짐, 노후)
(저가)  PractiTest ●
                              ★ Testably
                        (모던, AI-Native, Flat-rate)

         전통적 UI ←——————————→ 현대적 UI
```

**Testably의 포지션:** 저비용 + 현대적 UI + AI-Native — 이 조합을 제공하는 유일한 경쟁자

---

## 9. 현재 로드맵 및 우선순위

### 현재 진행 중인 주요 이니셔티브

| 이니셔티브 | 상태 | 비즈니스 임팩트 |
|---------|------|-------------|
| Test Plans & Milestones 고도화 | 진행 중 | Professional 플랜 전환율 향상 |
| Plan Detail 리디자인 (mockup_2 기반) | 진행 중 | UX 품질 개선, 유지율 향상 |
| Product Hunt 런칭 준비 | 계획 | 신규 유저 획득, 브랜드 인지도 |

### 단기 (1~3개월)

| 항목 | 우선순위 | 임팩트 |
|-----|---------|-------|
| Product Hunt 런칭 | P0 | MAU 폭발적 증가 기회 |
| Plan Detail / Milestone 리디자인 완성 | P0 | 핵심 유저 기능 완성도 |
| AI 기능 온보딩 개선 (사용 유도) | P1 | AI 크레딧 사용률 → Conversion 향상 |
| 공개 Roadmap / Changelog 콘텐츠 업데이트 | P1 | 신뢰도, SEO |
| Lemon Squeezy 결제 통합 완성 | P1 | 결제 옵션 확장 |

### 중기 (3~6개월)

| 항목 | 우선순위 | 임팩트 |
|-----|---------|-------|
| Test Automation SDK 안정화 (@testably.kr/playwright-reporter) | P1 | Professional 플랜 채택, 기술 사용자 진입 |
| RTM 감사 추적 UI 개선 | P1 | Enterprise 전환 |
| GitHub 연동 강화 (PR 기반 트리거) | P2 | 개발자 채널 확장 |
| 고급 대시보드 리포팅 | P2 | 매니저/리드 페르소나 만족도 |
| 다국어 확장 (일본어, 스페인어 등) | P3 | 글로벌 시장 진출 |

### 장기 (6~12개월)

| 항목 | 우선순위 | 임팩트 |
|-----|---------|-------|
| AI Regression Predictor | P2 | AI 전략 심화, 프리미엄 차별화 |
| Enterprise SSO / SAML | P2 | Enterprise L 채택 |
| 자동화 테스트 분석 (Flaky 심화) | P2 | Automation-heavy 팀 Lock-in |
| API 공개 문서화 / Developer Hub | P3 | 생태계 확장 |
| 파트너십 / 리셀러 프로그램 | P3 | 간접 채널 수익 |

---

## 10. 성공 지표

### North Star Metric

> **Weekly Active Test Runs (주간 활성 테스트 런 수)**

진짜로 QA 워크플로우를 사용 중인 팀의 수를 나타내는 지표. 가입자 수나 MAU보다 제품의 핵심 가치 전달을 정확히 측정.

### 핵심 KPI

| 지표 | 정의 | 목표 |
|-----|------|------|
| MAU | 월간 활성 사용자 (1회 이상 런 실행) | 분기별 30% 성장 |
| Free → Paid Conversion | 무료 → 유료 전환율 | >5% |
| Trial → Paid Conversion | 14일 트라이얼 → 유료 전환율 | >25% |
| Monthly Retention (MRR) | 구독 유지율 | >90% |
| AI Feature Adoption | AI 기능 사용 유저 비율 | >40% (유료 플랜) |
| NPS | 순추천고객지수 | >40 |
| ARPU | 유저당 평균 수익 | 지속적 증가 |
| Time-to-First-Run | 가입 → 첫 테스트 런 실행 시간 | <5분 |

### OKR 예시 (Q2 2026)

**Objective:** Product Hunt 런칭을 통한 초기 성장 기반 확보

- **KR1:** Product Hunt Day 1 Top 5 달성
- **KR2:** 런칭 후 30일 내 신규 가입 +500명
- **KR3:** Trial → Paid Conversion 20% 달성

**Objective:** AI 기능이 제품 차별화 요소로 자리잡기

- **KR1:** 유료 유저의 AI 기능 주간 사용률 35% 이상
- **KR2:** AI 기능으로 생성된 TC 수 월 1,000개 이상
- **KR3:** AI 관련 NPS 점수 상위 25% 위치

---

## 11. 기술 스택

### Frontend

| 기술 | 버전 | 역할 |
|-----|------|------|
| React | 19.x | UI 프레임워크 |
| TypeScript | 5.x | 타입 안전성 |
| Vite | 6.x | 빌드 툴, 번들러 |
| Tailwind CSS | 4.x | 스타일링 |
| TanStack Query | 5.x | 서버 상태 관리 |
| TanStack Virtual | 3.x | 가상 스크롤 (대용량 TC 목록) |
| React Router | 7.x | 클라이언트 사이드 라우팅 |
| Tiptap | 2.x | 리치 텍스트 에디터 |
| Recharts | 3.x | 데이터 시각화 |
| i18next | 25.x | 국제화 (영어/한국어) |
| Sentry | 10.x | 에러 모니터링 |

### Backend / 인프라

| 기술 | 역할 |
|-----|------|
| Supabase (PostgreSQL) | 메인 DB, Auth, RLS, Realtime |
| Supabase Edge Functions | 서버리스 비즈니스 로직 (Deno, 33개 함수) |
| Paddle | 메인 결제 처리 |
| Lemon Squeezy | 보조 결제 처리 (통합 진행 중) |
| Loops.so | 이메일 마케팅, 이벤트 추적 |
| Firebase | 인증 보조 |

### 외부 AI

| 기술 | 역할 |
|-----|------|
| OpenAI / Anthropic (추정) | TC 생성, 분석, 인사이트 AI 백엔드 |

### 테스팅 / 개발 도구

| 기술 | 역할 |
|-----|------|
| Playwright | E2E 테스트 |
| ESLint | 코드 품질 |
| Vite Plugin Sentry | 소스맵 업로드 |

### 자사 SDK (계획/진행)

| 패키지 | 역할 |
|-------|------|
| `@testably.kr/playwright-reporter` | Playwright → Testably 결과 자동 업로드 |

---

## 12. 제약 및 리스크

### 기술적 제약

| 제약 | 내용 |
|-----|------|
| Supabase Lock-in | 모든 백엔드가 Supabase 의존 — 마이그레이션 비용 高 |
| Edge Function 제한 | Deno 런타임, 실행 시간 제한, Cold Start 지연 가능 |
| AI 비용 | 사용량 증가 시 OpenAI/Anthropic API 비용 급증 리스크 |
| 데이터 규모 | 대형 엔터프라이즈 고객의 수십만 TC 처리 시 성능 최적화 필요 |

### 시장 리스크

| 리스크 | 내용 |
|-------|------|
| 경쟁사 AI 강화 | TestRail, Zephyr 등 기존 강자의 AI 기능 추가로 차별점 축소 |
| Atlassian 생태계 | Zephyr의 Jira 종속 팀은 이탈이 어려움 |
| SMB 이탈률 | 소규모 팀은 예산 감소 시 즉시 해지 — Churn 리스크 |
| 가격 경쟁 | AI 기능이 상품화되면 가격 경쟁 심화 가능 |

### 운영 리스크

| 리스크 | 내용 |
|-------|------|
| 소규모 팀 | 제품 개발, 마케팅, 지원을 소수 인원이 담당 — 우선순위 집중 필요 |
| Product Hunt 의존 | 런칭 전략이 PH에 집중 — 실패 시 초기 성장 타격 |
| 결제 플랫폼 | Paddle/Lemon Squeezy 이중 운영 복잡성, 불일치 리스크 |
| AI 규제 | EU AI Act 등 AI 콘텐츠 생성 규제 강화 가능 |

---

*이 문서는 현재 코드베이스 및 구현 상태를 기반으로 작성되었습니다. "구현 완료"로 표시된 기능은 코드에 실제로 존재하는 것만 포함합니다. "계획" 또는 "진행 중"으로 표시된 항목은 별도로 명시하였습니다.*

*최종 업데이트: 2026-04-17*
