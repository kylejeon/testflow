# On-call 런북 (Testably)

**최초 작성:** 2026-04-10  
**최근 검토:** 2026-04-10 · Kyle  
**다음 검토 예정:** 2026-05-10  
**검토 담당자:** (매월 업데이트)

> 이 문서는 장애 발생 시 on-call 담당자가 당황하지 않고 따를 수 있는 대응 매뉴얼입니다.
> 알림 수신 → 상황 파악 → 1차 완화 → 에스컬레이션의 수순을 명문화합니다.

---

## 1. 알림 수신 채널

| 소스 | 채널 | 알림 유형 |
|------|------|-----------|
| **BetterStack** | Slack `#alerts` + 이메일 | Uptime 이상, heartbeat 누락 |
| **GitHub Actions** | 이메일 (GitHub 알림) | Smoke test 실패 |
| **Sentry** | Slack `#alerts` + 이메일 | 에러 급증, 새 이슈 |
| **Paddle** | 이메일 (Paddle Dashboard) | Webhook 실패, 결제 오류 |

알림을 받으면 **Severity 판정** (섹션 5) → 해당 **증상별 플레이북** (섹션 4) 순으로 진행합니다.

---

## 2. 서비스 구성 요약

```
사용자 브라우저
  └─> Vercel (Frontend: React + Vite)
        └─> Supabase (PostgreSQL + Auth + Edge Functions)
              ├─> Paddle (결제 Webhook)
              ├─> Loops (이메일 발송)
              └─> Anthropic Claude API (AI 기능)

모니터링
  ├─> BetterStack (Uptime: testably.app, /login, /functions/v1/health)
  ├─> Sentry (Frontend 에러 트래킹)
  └─> GitHub Actions Smoke Tests (15분마다 E2E)
```

| 컴포넌트 | 역할 | 관리 콘솔 |
|---------|------|-----------|
| **Vercel** | 프론트엔드 배포 (React SPA) | dashboard.vercel.com |
| **Supabase** | DB, Auth, Edge Functions, Storage | supabase.com/dashboard |
| **Paddle** | 구독 결제 Webhook | vendors.paddle.com |
| **Loops** | 트랜잭션 이메일 발송 | app.loops.so |
| **Sentry** | JS 에러 수집 및 알림 | sentry.io |
| **BetterStack** | Uptime 모니터링 | betterstack.com |

---

## 3. 핵심 대시보드 / 링크 모음

| 대시보드 | URL | 용도 |
|---------|-----|------|
| **Sentry Issues** | https://sentry.io → testably 프로젝트 | 에러 종류, 발생 빈도, 스택 트레이스 |
| **Supabase Logs** | Dashboard → Logs → API/DB/Edge Functions | DB 슬로우 쿼리, Edge Function 오류 |
| **Supabase DB** | Dashboard → Database → Query Performance | 슬로우 쿼리, 인덱스 사용률 |
| **Vercel Deployments** | dashboard.vercel.com → testably → Deployments | 최근 배포 목록, 빌드 로그, 롤백 |
| **BetterStack Incidents** | betterstack.com → Uptime → Incidents | 인시던트 이력, 응답 시간 그래프 |
| **GitHub Actions** | github.com → testably → Actions | Smoke test 결과, CI/CD 이력 |
| **Paddle Dashboard** | vendors.paddle.com → Developer Tools → Logs | Webhook 이벤트, 오류 로그 |
| **Loops Dashboard** | app.loops.so → Logs | 이메일 발송 이력, 실패 로그 |

---

## 4. 증상별 대응 플레이북

### 4-A. 사이트 다운 (BetterStack incident)

**알림:** BetterStack이 `testably.app` 또는 `/login` 모니터에서 Down 감지

```
1. BetterStack Incidents 탭에서 정확한 다운 시각 확인
2. https://testably.app 직접 접속 시도
3. Vercel Status 확인: https://vercel-status.com
4. Supabase Status 확인: https://status.supabase.com
```

**원인별 대응:**

| 원인 | 확인 방법 | 대응 |
|------|-----------|------|
| Vercel 배포 실패 | Vercel → Deployments → 최근 빌드 로그 | 직전 배포로 롤백 (아래 참조) |
| Supabase 장애 | status.supabase.com | Supabase 복구 대기 (외부 장애) |
| DNS 문제 | `dig testably.app` 또는 dnschecker.org | 도메인 레지스트라 확인 |

**Vercel 롤백 절차:**

1. Vercel Dashboard → **testably** → **Deployments** 탭
2. 정상이었던 마지막 배포 클릭
3. 우측 상단 **⋯ → Promote to Production** 클릭
4. 약 30초~1분 후 재확인
5. BetterStack이 Up으로 전환되면 완료

---

### 4-B. 5xx 급증 (Sentry spike)

**알림:** Sentry Alert — 에러 급증 (분당 N건 이상)

```
1. Sentry → Issues → 최신 이슈 확인
2. 에러 종류, 첫 발생 시각, 영향받는 URL/컴포넌트 파악
3. 최근 배포와 시간대 대조 (Vercel → Deployments)
```

**에러 종류별 1차 대응:**

| 에러 패턴 | 예상 원인 | 1차 대응 |
|-----------|-----------|---------|
| `supabase: PGRST` | DB/PostgREST 오류 | Supabase Logs → API 탭에서 쿼리 오류 확인 |
| `401 Unauthorized` | Auth 토큰 만료/변경 | Supabase Auth 설정 확인, JWT 시크릿 변경 여부 |
| `Edge Function` 오류 | Edge Function 배포 실패 | Supabase → Edge Functions → 로그 확인 |
| `ChunkLoadError` | 배포 후 구버전 캐시 | Vercel 롤백 또는 캐시 헤더 확인 |
| `TypeError: Cannot read` | 프론트엔드 런타임 오류 | 스택 트레이스에서 파일/라인 확인 → Vercel 롤백 |

최근 배포 직후 오류 급증 시 → **Vercel 롤백** (4-A 참조)이 가장 빠른 완화책.

---

### 4-C. DB 응답 지연

**알림:** BetterStack `/functions/v1/health` 응답 시간 급증, 또는 사용자 제보

```
1. Supabase Dashboard → Logs → Database 탭
2. 슬로우 쿼리 확인: Dashboard → Database → Query Performance
3. 현재 연결 수 확인: Dashboard → Database → Connections
```

**슬로우 쿼리 식별:**

```sql
-- Supabase SQL Editor에서 실행
SELECT pid, now() - pg_stat_activity.query_start AS duration, query, state
FROM pg_stat_activity
WHERE (now() - pg_stat_activity.query_start) > interval '5 seconds'
  AND state != 'idle'
ORDER BY duration DESC;
```

**대응 옵션:**

| 상황 | 대응 |
|------|------|
| 특정 쿼리가 블로킹 | `SELECT pg_terminate_backend(pid)` (pid는 위 쿼리에서 확인) |
| 연결 수 과부하 | Supabase → Settings → Database → Connection Pooling 설정 확인 |
| Supabase 인프라 문제 | status.supabase.com 확인 → 외부 장애면 대기 |
| 인덱스 누락 | EXPLAIN ANALYZE로 쿼리 플랜 확인 → 인덱스 추가 (다음 배포에 포함) |

---

### 4-D. 결제 실패 (Paddle Webhook 오류)

**알림:** Paddle 이메일 알림 또는 사용자 결제 실패 제보

**로그 위치:**

1. Paddle Dashboard → **Developer Tools → Notifications** → 실패한 Webhook 확인
2. Supabase → **Edge Functions → check-subscriptions** 로그 (구독 상태 업데이트 실패 가능)

**재처리 방법:**

1. Paddle Dashboard → Notifications → 실패 이벤트 선택
2. **Retry** 버튼으로 Webhook 재전송
3. Webhook 엔드포인트 정상 여부 확인:
   - Vercel 환경 변수에 `PADDLE_WEBHOOK_SECRET` 설정 여부
   - Edge Function `check-subscriptions` 배포 상태

**Paddle Webhook URL 확인:**
- Supabase Edge Function URL: `https://ahzfskzuyzcmgilcvozn.supabase.co/functions/v1/check-subscriptions`
- Paddle Dashboard → Notifications → 등록된 URL 일치 여부 확인

---

### 4-E. 이메일 미발송 (Loops)

**알림:** 사용자 제보 (초대 이메일, 비밀번호 재설정 등 미수신)

```
1. Loops Dashboard (app.loops.so) → Logs → 최근 발송 이력 확인
2. 실패 원인 확인: API 키 오류 / 레이트 리밋 / 이메일 주소 오류
```

**원인별 대응:**

| 원인 | 확인 방법 | 대응 |
|------|-----------|------|
| API 키 만료/오류 | Loops → Settings → API Keys | 새 키 발급 → Supabase Secrets 업데이트 |
| 레이트 리밋 | Loops → Logs → 429 오류 | Loops 플랜 한도 확인, 필요 시 업그레이드 |
| 이메일 주소 오류 | Loops → Logs → 배달 실패 | 사용자 이메일 주소 확인 |
| Edge Function 미배포 | Supabase → send-invitation 로그 | `supabase functions deploy send-invitation` |

**Supabase Secrets 업데이트:**

```bash
supabase secrets set LOOPS_API_KEY=<새_키> --project-ref ahzfskzuyzcmgilcvozn
```

---

## 5. Severity 정의 및 응답 SLA

| Severity | 정의 | 응답 시간 | 해결 목표 |
|----------|------|-----------|-----------|
| **SEV1** | 전체 서비스 다운, 결제 불가, 데이터 손실 위험 | **15분 이내** | **2시간 이내** |
| **SEV2** | 핵심 기능 장애 (로그인, 테스트 케이스 저장 등), 일부 사용자 영향 | **30분 이내** | **4시간 이내** |
| **SEV3** | 부분 기능 저하, UI 오류, 성능 저하 (서비스 가능) | **2시간 이내** | **다음 영업일** |

**SEV 판정 기준:**
- BetterStack Down 알림 → **SEV1** (확인 전까지)
- Sentry 에러율 정상 대비 10배↑ → **SEV2**
- 특정 기능 버그 제보 1~2건 → **SEV3**
- 결제 실패 제보 → **SEV1** (매출 직결)

---

## 6. 에스컬레이션 경로

```
1차: On-call 담당자 (Slack DM + 전화)
  ↓ 15분 내 미해결 (SEV1) / 1시간 내 미해결 (SEV2)
2차: Dev Lead (Kyle)
  ↓ 30분 내 미해결 (SEV1) / 2시간 내 미해결 (SEV2)
3차: CEO
```

| 역할 | 연락 방법 |
|------|-----------|
| **On-call** | 순번표 참조 (Slack `#oncall` 채널 고정 메시지) |
| **Dev Lead (Kyle)** | Slack DM / 전화 (비상 연락망 참조) |
| **CEO** | Slack DM / 전화 (비상 연락망 참조) |

**에스컬레이션 시 전달할 정보:**
1. 인시던트 시작 시각
2. 현재 Severity
3. 영향 범위 (전체 다운 / 특정 기능 / 특정 사용자)
4. 지금까지 시도한 조치
5. 현재 상태 (악화/유지/개선 중)

---

## 7. Post-mortem

SEV1, SEV2 인시던트는 해결 후 **48시간 이내** post-mortem을 작성합니다.

→ 템플릿: [`docs/runbooks/post-mortem-template.md`](./post-mortem-template.md)

Slack `#post-mortem` 채널에 링크를 공유하여 팀 전체가 학습할 수 있도록 합니다.

---

## 8. 매월 런북 검토

| 월 | 검토자 | 검토 일자 | 변경 사항 요약 |
|----|--------|-----------|---------------|
| 2026-04 | Kyle | 2026-04-10 | 최초 작성 |
| 2026-05 | (담당자) | | |
| 2026-06 | (담당자) | | |
| 2026-07 | (담당자) | | |

**검토 체크리스트:**
- [ ] 대시보드 URL이 모두 유효한지 확인
- [ ] Severity SLA가 현재 팀 규모에 적합한지 확인
- [ ] 에스컬레이션 연락처가 최신인지 확인
- [ ] 지난 달 인시던트 교훈이 반영되었는지 확인
- [ ] Smoke test 실패 이력 검토

---

## 관련 문서

- [PITR Drill 런북](./pitr-drill.md)
- [Post-mortem 템플릿](./post-mortem-template.md)
- [모니터링 설정 가이드](../monitoring.md)
