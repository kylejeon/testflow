# Testably — Architecture Document

> **목적:** 이 문서 하나만 읽고 Testably 프로젝트 구조를 파악하고 개발을 시작할 수 있도록 작성된 AI/개발자 온보딩 레퍼런스.
> 
> **작성 기준:** 실제 코드베이스 탐색 결과 기반 (2026-04-17)

---

## 1. 프로젝트 개요

**Testably**는 QA 팀을 위한 테스트 케이스 관리 SaaS다.

### 주요 기능
- 테스트 케이스 작성·관리 (폴더, 태그, 우선순위, 커스텀 ID, 버전 관리)
- 테스트 런 실행 및 결과 기록
- 탐색적 테스팅 세션 (Discovery Logs)
- 마일스톤 관리 및 진행률 롤업
- 요구사항 추적성 매트릭스 (RTM — Requirements Traceability Matrix)
- 공유 테스트 스텝 라이브러리 (Shared Steps)
- 테스트 플랜 관리
- AI 테스트 케이스 자동 생성 (텍스트/Jira/세션 기반)
- Jira / GitHub 연동
- CI/CD API 연동 (JUnit XML / JSON)
- 팀 멤버 관리 (역할 기반 접근 제어)
- 다국어 지원 (한국어/영어)
- 구독 결제 (Paddle / Lemon Squeezy)

### 타겟 사용자
소규모~중규모 QA 팀, 개발팀 내 QA 엔지니어

---

## 2. 기술 스택

### Frontend
| 항목 | 버전 / 내용 |
|------|------------|
| Framework | React 19.1.0 |
| Build Tool | Vite 7.0.3 (SWC 트랜스파일러: `@vitejs/plugin-react-swc`) |
| Language | TypeScript 5.8.3 (strict mode, ES2022 target) |
| Routing | React Router DOM 7.6.3 (클라이언트 사이드, lazy loading) |
| 서버 상태 관리 | TanStack Query (React Query) 5.95.2 |
| 스타일링 | Tailwind CSS 3.4.17 (커스텀 color: `brand`=Indigo, `accent`=Violet) |
| 리치 텍스트 | TipTap 2.10.5 (이미지, 정렬, 밑줄 확장) |
| 차트 | Recharts 3.2.0 |
| 가상 스크롤 | @tanstack/react-virtual 3.13.23 |
| i18n | i18next 25.4.1 + react-i18next (EN/KO) |
| 에러 트래킹 | Sentry (@sentry/react 10.47.0) |
| 엑셀 내보내기 | ExcelJS 4.4.0 |
| PDF 생성 | jsPDF 4.2.1 + html-to-image |
| 자동 임포트 | unplugin-auto-import (React hooks, router, i18n 자동 import) |
| 아이콘 | Remix Icon (`ri-*`) |
| 개발 서버 | port 3000 (`npm run dev`) |

### Backend (Supabase)
| 항목 | 내용 |
|------|------|
| BaaS | Supabase (`@supabase/supabase-js` 2.57.4) |
| 데이터베이스 | PostgreSQL (Supabase 관리) |
| 인증 | Supabase Auth (이메일/패스워드) |
| Edge Functions | Deno 런타임, 30개 함수 배포 |
| AI | Anthropic Claude API (`claude-sonnet-4-*` 모델) |

### 결제
| 항목 | 내용 |
|------|------|
| Paddle | 레거시 결제 (`@paddle/paddle-js` 1.6.2) |
| Lemon Squeezy | 신규 결제 (embedded checkout) |
| 라우팅 | `profiles.payment_provider` 필드로 분기 |

### 인프라
| 항목 | 내용 |
|------|------|
| 배포 | Vercel (Git push → 자동 빌드/배포) |
| 환경 변수 | Vercel 대시보드 + Supabase Secrets |
| 에러 모니터링 | Sentry (sourcemap 자동 업로드) |
| 업타임 모니터링 | BetterStack (heartbeat URL) |
| 이메일 | Loops.so (트랜잭션 이메일 + 마케팅 자동화) |
| E2E 테스트 | Playwright |

---

## 3. 디렉토리 구조

```
testflow/
├── src/
│   ├── App.tsx                    # 루트 컴포넌트 (auth, onboarding, 전역 UI)
│   ├── main.tsx                   # Vite 엔트리 (Sentry 초기화)
│   ├── index.css                  # 전역 스타일
│   │
│   ├── pages/                     # 라우트 기반 페이지 (React Router)
│   │   ├── home/                  # 마케팅 랜딩페이지
│   │   ├── auth/                  # 로그인/회원가입/비밀번호 재설정
│   │   ├── projects/              # 프로젝트 목록
│   │   ├── project-detail/        # 프로젝트 대시보드
│   │   ├── project-testcases/     # 테스트 케이스 관리
│   │   ├── project-runs/          # 테스트 런 목록
│   │   ├── project-sessions/      # 탐색적 세션 → discovery-logs로 redirect
│   │   ├── project-documentation/ # 프로젝트 문서
│   │   ├── project-milestones/    # 마일스톤 목록
│   │   ├── project-requirements/  # RTM 요구사항 관리
│   │   ├── project-traceability/  # RTM 매트릭스 시각화
│   │   ├── project-shared-steps/  # 공유 테스트 스텝 라이브러리
│   │   ├── project-integrations/  # Jira/GitHub 연동
│   │   ├── project-plans/         # 테스트 플랜 (신규 기능)
│   │   ├── run-detail/            # 테스트 런 실행/결과
│   │   ├── session-detail/        # 탐색적 세션 상세
│   │   ├── milestone-detail/      # 마일스톤 상세
│   │   ├── testcases/             # 전체 테스트 케이스 뷰
│   │   ├── settings/              # 사용자/조직 설정
│   │   ├── admin/                 # 슈퍼어드민 대시보드
│   │   ├── stats/                 # 분석 페이지
│   │   │   ├── TestCasesOverviewPage
│   │   │   ├── ActiveRunsPage
│   │   │   ├── PassRateReportPage
│   │   │   └── TeamActivityPage
│   │   ├── docs/                  # 사용자 문서 (마케팅)
│   │   ├── pricing/               # 요금제 페이지
│   │   ├── compare/, features/, blog/, changelog/, roadmap/
│   │   ├── about/, contact/
│   │   ├── privacy/, terms/, cookies/, refund/
│   │   └── accept-invitation/     # 초대 수락 플로우
│   │
│   ├── components/                # 재사용 컴포넌트
│   │   ├── DetailPanel.tsx        # 슬라이딩 상세 패널 (62KB, 대형)
│   │   ├── FocusMode.tsx          # 전체화면 상세 뷰 (89KB, 대형)
│   │   ├── CommandPalette.tsx     # Cmd+K 전역 검색/내비게이션
│   │   ├── StepEditor.tsx         # 테스트 스텝 편집기
│   │   ├── BulkActionBar.tsx      # 다중 선택 액션 바
│   │   ├── ExportModal.tsx        # PDF/Excel 내보내기
│   │   ├── VirtualList.tsx        # 가상 스크롤 래퍼
│   │   ├── SaveIndicator.tsx      # 미저장 변경사항 표시
│   │   ├── Toast.tsx              # 토스트 알림
│   │   ├── marketing/             # MarketingHeader, Footer, CTA
│   │   ├── onboarding/            # WelcomeScreen, OnboardingChecklist
│   │   ├── feature/               # NotificationBell
│   │   └── illustrations/         # SVG 일러스트
│   │
│   ├── hooks/                     # 커스텀 훅 (비즈니스 로직 집중)
│   ├── lib/                       # 유틸리티 라이브러리
│   ├── types/                     # TypeScript 타입 정의
│   ├── utils/                     # 유틸 함수 (Excel import, TestRail export)
│   ├── router/                    # 라우터 설정
│   │   ├── config.tsx             # 라우트 정의 (lazy load + retry)
│   │   └── index.tsx              # 라우트 렌더러
│   ├── i18n/                      # 번역 파일
│   │   └── local/
│   │       ├── en/                # 영어 (common, projects, testcases, runs, etc.)
│   │       └── ko/                # 한국어 (동일 구조)
│   ├── data/                      # 정적 데이터 (경쟁사 비교 등)
│   └── assets/                    # 폰트 등 정적 에셋
│
├── supabase/
│   ├── functions/                 # Edge Functions (30개)
│   │   ├── _shared/
│   │   │   ├── ai-config.ts       # AI 기능 설정 (프론트엔드 미러)
│   │   │   └── rate-limit.ts      # 토큰 버킷 레이트 리밋
│   │   └── [function-name]/
│   │       ├── index.ts           # 함수 본체 (Deno)
│   │       └── config.toml        # verify_jwt 설정
│   └── migrations/                # DB 마이그레이션 (53개 파일)
│
├── e2e/                           # Playwright E2E 테스트
├── docs/                          # 내부 문서
├── public/                        # 정적 에셋
├── vite.config.ts                 # Vite 빌드 설정
├── tailwind.config.ts             # Tailwind 설정
├── tsconfig.json / tsconfig.app.json
├── playwright.config.ts
├── package.json
├── .env.example                   # 환경 변수 템플릿
└── CLAUDE.md                      # AI 개발 지침
```

---

## 4. 주요 아키텍처 패턴

### 데이터 플로우

```
브라우저 (React)
    │
    ├─ supabase.from('table').select() ──→ PostgreSQL (RLS 적용)
    │
    └─ supabase.functions.invoke('fn') ──→ Edge Function (Deno)
                                                │
                                                ├─ SERVICE_ROLE_KEY로 DB 접근 (RLS 우회)
                                                ├─ Anthropic API (AI 기능)
                                                ├─ Jira API / GitHub API
                                                ├─ Paddle API / Lemon Squeezy API
                                                └─ Loops.so API (이메일)
```

### API 호출 패턴

**직접 Supabase 쿼리 (클라이언트):**
```typescript
// src/lib/supabase.ts의 supabase 클라이언트 사용
const { data, error } = await supabase
  .from('test_cases')
  .select('*')
  .eq('project_id', projectId);
```

**Edge Function 호출:**
```typescript
const { data, error } = await supabase.functions.invoke('generate-testcases', {
  body: { project_id, mode: 'text', input_text },
});
```

### TanStack Query 패턴

모든 서버 데이터는 TanStack Query를 통해 관리:

```typescript
// 쿼리 키 컨벤션
['projects']
['project', projectId, 'testcases']
['project', projectId, 'runs']
['shared-steps', projectId]
['requirements', projectId]

// 설정 (src/lib/queryClient.ts)
staleTime: 60_000       // 60초 동안 fresh
gcTime: 300_000         // 5분 동안 캐시 유지
retry: 1                // 실패 시 1회 재시도
refetchOnWindowFocus: false
```

### 라우팅 구조

- React Router v7, 모든 페이지 **lazy load** (`React.lazy`)
- `lazyWithRetry()` 래퍼: 청크 로드 실패 시 200ms 후 1회 재시도 (Vercel 재배포 후 stale chunk 대응)
- `/projects/:id/sessions` → `/projects/:id/discovery-logs` redirect 적용

### 인증 플로우

```
1. 앱 시작 → supabase.auth.getSession()
2. 유효한 세션 → Sentry user context 설정, 앱 렌더링
3. 토큰 만료 → autoRefreshToken이 자동 갱신
4. Refresh Token 실패 → clearSupabaseTokens() + 강제 로그아웃
5. SIGNED_OUT 이벤트 → localStorage의 sb-* 키 전체 삭제
```

세션은 localStorage에 저장(`sb-[projectId]-auth-token` 형태).

### 상태 관리 패턴

**전역 상태 라이브러리 없음** (Redux, Zustand 미사용).

| 상태 종류 | 방법 |
|----------|------|
| 서버 데이터 | TanStack Query |
| UI 상태 | `useState` (컴포넌트 로컬) |
| 사용자 환경설정 | `localStorage` |
| 크로스 컴포넌트 이벤트 | 커스텀 DOM 이벤트 (`onboarding:step-marked`, `open-shortcuts`) |
| 전역 알림 | ToastProvider (컨텍스트) |

---

## 5. 주요 도메인 모델

### 엔티티 관계

```
organizations
    │
    ├── organization_members (role: owner/admin/manager/tester/viewer/guest)
    │       └── profiles (auth.users 1:1)
    │
    └── projects
            ├── project_members (role_override 가능)
            ├── test_cases
            │       ├── test_results (run별 결과)
            │       ├── shared_step_refs (공유 스텝 참조)
            │       └── requirement_tc_links (RTM 연결)
            ├── test_runs
            │       └── test_results
            ├── milestones (parent_milestone_id로 계층 구조)
            ├── requirements (parent_id로 계층 구조)
            │       └── requirement_tc_links
            ├── shared_steps
            │       └── shared_step_versions (버전 히스토리)
            ├── sessions (탐색적 테스팅)
            │       └── session_logs
            ├── documents
            ├── activity_logs (자동 트리거)
            ├── notifications
            ├── jira_settings / github_settings
            └── webhooks
```

### 핵심 테이블 컬럼

**profiles**
```sql
user_id UUID PK (→ auth.users)
email, full_name
avatar_emoji, avatar_url
subscription_tier INT (1-7)
payment_provider TEXT ('paddle' | 'lemon')
ai_credits_used INT (월별 리셋)
trial_end_date TIMESTAMPTZ
```

**test_cases**
```sql
id UUID PK
project_id UUID
custom_id TEXT (TC-001 형식, 자동 생성)
title TEXT
description TEXT
priority TEXT ('critical' | 'high' | 'medium' | 'low')
status TEXT ('passed' | 'failed' | 'pending')
lifecycle_status TEXT ('draft' | 'active' | 'deprecated')
is_automated BOOLEAN
folder TEXT
assignee TEXT (user_id)
steps JSONB -- [{step, expectedResult} | SharedStepRef]
version_major INT, version_minor INT
version_status TEXT ('draft' | 'published')
```

**test_runs**
```sql
id UUID PK
project_id UUID
name TEXT
status TEXT ('pending' | 'active' | 'completed' | 'failed')
progress INT (0-100)
description TEXT
ai_summary TEXT (AI 자동 생성 요약)
executed_at TIMESTAMPTZ
```

**test_results**
```sql
id UUID PK
run_id UUID
test_case_id UUID
status TEXT ('passed' | 'failed' | 'blocked' | 'retest' | 'untested')
note TEXT
elapsed INT (ms)
step_statuses JSONB
attachments JSONB
```

**shared_steps**
```sql
id UUID PK
project_id UUID
custom_id TEXT (SS-001 형식, 자동 생성)
name TEXT
description TEXT
category TEXT
tags TEXT[]
steps JSONB
version INT
usage_count INT (트리거로 자동 갱신)
```

**requirements**
```sql
id UUID PK
project_id UUID
custom_id TEXT (REQ-001 형식)
title, description TEXT
priority TEXT ('P1' | 'P2' | 'P3' | 'P4')
category, status TEXT
parent_id UUID (계층 구조)
source TEXT ('manual' | 'jira' | 'csv')
external_id, external_url TEXT (Jira 연동)
```

**milestones**
```sql
id UUID PK
project_id UUID
name TEXT
status TEXT ('upcoming' | 'started' | 'past_due' | 'completed')
start_date, end_date DATE
progress INT
parent_milestone_id UUID (계층 구조)
date_mode TEXT ('auto' | 'manual')
```

---

## 6. Edge Functions

### 전체 목록 (30개)

| 함수명 | 역할 | verify_jwt |
|--------|------|-----------|
| `generate-testcases` | AI 테스트 케이스 생성 (text/jira/session 모드) | false |
| `plan-assistant` | AI 테스트 플랜 어시스턴트 | false |
| `upload-ci-results` | CI/CD 테스트 결과 업로드 (JSON/JUnit XML) | false |
| `import-testrail` | TestRail 마이그레이션 | false |
| `create-jira-issue` | Jira 이슈 생성 | false |
| `create-github-issue` | GitHub 이슈 생성 | false |
| `fetch-jira-fields` | Jira 필드 스키마 조회 | false (내부 수동 인증) |
| `fetch-jira-requirements` | Jira → 요구사항 동기화 | false |
| `fetch-github-issues` | GitHub 이슈 동기화 | false |
| `test-jira-connection` | Jira 연결 확인 | false |
| `sync-jira-status` | Jira 양방향 상태 동기화 | false |
| `jira-webhook-handler` | Jira inbound 웹훅 처리 | false |
| `send-webhook` | 외부 웹훅 발송 | false |
| `paddle-webhook` | Paddle 결제 웹훅 | false |
| `lemon-webhook` | Lemon Squeezy 결제 웹훅 | false |
| `fetch-paddle-invoices` | Paddle 인보이스 조회 | false |
| `start-trial` | 트라이얼 활성화 | **true** |
| `trial-expire-handler` | 트라이얼 만료 처리 (cron) | false |
| `trial-ending-reminder` | 트라이얼 종료 D-7 이메일 (cron) | false |
| `check-subscriptions` | 구독 상태 확인 (cron) | false |
| `check-milestone-past-due` | 마일스톤 기한 초과 처리 (cron) | false |
| `send-invitation` | 팀 초대 이메일 발송 | false |
| `accept-invitation` | 초대 수락 처리 | false |
| `send-notification` | 인앱 알림 생성 | false |
| `send-loops-event` | Loops 이벤트 트래킹 | false |
| `send-digest` | 일/주별 이메일 다이제스트 (cron) | false |
| `sync-loops-contacts` | Loops 연락처 동기화 (cron) | false |
| `log-consent` | 개인정보 동의 로그 저장 | false |
| `delete-account` | GDPR 계정 삭제 | false |
| `health` | 업타임 헬스체크 (Supabase/Paddle/Loops) | false |

### verify_jwt 설정 규칙

```
verify_jwt = false를 쓰는 경우:
  1. 외부 서비스 웹훅 (paddle-webhook, lemon-webhook, jira-webhook-handler)
     → Supabase JWT가 아닌 웹훅 서명으로 인증
  2. Cron 스케줄 (trial-expire-handler, check-subscriptions 등)
     → pg_cron이 호출, 사용자 JWT 없음
  3. 비인증 상태 호출 (log-consent)
     → 회원가입 전 anon 세션에서 호출
  4. CI/CD API (upload-ci-results)
     → Bearer CI Token으로 인증 (Supabase JWT 아님)
  5. JWT 수동 검증 함수 (create-jira-issue 등)
     → Authorization 헤더에서 JWT 추출 후 auth.getUser(token)으로 직접 검증

verify_jwt = true를 쓰는 경우:
  - start-trial (현재 유일)
  → Supabase가 JWT를 자동 검증, 함수 내 수동 검증 불필요
  → 인증된 사용자만 호출 가능함이 보장되어야 할 때 사용

⚠️ 주의: verify_jwt = false라도 내부에서 반드시 자체 인증 로직을 구현해야 함
   (웹훅은 시크릿 검증, 일반 함수는 JWT 수동 파싱 또는 service_role key 사용)
```

### 배포 명령어

```bash
# 개별 함수 배포
supabase functions deploy generate-testcases
supabase functions deploy plan-assistant

# 여러 함수 한 번에
supabase functions deploy generate-testcases plan-assistant create-jira-issue

# 비밀 값 설정 (환경 변수 → Supabase Secrets)
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
supabase secrets set LOOPS_API_KEY=...
```

> **중요:** Edge Function 코드 수정 후 반드시 재배포 필요. 로컬 변경사항은 자동으로 반영되지 않음.

### Shared Modules (`supabase/functions/_shared/`)

- **`ai-config.ts`**: AI 기능 설정 (프론트엔드의 `useAiFeature.ts`와 동일 데이터, 항상 같이 업데이트)
  - `AI_FEATURES`: 12개 기능별 `minTier`, `creditCost`
  - `PLAN_LIMITS`: 티어별 월 크레딧 한도 `{1: 3, 2: 15, 3: 30, 4: 150, 5-7: -1(무제한)}`
- **`rate-limit.ts`**: 토큰 버킷 알고리즘 레이트 리미터 (DB 기반)

---

## 7. 구독 플랜 및 RBAC

### 구독 티어

| Tier | 이름 | AI 크레딧/월 | 최대 멤버 |
|------|------|------------|--------|
| 1 | Free | 3 | 2 |
| 2 | Hobby | 15 | 5 |
| 3 | Starter | 30 | 5 |
| 4 | Professional | 150 | 20 |
| 5 | Enterprise S | 무제한 | 50 |
| 6 | Enterprise M | 무제한 | 100 |
| 7 | Enterprise L | 무제한 | ∞ |

Starter(3)에서는 `tester` 역할이 UI에서 "Member"로 표시됨.

### 역할 계층

```
owner (6) > admin (5) > manager (4) > tester (3) > viewer (2) > guest (1)
```

역할별 가용 범위 (`src/lib/rbac.ts`의 `getAvailableRoles()`):
- Free/Hobby (≤2): owner, admin
- Starter (3): owner, admin, tester
- Professional+ (≥4): 전체 6가지

조직 레벨 역할 + `project_members.role_override`로 프로젝트별 역할 상승 가능 (Professional+).

---

## 8. 개발 워크플로우

### 브랜치 전략

- **`claude` 브랜치**: AI(Claude Code)가 작업하는 기본 브랜치
- **`main` 브랜치**: 사용자가 직접 머지. AI가 main에 직접 push/merge 금지
- `claude` 브랜치에서 commit & push → 사용자가 PR/머지 처리

### 로컬 개발 환경 설정

```bash
# 1. 의존성 설치
npm install

# 2. 환경 변수 설정
cp .env.example .env
# .env에 Supabase URL, Anon Key, Anthropic API Key 등 입력

# 3. 개발 서버 실행 (port 3000)
npm run dev
```

### 주요 npm 스크립트

```bash
npm run dev          # Vite 개발 서버 (HMR 포함)
npm run build        # 프로덕션 빌드 → dist/
npm run preview      # 빌드 결과물 미리보기
npm run test:smoke   # Playwright smoke 테스트
```

### 환경 변수 (`.env.example` 기준)

```bash
# Supabase (필수)
VITE_PUBLIC_SUPABASE_URL=https://[project-ref].supabase.co
VITE_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...

# AI (Edge Function용 Supabase Secret으로 설정)
ANTHROPIC_API_KEY=sk-ant-...

# 결제
VITE_PADDLE_CLIENT_TOKEN=live_...
PADDLE_API_KEY=...
VITE_LEMON_STORE_ID=332034

# 모니터링
VITE_SENTRY_DSN=https://...@sentry.io/...
SENTRY_AUTH_TOKEN=...  # CI 빌드에서만 사용 (소스맵 업로드)

# 이메일 (Loops - Supabase Secret으로 설정)
LOOPS_API_KEY=...
LOOPS_TEMPLATE_WELCOME=...  # 각 이메일 템플릿 ID

# E2E 테스트
SMOKE_TEST_EMAIL=...
SMOKE_TEST_PASSWORD=...
SMOKE_PROJECT_ID=...
SMOKE_BASE_URL=https://testably.app
```

### 테스트

```bash
# Playwright E2E smoke 테스트
npm run test:smoke

# 전용 테스트 계정 사용 (SMOKE_TEST_EMAIL, SMOKE_TEST_PASSWORD)
# SMOKE_PROJECT_ID: 테스트용 프로젝트 UUID
```

---

## 9. 주요 라이브러리 파일 (`src/lib/`)

| 파일 | 역할 |
|------|------|
| `supabase.ts` | Supabase 클라이언트 + 핵심 타입 (Project, TestCase, Milestone, TestRun) |
| `rbac.ts` | TIER/ROLE 상수, 권한 헬퍼 함수 |
| `payment.ts` | 결제 프로바이더 라우팅 (Paddle/Lemon 분기) |
| `paddle.ts` | Paddle SDK 초기화, 체크아웃 모달 |
| `lemon.ts` | Lemon Squeezy 체크아웃 리다이렉트 |
| `sentry.ts` | Sentry 초기화 (환경별 설정, 노이즈 필터링) |
| `loops.ts` | Loops.so 이벤트 트래킹 래퍼 |
| `queryClient.ts` | TanStack Query 글로벌 설정 |
| `expandSharedSteps.ts` | SharedStepRef를 실제 스텝으로 flatten |
| `milestoneRollup.ts` | 부모 마일스톤 롤업 계산 |
| `onboardingMarker.ts` | 온보딩 단계 완료 마킹 |
| `consentLog.ts` | 개인정보 동의 로그 |
| `policyVersion.ts` | TOS/Privacy/Cookie 정책 버전 날짜 |

---

## 10. 코딩 컨벤션

### 파일 네이밍
- 페이지: `src/pages/[route-name]/page.tsx`
- 컴포넌트: `PascalCase.tsx`
- 훅: `camelCase.ts` (접두사 `use`)
- 라이브러리: `camelCase.ts`
- 타입: `kebab-case.ts` (도메인명)

### 컴포넌트 구조
```typescript
// 1. 외부 라이브러리 import
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';

// 2. 내부 라이브러리 import
import { supabase } from '../lib/supabase';
import { usePermission } from '../hooks/usePermission';

// 3. 타입 정의
interface Props { ... }

// 4. 컴포넌트 본체
export default function MyComponent({ ... }: Props) { ... }
```

### TypeScript 규칙
- strict mode 활성화
- `noUnusedLocals`, `noUnusedParameters` 활성화
- 타입 단언(`as`) 최소화, 타입 가드 사용
- 도메인 모델 타입은 `src/types/` 또는 `src/lib/supabase.ts`에 정의

### 자동 Import (unplugin-auto-import)
다음은 명시적 import 없이 사용 가능:
- `React`, `useState`, `useEffect`, `useRef`, `useMemo`, `useCallback`
- `useNavigate`, `useParams`, `useLocation` (react-router)
- `useTranslation` (react-i18next)

---

## 11. 주요 외부 의존성

| 서비스 | 용도 | 설정 위치 |
|--------|------|----------|
| Supabase | DB, Auth, Edge Functions | Vercel env + Supabase dashboard |
| Anthropic | AI 테스트 케이스 생성 | Supabase Secret: `ANTHROPIC_API_KEY` |
| Paddle | 결제 (레거시) | Vercel env: `VITE_PADDLE_*`, `PADDLE_*` |
| Lemon Squeezy | 결제 (신규) | Vercel env: `VITE_LEMON_STORE_ID`, Supabase Secret: `LEMON_API_KEY` |
| Loops.so | 이메일 (트랜잭션 + 마케팅) | Supabase Secret: `LOOPS_API_KEY` |
| Sentry | 에러 트래킹 | Vercel env: `VITE_SENTRY_DSN`, CI: `SENTRY_AUTH_TOKEN` |
| BetterStack | 업타임 모니터링 | Vercel env: `BETTERSTACK_HEARTBEAT_URL` |
| Vercel | 호스팅/배포 | Git 연동 자동 배포 |

---

## 12. RLS (Row-Level Security) 주의사항

### 기본 원칙
- 모든 테이블에 RLS 활성화
- 사용자는 자신이 속한 조직의 프로젝트 데이터만 접근 가능

### 핵심 헬퍼 함수 (DB)
```sql
get_user_org_ids()        -- 현재 사용자가 속한 organization_id 목록
user_in_project_org(pid)  -- 사용자가 해당 프로젝트 조직 구성원인지 확인
```

### Edge Function에서 RLS 우회
Edge Function에서 DB 작업 시 항상 `SERVICE_ROLE_KEY`로 클라이언트 생성:
```typescript
const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);
// SERVICE_ROLE_KEY는 RLS를 우회하므로 함수 내에서 별도 권한 검증 필요
```

### 알려진 이슈
- `20260403_fix_rls_infinite_recursion.sql`: `organization_members` RLS 정책에서 재귀 무한루프 버그 수정됨. RLS 정책 작성 시 자기 참조 주의.
- RLS 정책 변경 후 반드시 production에서 실제 사용자 권한 테스트 필요.

---

## 13. AI 기능 상세

### 지원 액션 (`generate-testcases` Edge Function)
| 액션 | 설명 | 최소 티어 |
|------|------|---------|
| `text` 모드 | 텍스트 입력 → TC 생성 (2단계: 제목 → 상세) | Free (1) |
| `jira` 모드 | Jira 이슈 → TC 생성 | Hobby (2) |
| `session` 모드 | 세션 로그 → TC 생성 | Professional (4) |
| `summarize-run` | 테스트 런 결과 AI 요약 | Hobby (2) |
| `coverage-gap` | 커버리지 갭 분석 | Starter (3) |
| `analyze-flaky` | 불안정 테스트 탐지 | Starter (3) |
| `suggest-from-requirement` | 요구사항 → TC 제안 | Hobby (2) |

### 크레딧 시스템
- `profiles.ai_credits_used`: 월별 사용 크레딧 (매월 1일 리셋 - cron 또는 trigger)
- 프론트 (`useAiFeature.ts`) ↔ 백엔드 (`_shared/ai-config.ts`) 동일 설정 유지 필수
- 크레딧 초과 시 `402 Payment Required` 응답

---

## 14. 알려진 제약 및 주의사항

1. **Edge Function 재배포 필수**: 코드 변경 후 `supabase functions deploy [fn]` 실행. 자동 반영 없음.

2. **AI 설정 이중 관리**: `src/hooks/useAiFeature.ts`와 `supabase/functions/_shared/ai-config.ts`가 동일한 플랜 제한값을 가짐. 하나 수정 시 반드시 다른 쪽도 수정.

3. **결제 프로바이더 분기**: 구 사용자는 Paddle, 신규는 Lemon Squeezy. `payment_provider` 필드 기준. 새 결제 기능 추가 시 양쪽 모두 구현 필요.

4. **Discovery Logs URL**: 탐색적 세션 기능의 URL이 `/sessions`에서 `/discovery-logs`로 변경됨. 구 URL은 redirect 처리. 내부 링크 생성 시 항상 `/discovery-logs` 사용.

5. **대형 컴포넌트**: `DetailPanel.tsx`(62KB), `FocusMode.tsx`(89KB)는 많은 기능이 집중된 대형 컴포넌트. 수정 시 전체 파일 맥락 확인 필수.

6. **마이그레이션 순서**: `supabase/migrations/` 파일은 날짜순 실행. 새 마이그레이션 파일명은 `YYYYMMDD_description.sql` 형식 사용.

7. **로컬 스토리지 키 관리**: `sb-*` 키 (Supabase 세션), `cmdpalette_recent`, `testably_tips_dismissed_*` 등 앱 관련 키가 있음. 강제 로그아웃 시 `clearSupabaseTokens()`가 정리함.

8. **Sentry 소스맵**: `SENTRY_AUTH_TOKEN` 없으면 소스맵 업로드 없이 빌드는 성공함. CI/Vercel에서는 반드시 설정 필요.

9. **TypeScript strict**: `noUnusedLocals`, `noUnusedParameters` 활성화. 사용 안 하는 변수 선언 시 빌드 에러.

10. **RLS 정책 수정**: DB 마이그레이션으로만 변경. 직접 SQL 실행 금지. `20260403_fix_rls_infinite_recursion.sql` 이슈 참고 — 정책 내 자기 참조 테이블 쿼리 주의.
