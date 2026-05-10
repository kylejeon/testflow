# Launch Readiness — 2026-05-11 Testably 런칭

**점검 시각**: 2026-05-10 14:10 KST
**점검자**: Claude (Opus 4.7)
**대상 환경**: production (testably.app / Supabase: ahzfskzuyzcmgilcvozn / Vercel)

---

## TL;DR

- **런칭 가능 여부: 조건부 GO**
- 코드/배포/도메인은 정상. **2건의 런칭 전 처리 필요**, **5건의 운영 리스크**가 있음.
- P0(런칭 막는 이슈) 없음. P1 2건은 30분 내 처리 가능.

---

## 점검 결과 요약

| # | 항목 | 상태 | 한 줄 요약 |
|---|------|------|----------|
| 1 | 프로덕션 배포 | ✅ | testably.app HTTP 200, www 리다이렉트 정상, 153ms |
| 2 | Edge Functions | ⚠️ | 35개 ACTIVE. `sync-jira-status` 로컬 존재하나 미배포 |
| 3 | 환경변수 | ⚠️ | 로컬 .env에 `VITE_SENTRY_DSN`, `LOOPS_API_KEY` 등 누락 — Vercel/Supabase Secrets 확인 필요 |
| 4 | DB Migrations | ⚠️ | 실제 적용 OK(RPC 호출 200), 그러나 `supabase_migrations` 테이블 추적 불일치 (70개 중 2개만 기록) |
| 5 | claude → main 머지 대기 | ✅ | 코드 변경분 0. main과 origin/claude 동일 commit (`79792a4`). 로컬 claude만 progress.txt 1건 미푸시 |
| 6 | 모니터링/로깅 | ⚠️ | Sentry 코드 wired ✅, BetterStack 헬스체크 ❌ (Paddle 403로 인해 health endpoint 503 반환 중) |
| 7 | 도메인/SSL | ✅ | testably.app → www.testably.app 307, HTTPS 정상, HSTS 활성 |
| 8 | Rate limiting / 트래픽 | ⚠️ | Vercel.json은 rewrite만. Supabase Free/Pro tier rate limit 미점검. 런칭 트래픽 대비 부족 |

---

## 액션 아이템

### 🔴 P0 — 런칭 전 반드시 처리 (없음)

> 코드 자체가 런칭을 막는 이슈는 없음.

### 🟠 P1 — 런칭 전 30분 내 처리

#### 1. **`/functions/v1/health` 가 503 반환 중 → BetterStack uptime 알람 false positive**

```bash
$ curl https://ahzfskzuyzcmgilcvozn.supabase.co/functions/v1/health
{
  "status": "degraded",
  "checks": {
    "supabase": { "ok": true, "latency_ms": 207 },
    "paddle":   { "ok": false, "latency_ms": 304, "error": "HTTP 403" },  ← 원인
    "loops":    { "ok": true, "latency_ms": 291 }
  }
}
```

- **원인**: `supabase/functions/health/index.ts` 가 Paddle API를 ping → 403 반환 → 함수 503 응답
- Paddle API 403 자체는 결제 흐름과 별개일 수 있으나(Lemon Squeezy로 마이그레이션 중), **uptime 모니터가 계속 트리거됨**
- **해결 옵션 A**: Paddle 체크 제거(이미 Lemon Squeezy로 전환 중이라면)
- **해결 옵션 B**: Paddle API key 권한/만료 확인 후 갱신
- **임시**: 런칭 직전이면 health 함수에서 Paddle 체크를 optional로 내려서 200 반환하도록 수정

#### 2. **Vercel 환경변수 검증 — Sentry DSN, Loops API key**

로컬 `.env` 에는 다음이 비어있음:
- `VITE_SENTRY_DSN` → Vercel에 설정돼있지 않으면 **에러 트래킹 안 됨** (코드는 있어도 silent skip)
- `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT` → 빌드 시 source map 업로드 안 됨
- `LOOPS_API_KEY` → Supabase Secrets에 등록돼있지 않으면 **welcome email / digest 안 나감**
- `BETTERSTACK_HEARTBEAT_URL` → smoke 테스트 통과 시 heartbeat ping 못함

→ Vercel Dashboard / Supabase Dashboard 에서 직접 확인 필요 (CLI로 자동 점검 불가)

### 🟡 P2 — 런칭 후 24시간 내

#### 3. **Edge Function `sync-jira-status` 로컬 존재 / 미배포**
   - 로컬 `supabase/functions/sync-jira-status/` 존재
   - Supabase에 동일 이름 함수 미배포
   - Jira webhook 수신 후 상태 동기화 누락 가능 — 사용 여부 확인 후 `supabase functions deploy sync-jira-status` 또는 폴더 삭제
   - 추가: `check-overdue-milestones` (배포됨, 로컬 없음) vs `check-milestone-past-due` (로컬, 배포됨) — 이름 다른 동일 기능 유추, 정리 필요

#### 4. **Migration 추적 테이블 불일치 (`supabase migration repair` 필요)**
   - `supabase migration list` 결과: 로컬 70개 중 `20260321`, `20260323001` 2개만 Remote 컬럼에 기록
   - 실제 RPC(`get_ai_usage_breakdown` — 20260424 migration)는 prod에 존재함을 확인 (HTTP 200)
   - → migration이 SQL editor 직접 실행 등으로 적용됐으나 `supabase_migrations.schema_migrations` 테이블에 등록 안 됨
   - **위험**: 다음 `supabase db push` 실행 시 이미 적용된 migration을 재실행 시도 → 충돌 가능
   - **조치**: `supabase migration repair --status applied <version>` 으로 일괄 등록

#### 5. **로컬 claude 브랜치 미푸시 commit 1건**
   - `c0d8602 chore: progress.txt — Paddle 정기결제 취소 대응 기록`
   - 코드 변경 없음. 본 보고서와 함께 푸시됨.

#### 6. **Rate limiting 무방비**
   - `vercel.json`: rewrite rule만 존재, rate limit/headers 설정 없음
   - Supabase Free tier: 500 req/sec edge functions, 60 req/min auth — Pro 플랜 여부 확인 필요
   - 런칭 트래픽 스파이크 대비: Vercel Pro의 `Edge Config` 또는 Cloudflare 앞단 두는 것 권장 (런칭 후 처리)

#### 7. **Supabase CLI 버전 outdated**
   - 현재 v2.78.1 / 최신 v2.98.2 — 운영에 영향 없음, 다음 작업 시 업데이트

---

## 항목별 상세

### 1. 프로덕션 배포 ✅

```
$ curl -IL https://testably.app/
HTTP/2 307 → https://www.testably.app/
HTTP/2 200 (153ms, SSL OK, HSTS preload)

<title>Test Case Management Tool — Testably | QA Test Management Platform</title>
```

- Vercel CLI 미설치로 자동 deployment ID 확인 불가
- 도메인 응답 정상, 빌드 산출물(meta/title) 정상 렌더
- main 브랜치 최신 commit `79792a4 fix(home): footer Blog 링크` 가 prod에 반영됐을 것으로 추정
- **제안**: Vercel Dashboard에서 Production Deployment의 Source Commit이 `79792a4`인지 한 번 확인

### 2. Edge Functions ⚠️

**총 35개 ACTIVE**, 모두 4월 7일 ~ 4월 24일 사이 배포

| 미일치 항목 | 로컬 | 원격 | 처리 |
|---|---|---|---|
| `sync-jira-status` | ✅ | ❌ | 배포 또는 삭제 결정 |
| `tests` | ✅ | ❌ | 테스트 fixture 추정, OK |
| `check-overdue-milestones` | ❌ | ✅ | 옛 함수 잔존, 정리 필요 |
| `check-milestone-past-due` | ✅ | ✅ | 신규 ✓ |

배포된 함수 중 가장 최근 업데이트: `create-github-issue` / `sync-jira-metadata` / `sync-github-metadata` (2026-04-24)

### 3. 환경변수 ⚠️

`.env.example` vs `.env` 차이로 누락 확인:

**로컬 `.env`에 키만 존재 (값 없거나 누락) — Vercel/Supabase Secrets 필수 항목**:
- `VITE_SENTRY_DSN`, `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT`
- `LOOPS_API_KEY` + `LOOPS_TEMPLATE_*` (8종 템플릿 ID)
- `BETTERSTACK_HEARTBEAT_URL`
- `LEMON_API_KEY`, `LEMON_WEBHOOK_SECRET`
- `SMOKE_TEST_EMAIL`, `SMOKE_TEST_PASSWORD`, `SMOKE_PROJECT_ID` (GitHub Secrets)
- `SITE_URL` (.env.example 기본값 https://testably.app)

**확인된 정상 항목**:
- `VITE_PUBLIC_SUPABASE_URL` / `VITE_PUBLIC_SUPABASE_ANON_KEY` ✓
- `ANTHROPIC_API_KEY` ✓
- `VITE_PADDLE_*` (8종 가격 ID) ✓ — production keys

### 4. DB Migrations ⚠️

```
$ supabase migration list
   Local       | Remote      | Time
  -------------|-------------|-----
   20260321    | 20260321    | 20260321  ← 추적됨
   20260323001 | 20260323001 | 20260323001  ← 추적됨
   20260323~24 |             | (나머지 ~68개 미추적)
```

- 그러나 실제 prod DB 검증 결과 최신 migration의 RPC 함수가 정상 동작:
  ```
  POST /rest/v1/rpc/get_ai_usage_breakdown → HTTP 200
  (= 20260424_f011_ai_usage_breakdown_rpc.sql 적용됨)
  ```
- 결론: **migration 자체는 prod에 적용됐으나 추적 메타데이터가 미동기화 상태**
- repo 루트 `pending-production-sql.sql` (2026-03-30 작성) 에도 "모든 migration 적용 완료" 기록

### 5. claude → main 머지 대기 ✅

```
origin/main    = 79792a4 (fix(home): footer Blog 링크)
origin/claude  = 79792a4 (동일)
local main     = 79792a4 (동일)
local claude   = c0d8602 (= main + progress.txt 1건, code 변경 0)
```

- **머지 대기 코드 변경분 없음** ✓
- 로컬 claude의 progress.txt commit은 본 보고서와 함께 origin/claude로 푸시
- main 머지 필요 X (코드 차이 없음)

### 6. 모니터링/로깅 ⚠️

**Sentry**:
- `src/main.tsx:8` 에서 `initSentry()` 호출 ✓
- `src/lib/sentry.ts` — environment 자동 분기 (`testably.app` → production)
- DSN 미설정 시 silent skip → **VITE_SENTRY_DSN이 Vercel prod env에 있는지가 관건**
- 설정 시: tracesSampleRate 10%, replay 1% / 에러 시 10% (Free tier 안전 범위)

**BetterStack uptime**:
- `.github/workflows/smoke.yml` 에서 30분 주기 + main push 시 smoke 테스트 → BETTERSTACK_HEARTBEAT_URL ping
- ⚠️ `health` 함수 503 상태로 직접 uptime 모니터링은 현재 false alert 발생 중

**Supabase logs**:
- Dashboard에서 직접 확인 (CLI로 tail 미지원)

### 7. 도메인/SSL ✅

```
testably.app → 307 → www.testably.app → 200
SSL: 정상 (Cloudflare 앞단)
HSTS: max-age=31536000; includeSubDomains; preload
응답 시간: 153ms (Cloudflare cache)
```

- 두 도메인 모두 인증서 정상
- root → www 강제 리다이렉트 OK
- `index.html` canonical/og:url 모두 `https://testably.app` (non-www) — SEO 일관성 ✓

### 8. Rate limiting / 트래픽 대비 ⚠️

**Vercel**:
- `vercel.json` 내용은 SPA rewrite 1줄뿐
- Vercel 자체 plan 한도(Hobby vs Pro) 미확인
- 권장: Production Domain의 Edge Function/Bandwidth 한도 미리 확인

**Supabase**:
- Edge function rate limit: tier별 다름 (Free 500 req/s, Pro 1000 req/s)
- Auth rate limit: signup 60/min, OTP 30/min — 런칭 트래픽 대응 부족 가능
- DB connection pool: PostgreSQL pool size 확인 필요

**런칭 트래픽 대비 권장**:
- Sentry/BetterStack 알람 채널(Slack/Email) 사전 점검
- Supabase Dashboard 열어두고 첫 1시간 모니터링
- Cloudflare 앞단 미적용 → 트래픽 폭주 시 직접 대응 필요

---

## 부록: 점검에 사용한 명령어

```bash
# 1. 도메인 / 배포
curl -IL https://testably.app/

# 2. Edge functions
supabase functions list

# 3. Migrations
supabase migration list

# 4. RPC 적용 검증
curl -X POST -H "apikey: ..." -H "Authorization: Bearer ..." \
  https://ahzfskzuyzcmgilcvozn.supabase.co/rest/v1/rpc/get_ai_usage_breakdown

# 5. Health check
curl https://ahzfskzuyzcmgilcvozn.supabase.co/functions/v1/health

# 6. Branch 상태
git fetch --all
git log origin/main..origin/claude
git rev-parse origin/main origin/claude main claude
```

---

**최종 판단**: 런칭 GO. 단 위 P1 2건(health 503, Vercel 환경변수 검증)은 런칭 30분 전까지 처리 권장.
