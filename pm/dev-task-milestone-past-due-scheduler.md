# BUG-3 기획 + Dev 지시서: Milestone Past Due 스케줄러 & 알림

> **작성일:** 2026-04-02
> **작성자:** PM Agent
> **심각도:** High — 기한 초과 마일스톤 알림이 유저 접속에 의존하여 지연/누락됨
> **예상 소요:** 3~4일

---

## 1. 문제 정의

### 현재 상태 (AS-IS)

milestone_past_due 감지 및 알림이 **클라이언트 사이드에서만** 동작합니다.

```
유저가 마일스톤 페이지 접속
  → auto-correction 로직 실행 (날짜 비교)
  → past_due 감지 시 DB status 업데이트
  → triggerWebhook('milestone_past_due', ...) 호출
  → Slack/Teams 알림 발송
```

**문제점:**
1. **유저가 페이지를 안 열면 알림이 영원히 안 감** — 기한이 지난 마일스톤이 있어도 누군가 마일스톤 페이지를 열기 전까지 감지 불가
2. **알림 타이밍 불일치** — 금요일에 기한이 지나도 월요일에 누가 접속해야 알림 발생
3. **중복 방지 로직이 클라이언트에만 존재** — `milestone.status !== 'past_due'` 체크가 프론트엔드 변수에 의존

### 목표 상태 (TO-BE)

```
매일 UTC 00:00 (KST 09:00) Supabase Edge Function 실행
  → DB에서 기한 초과 마일스톤 일괄 조회
  → status 'past_due'로 일괄 업데이트
  → 프로젝트별 Webhook 알림 발송
  → 실행 로그 기록
```

---

## 2. 아키텍처 설계

### 권장 방안: Supabase Edge Function + 외부 Cron Trigger

Supabase 무료/Pro 플랜에서는 pg_cron을 직접 사용할 수 없으므로, **Edge Function + 외부 Cron 서비스**를 조합합니다.

```
┌─────────────────────────────────────────────────────────┐
│                    매일 UTC 00:00                         │
│                                                          │
│  ┌──────────────┐     ┌──────────────────────────────┐  │
│  │ Cron Trigger  │────▶│ Edge Function                 │  │
│  │ (아래 3안 중  │     │ check-milestone-past-due      │  │
│  │  택1)         │     │                               │  │
│  └──────────────┘     │ 1. 기한 초과 milestone 조회    │  │
│                       │ 2. status → past_due 업데이트  │  │
│  Cron 옵션:           │ 3. 알림 대상 project 집계      │  │
│  A. Vercel Cron       │ 4. Webhook 발송 (Slack/Teams)  │  │
│  B. GitHub Actions    │ 5. 실행 로그 기록              │  │
│  C. cron-job.org      │                               │  │
│                       └──────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### Cron Trigger 옵션 비교

| 옵션 | 장점 | 단점 | 비용 |
|------|------|------|------|
| **A. Vercel Cron (권장)** | 이미 Vercel 배포 중, vercel.json에 1줄 추가 | Hobby 플랜 1일 1회 제한 | 무료 |
| B. GitHub Actions | 무료, 안정적 | 별도 workflow 파일 필요 | 무료 |
| C. cron-job.org | 설정 간단 | 외부 의존성, 보안 토큰 관리 | 무료 |

**권장:** Vercel Cron → 이미 Vercel에 배포 중이므로 설정이 가장 간단합니다.

---

## 3. 구현 상세

### PART 1: Edge Function — `check-milestone-past-due`

**파일:** `supabase/functions/check-milestone-past-due/index.ts`

#### 3-1. 인증 및 보안

```typescript
// Bearer token으로 외부 호출 인증
// 환경변수: CRON_SECRET (랜덤 문자열, Vercel + Supabase에 동일하게 설정)
const authHeader = req.headers.get('Authorization');
if (authHeader !== `Bearer ${Deno.env.get('CRON_SECRET')}`) {
  return new Response('Unauthorized', { status: 401 });
}
```

#### 3-2. 기한 초과 마일스톤 조회

```sql
-- past_due 전환 대상: end_date < today AND status NOT IN ('past_due', 'completed')
SELECT m.id, m.name, m.project_id, m.end_date, m.status,
       p.name as project_name
FROM milestones m
JOIN projects p ON p.id = m.project_id
WHERE m.end_date < CURRENT_DATE
  AND m.status NOT IN ('past_due', 'completed')
ORDER BY m.project_id, m.end_date;
```

**중요:** `status !== 'completed'`는 유저가 수동으로 완료 처리한 마일스톤을 건드리지 않기 위함입니다.

#### 3-3. Status 일괄 업데이트

```sql
UPDATE milestones
SET status = 'past_due', updated_at = NOW()
WHERE id = ANY($1::uuid[])
  AND status NOT IN ('past_due', 'completed');
-- $1 = 3-2에서 조회된 milestone ID 배열
```

#### 3-4. Parent Milestone 연쇄 업데이트

Sub-milestone이 past_due가 되면 Parent도 past_due가 되어야 합니다 (Roll-up 규칙).

```sql
-- Sub가 past_due인 Parent milestone 조회 + 업데이트
UPDATE milestones parent
SET status = 'past_due', updated_at = NOW()
WHERE parent.id IN (
  SELECT DISTINCT m.parent_milestone_id
  FROM milestones m
  WHERE m.status = 'past_due'
    AND m.parent_milestone_id IS NOT NULL
)
AND parent.status NOT IN ('past_due', 'completed');
```

#### 3-5. 프로젝트별 Webhook 알림 발송

```typescript
// 프로젝트별로 묶어서 알림 (프로젝트당 1개 메시지)
// 한 프로젝트에 3개 마일스톤이 past_due면 → 1개 알림에 3개 목록

interface PastDueGroup {
  projectId: string;
  projectName: string;
  milestones: { id: string; name: string; endDate: string }[];
}

// 각 프로젝트의 active integrations 조회
// events 배열에 'milestone_past_due'가 포함된 webhook만 대상
```

**Slack 메시지 포맷:**

```
🚨 마일스톤 기한 초과 알림

프로젝트: {projectName}

• {milestone1.name} (기한: {end_date})
• {milestone2.name} (기한: {end_date})

👉 확인하기: https://www.testably.app/projects/{projectId}/milestones
```

**Teams Adaptive Card:** 동일 내용을 Teams 포맷으로 변환

#### 3-6. 실행 로그 기록

기존 `integration_logs` 테이블 활용:

```typescript
await supabase.from('integration_logs').insert({
  integration_id: integration.id,
  event_type: 'milestone_past_due_batch',
  payload: { milestones: pastDueGroup.milestones, triggered_by: 'scheduler' },
  status: response.ok ? 'success' : 'failed',
  response_code: response.status,
  error_message: response.ok ? null : await response.text(),
});
```

#### 3-7. 응답

```json
{
  "success": true,
  "processed": 5,
  "projects_notified": 3,
  "webhooks_sent": 4,
  "errors": 0,
  "timestamp": "2026-04-02T00:00:00Z"
}
```

---

### PART 2: Vercel Cron 설정

**파일:** `vercel.json`

기존 rewrite 설정에 `crons` 필드 추가:

```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ],
  "crons": [
    {
      "path": "/api/cron/check-milestones",
      "schedule": "0 0 * * *"
    }
  ]
}
```

**→ 매일 UTC 00:00 (KST 09:00)에 실행**

### PART 3: Vercel API Route (Cron → Edge Function 브릿지)

**파일:** `api/cron/check-milestones.ts` (Vercel Serverless Function)

```typescript
// Vercel Cron이 이 엔드포인트를 호출
// → Supabase Edge Function을 호출하는 프록시 역할

export default async function handler(req, res) {
  // Vercel Cron 검증
  if (req.headers['authorization'] !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const response = await fetch(
    `${process.env.VITE_PUBLIC_SUPABASE_URL}/functions/v1/check-milestone-past-due`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ triggered_by: 'vercel-cron' }),
    }
  );

  const result = await response.json();
  return res.status(200).json(result);
}
```

---

### PART 4: 환경변수 설정

| 변수 | 위치 | 용도 |
|------|------|------|
| `CRON_SECRET` | Vercel + Supabase | Cron → Edge Function 인증 토큰 |
| `SUPABASE_SERVICE_ROLE_KEY` | Vercel | Edge Function 호출 시 서비스 역할 인증 |

**주의:** `SUPABASE_SERVICE_ROLE_KEY`는 **절대 클라이언트에 노출하면 안 됩니다**. Vercel 서버사이드에서만 사용.

---

### PART 5: 클라이언트 사이드 중복 방지

기존 `project-milestones/page.tsx`와 `milestone-detail/page.tsx`의 auto-correction 로직은 **유지**합니다.

이유:
- 스케줄러가 하루 1회 실행하므로, 당일 기한 초과는 유저가 페이지 접속 시 즉시 감지
- 스케줄러와 클라이언트 양쪽에서 `status NOT IN ('past_due', 'completed')` 체크가 있어 중복 업데이트 안전

**단, 클라이언트 Webhook 발송은 제거합니다:**

`project-milestones/page.tsx`에서 아래 부분 변경:

```diff
  // 기존: 클라이언트에서 webhook 발송
- if (milestone.status !== 'past_due') {
-   triggerWebhook('milestone_past_due', {...})
- }

  // 변경: status 업데이트만, webhook은 스케줄러가 담당
  // (주석으로 이유 명시)
  // Webhook is now handled by server-side scheduler (check-milestone-past-due)
```

`milestone-detail/page.tsx`에도 동일 적용.

---

### PART 6: upcoming → started 자동 전환도 스케줄러에 추가

Past due와 동일한 문제가 있으므로 함께 처리합니다.

```sql
-- start_date에 도달했지만 아직 upcoming인 마일스톤
UPDATE milestones
SET status = 'started', updated_at = NOW()
WHERE start_date <= CURRENT_DATE
  AND status = 'upcoming';
```

이에 대한 webhook 이벤트: `milestone_started` (기존 이벤트 타입 재활용)

---

## 4. 엣지 케이스

| # | 케이스 | 처리 |
|---|--------|------|
| 1 | Webhook URL이 만료/잘못됨 | integration_logs에 failed 기록, 다른 프로젝트 계속 진행 |
| 2 | 마일스톤이 0건 (전부 정상) | 조기 리턴, 불필요한 webhook 발송 없음 |
| 3 | 하루에 여러 번 실행됨 | `status NOT IN ('past_due', 'completed')` 조건으로 멱등성 보장 |
| 4 | Parent + Sub 동시 past_due | Sub 먼저 업데이트 → Parent 연쇄 업데이트 순서 보장 |
| 5 | 유저가 당일 completed 처리 | completed 상태는 건너뛰므로 충돌 없음 |
| 6 | end_date가 NULL | WHERE 조건에서 자연 제외 (NULL < CURRENT_DATE → false) |
| 7 | 타임존 차이 | UTC 기준 CURRENT_DATE 사용, 일관성 유지 |

---

## 5. 파일 변경 요약

| 파일 | 유형 | 내용 |
|------|------|------|
| `supabase/functions/check-milestone-past-due/index.ts` | **신규** | 스케줄러 Edge Function (메인 로직) |
| `api/cron/check-milestones.ts` | **신규** | Vercel Cron → Edge Function 브릿지 |
| `vercel.json` | **수정** | crons 설정 추가 |
| `src/pages/project-milestones/page.tsx` | **수정** | 클라이언트 webhook 발송 제거 (status 업데이트는 유지) |
| `src/pages/milestone-detail/page.tsx` | **수정** | 동일 |

---

## 6. 검증 체크리스트

- [ ] Edge Function 로컬 테스트: `supabase functions serve check-milestone-past-due`
- [ ] 테스트 마일스톤 생성 (end_date = 어제), Edge Function 호출 → status 'past_due' 확인
- [ ] Webhook 수신 확인 (Slack/Teams 테스트 채널)
- [ ] 프로젝트별 1개 알림으로 묶이는지 확인 (마일스톤 3개 → 알림 1개)
- [ ] Parent milestone 연쇄 업데이트 확인
- [ ] 이미 past_due인 마일스톤에 중복 알림 안 가는지 확인
- [ ] completed 마일스톤 건너뛰는지 확인
- [ ] Vercel Cron 배포 후 다음 날 실행 로그 확인
- [ ] 기존 클라이언트 auto-correction 정상 동작 (status 업데이트만, webhook 없이)
- [ ] integration_logs 테이블에 실행 기록 정상 저장

---

## 7. 구현 Phase

| Phase | 내용 | 소요 |
|-------|------|------|
| Phase 1 | Edge Function 작성 + 로컬 테스트 | 1일 |
| Phase 2 | Vercel Cron 브릿지 + vercel.json 설정 | 0.5일 |
| Phase 3 | 클라이언트 webhook 제거 + 테스트 | 0.5일 |
| Phase 4 | 배포 + 환경변수 설정 + 모니터링 | 1일 |
