# Monitoring Setup Guide

May 5 Product Hunt 런칭 대비 모니터링 3종 세트 설정 가이드. 아래 순서대로 따라하면 됩니다.

---

## 1. Sentry (에러 트래킹)

### 계정 생성 및 DSN 발급

1. https://sentry.io 가입 → 새 Organization 생성 (예: `testably`)
2. **Create Project** → Platform: `React` → 프로젝트명: `testably-web`
3. **Settings > Client Keys (DSN)** → DSN 복사

### 환경 변수 설정

**.env (로컬)**
```
VITE_SENTRY_DSN=https://xxxx@xxxx.ingest.sentry.io/xxxxx
```

**Vercel Dashboard > Settings > Environment Variables**
```
VITE_SENTRY_DSN   = https://...   (Production + Preview)
SENTRY_AUTH_TOKEN = sntrys_...    (Production only — source map 업로드용)
SENTRY_ORG        = testably      (Sentry org slug)
SENTRY_PROJECT    = testably-web  (Sentry project slug)
```

### Source Map 업로드 토큰 발급

1. Sentry > **Settings > Auth Tokens** → Create New Token
2. 권한: `project:releases`, `org:read`
3. 발급된 토큰을 Vercel의 `SENTRY_AUTH_TOKEN`에 등록

### 동작 확인

배포 후 브라우저 콘솔에서:
```js
import('/lib/sentry').then(m => m.Sentry.captureException(new Error('test')))
```
Sentry 대시보드에 `test` 에러가 잡히면 정상.

### 알림 설정

1. Sentry > **Alerts** → Create Alert Rule
2. 조건: `event.type = error` AND `times_seen > 1`
3. Action: Email (kyle@...) + Slack (webhook 추후 등록)

---

## 2. BetterStack (Uptime 모니터링)

### 계정 생성

1. https://betterstack.com 가입 (Free tier: 10 monitors, 3-min interval)
2. **Uptime > Monitors > New Monitor** 세 개 생성:

| 이름 | URL | Check interval | Expected status |
|------|-----|----------------|-----------------|
| Testably Landing | https://testably.app | 1분 | 200 |
| Testably Login | https://testably.app/login | 1분 | 200 |
| Testably Health | https://[supabase-project].supabase.co/functions/v1/health | 1분 | 200 |

> Health endpoint URL은 `supabase functions deploy health` 후 Supabase Dashboard에서 확인

### Slack Alert 연결

1. BetterStack > **Settings > Integrations > Slack** → Connect
2. 원하는 채널 선택 (예: `#alerts`)
3. 각 Monitor 편집 → **Notification Policy** → Slack 채널 추가

### Heartbeat (Smoke test 연동)

1. BetterStack > **Heartbeats > New Heartbeat**
2. 이름: `Smoke Tests`, Period: `20m` (15분 cron + 여유 5분)
3. 생성된 URL을 GitHub Secret `BETTERSTACK_HEARTBEAT_URL`에 등록

---

## 3. Playwright Smoke Tests (GitHub Actions)

### GitHub Secrets 등록

Repository > **Settings > Secrets and Variables > Actions > New Repository Secret**:

| Secret | 값 |
|--------|-----|
| `SMOKE_TEST_EMAIL` | smoke test 전용 계정 이메일 |
| `SMOKE_TEST_PASSWORD` | smoke test 전용 계정 비밀번호 |
| `SMOKE_PROJECT_ID` | smoke test용 프로젝트 UUID (Supabase에서 확인) |
| `BETTERSTACK_HEARTBEAT_URL` | BetterStack heartbeat URL |

### 전용 테스트 계정 만들기

1. https://testably.app/auth 에서 새 계정 생성 (예: `smoke@testably.app`)
2. 해당 계정으로 프로젝트 하나 생성 → UUID 복사 → `SMOKE_PROJECT_ID`에 등록
3. 이 계정은 smoke test 전용으로 유지 (절대 실 데이터 넣지 말 것)

### 로컬 실행

```bash
# 로컬에서 smoke 실행
SMOKE_TEST_EMAIL=smoke@testably.app \
SMOKE_TEST_PASSWORD=yourpassword \
SMOKE_PROJECT_ID=uuid-here \
npx playwright test
```

### 워크플로우 확인

Push 후 **GitHub > Actions > Smoke Tests** 탭에서 실행 이력 확인.
15분마다 자동 실행, 실패 시 GitHub에서 이메일 알림 발송 + BetterStack heartbeat 누락으로 2차 알림.

---

## 체크리스트 (Kyle이 할 일)

- [ ] Sentry 계정 생성 → DSN 발급 → Vercel env에 `VITE_SENTRY_DSN` 등록
- [ ] Sentry Auth Token 발급 → Vercel env에 `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT` 등록
- [ ] BetterStack 계정 생성 → Monitors 3개 등록
- [ ] BetterStack Slack 연동
- [ ] BetterStack Heartbeat 생성 → URL을 GitHub Secret `BETTERSTACK_HEARTBEAT_URL`에 등록
- [ ] `supabase functions deploy health` 실행
- [ ] smoke test 전용 계정 생성 → GitHub Secrets 등록 (`SMOKE_TEST_EMAIL`, `SMOKE_TEST_PASSWORD`, `SMOKE_PROJECT_ID`)
- [ ] Vercel 재배포 후 Sentry 동작 확인
- [ ] GitHub Actions > Smoke Tests 탭에서 첫 실행 확인

---

## 아키텍처 요약

```
Production Error
  └─> Sentry (React SDK) ──> Sentry Dashboard + Slack/Email alert

Uptime Monitoring (1분마다)
  └─> BetterStack ──> testably.app, /login, /health
                  └─> Down 감지 시 Slack + Email alert

Smoke Test (15분마다, GitHub Actions)
  └─> Playwright (5 flows: landing, login, project, testcase, run)
      ├─ 성공: BetterStack heartbeat ping
      └─ 실패: GitHub Actions 이메일 + BetterStack heartbeat 누락 알림

Health Endpoint (Supabase Edge Function)
  └─> GET /functions/v1/health
      ├─ Supabase DB ping
      ├─ Paddle API ping
      └─ Loops API ping
      → 200 OK (all healthy) / 503 (any degraded)
```
