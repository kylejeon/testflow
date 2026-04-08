# Loops 실행 계획 — Testably

**작성일:** 2026-04-08
**작성자:** Mark (Testably Marketing)
**상태:** 즉시 실행 가능
**참고:** `mark/Loops_Trial_Sequence.md`, `mark/Loops_Email_Master_Plan.md`

> 이 문서는 실행 문서입니다. 분석/배경은 `Loops_Email_Master_Plan.md` 참고.
> 각 작업은 순서대로 진행하세요.

---

## 현재 상태 (Kyle 확인 기준)

| # | 현재 Onboarding Sequence | 상태 |
|---|--------------------------|------|
| Email #1 | Day 0 — Welcome to Testably | ✅ 유지 |
| Email #2 | Day 1 — The 10 test cases | ✅ 유지 |
| Email #3 | Day 3 — Stop copy-pasting to Jira | ✅ 유지 |
| Email #4 | Day 7 — QA workflow takes team from sprint to ship | ✅ 유지 |
| Email #5 | Day 14 — "you've been using Testably for a week" | 🔶 제목 수정 필요 |
| Email #6 | Day 28 — Your trial has ended | 🔴 Onboarding에서 제거 → Trial Sequence로 이동 |

---

## 작업 1. Onboarding Sequence 수정

### 작업 1-1: Email #5 제목 수정 (Day 14)

**현재 제목:**
```
{{firstName}}, you've been using Testably for a week — here's what's next
```

**문제:** "a week"은 Day 7 기준 표현. Day 14 이메일에는 어색함.

**최종 변경 제목 (선택 완료):**
```
{{firstName}}, two weeks in — is Testably actually helping?
```

**선택 근거:** 구체적 기간(2주) + 솔직한 질문 형식 → 피드백 수집 및 재활성화에 최적. 기존 이메일이 "what's next" 계열이라면 이 방향이 자연스러운 다음 단계.

> 제목만 바꾸는 경우: 본문에 "for a week" 또는 "7 days" 같은 표현이 있으면 "two weeks" / "14 days"로 함께 수정 필요.

**대안 제목 2개 (참고용):**
- `Two weeks with Testably — quick question`
- `How's Testably working for your team?`

---

### 작업 1-2: Email #6 삭제 (Day 28 — Trial Ended)

**삭제 전 필수 작업 — 본문 백업:**

Email #6 본문을 별도로 복사해두세요 (아래 Email D에서 재활용).
Loops에서 이메일 클릭 → "View source" 또는 내용 전체 복사 → 메모장에 임시 저장.

**삭제 대상 노드 3개:**
1. Timer 노드 (14일 대기)
2. Email #6 Send 노드
3. 관련 Audience filter 노드 (있는 경우)

삭제 후 시퀀스는 Email #5 (Day 14) 이후 **"Loop completed"로 자동 종료**됩니다.

---

## 작업 2. Trial Sequence 신규 생성

**시퀀스 이름:** `Testably Trial Sequence`
**트리거:** Event received → `trial_started`

### 이메일 4개 완성본

---

### Email A — Day 0: Trial Welcome

**제목 (A):**
```
Your 14-day Testably Starter trial has started
```
**제목 (B) — A/B 테스트용:**
```
{{firstName}}, your Starter trial is live — here's how to make the most of it
```

**본문 (복붙용):**
```
Hi {{firstName}},

Your 14-day Starter trial is now active. You have full access to everything in Testably Starter until {{trialEndsAt}}.

Here's what's unlocked during your trial:

✓ Unlimited projects
✓ Unlimited team members
✓ Jira integration — failed tests auto-create issues
✓ Advanced reporting & milestone dashboards
✓ Priority support

To get the most out of your trial, here's what I'd suggest doing in the first 48 hours:

1. Create a milestone for your next release
2. Run a full test cycle with your team
3. Connect Jira if you use it (Settings → Integrations → takes 60 seconds)

Go to Testably → https://testably.io/dashboard

If you have any questions during the trial, just reply to this email. I read every message.

— Kyle
Founder, Testably
```

**CTA 버튼:**
- 라벨: `Go to Testably →`
- 링크: `https://testably.io/dashboard`

**Fallback values:**

| Variable | Fallback |
|----------|----------|
| `firstName` | `there` |
| `trialEndsAt` | `in 14 days` |

---

### Email B — Day 7: Trial Halfway

**타이밍:** trial_started 이후 7일 대기

**제목 (A):**
```
You're halfway through your Testably trial — 7 days left
```
**제목 (B) — A/B 테스트용:**
```
{{firstName}}, your trial snapshot (+ what happens next)
```

**본문 (복붙용):**
```
Hi {{firstName}},

You're halfway through your 14-day Testably Starter trial. Here's what you've built so far:

{{testCaseCount}} test cases · {{testRunCount}} test runs · {{teamMemberCount}} team members

You have 7 days left with full Starter access. Here's what happens when the trial ends:

Keep it going — Upgrade to Starter
$20/month for the whole team. Everything you've built stays exactly as-is.

Upgrade to Starter → https://testably.io/settings/billing

Switch to Free
3 projects, 5 team members, forever. Your data is safe — you'll just move to a smaller workspace.

Do nothing
Your account moves to Free automatically. No data deleted, no surprises.

---

How's the trial going so far? If something isn't clicking, reply now — there's still time to fix it.

— Kyle
Founder, Testably
```

**CTA 버튼:**
- 라벨: `Upgrade to Starter →`
- 링크: `https://testably.io/settings/billing`

**Fallback values:**

| Variable | Fallback |
|----------|----------|
| `firstName` | `there` |
| `testCaseCount` | `0` |
| `testRunCount` | `0` |
| `teamMemberCount` | `1` |

---

### Email C — Day 11: Trial Ending Soon

**타이밍:** trial_started 이후 11일 대기 (= 종료 3일 전)

> **구현 방법 선택:**
> - **방법 1 (간단):** Loops에서 trial_started + 11일 delay로 처리
> - **방법 2 (정확):** 백엔드 cron에서 trial_ends_at - 3일 조건으로 `trial_ending_soon` 이벤트 직접 발송
> 초기엔 방법 1 권장. 향후 정확한 날짜 관리 필요 시 방법 2로 전환.

**제목 (A):**
```
Your Testably trial ends in 3 days
```
**제목 (B) — A/B 테스트용:**
```
{{firstName}}, 3 days left on your Starter trial
```

**본문 (복붙용):**
```
Hi {{firstName}},

Your Testably Starter trial ends in 3 days.

Here's what you've built:

{{testCaseCount}} test cases · {{testRunCount}} test runs · {{teamMemberCount}} team members

After the trial ends, your account moves to the Free plan automatically. No data is deleted.

But if you want to keep everything — unlimited projects, Jira integration, advanced reporting — upgrading takes 30 seconds:

Upgrade to Starter — $20/month → https://testably.io/settings/billing

What's on the Free plan:
- 3 projects
- 5 team members
- Unlimited test cases
- No Jira integration
- No milestone dashboards

If you have questions about which plan fits your team, just reply. Happy to help.

— Kyle
Founder, Testably
```

**CTA 버튼:**
- 라벨: `Upgrade to Starter — $20/month →`
- 링크: `https://testably.io/settings/billing`

**Fallback values:**

| Variable | Fallback |
|----------|----------|
| `firstName` | `there` |
| `testCaseCount` | `0` |
| `testRunCount` | `0` |
| `teamMemberCount` | `1` |

---

### Email D — Day 14: Trial Expired

**타이밍:** trial_started 이후 14일 대기 OR `trial_expired` 이벤트 수신 시 즉시

> **기존 Onboarding Email #6 ("Your trial has ended") 내용을 이곳으로 이동.**
> 백업해둔 본문이 있으면 여기에 붙여넣고, 아래 템플릿으로 덮어쓰세요.

**제목 (A):**
```
Your Testably trial has ended — here's what happens now
```
**제목 (B) — A/B 테스트용:**
```
{{firstName}}, your trial is up. Here's what you've built.
```

**본문 (복붙용):**
```
Hi {{firstName}},

Your 14-day Testably Starter trial has ended. Here's what you built during that time:

{{testCaseCount}} test cases · {{testRunCount}} test runs · {{teamMemberCount}} team members

Your account has moved to the Free plan. Your data is safe — nothing has been deleted.

But if you want to keep using everything you had during the trial, upgrading takes 30 seconds:

Starter — $20/month for the whole team
- Unlimited projects & team members
- Jira integration
- Advanced reporting & milestone dashboards
- Priority support

Upgrade to Starter → https://testably.io/settings/billing

If the Free plan works for you, no action needed. You can upgrade anytime.

---

One last thing — how was the trial? What worked, what didn't? Hit reply and tell me. Even a one-liner helps us improve.

— Kyle
Founder, Testably
```

**CTA 버튼:**
- 라벨: `Upgrade to Starter →`
- 링크: `https://testably.io/settings/billing`

**Fallback values:**

| Variable | Fallback |
|----------|----------|
| `firstName` | `there` |
| `testCaseCount` | `0` |
| `testRunCount` | `0` |
| `teamMemberCount` | `1` |

---

## 작업 3. Loops 대시보드 단계별 실행 가이드

### PART A — Onboarding Sequence 수정

**1.** `app.loops.so` 로그인

**2.** 왼쪽 사이드바 → **Loops** 클릭

**3.** 목록에서 **"Testably Onboarding Sequence"** 클릭

**4.** 상단 탭 중 **"Build"** 클릭 (시퀀스 편집 화면 진입)

**5.** Email #5 카드(Day 14) 클릭
- 이메일 편집 창 열림
- **Subject 필드** 찾기
- 현재값 전체 선택 삭제 후 아래 복붙:
  ```
  {{firstName}}, two weeks in — is Testably actually helping?
  ```
- 본문에서 "for a week" 또는 "7 days" 표현 있으면 → "two weeks" / "14 days"로 수정
- **Save** 클릭

**6.** Email #6 본문 백업
- Email #6 카드 클릭 → 본문 전체 선택 → 복사 → 메모장에 임시 저장
- 창 닫기

**7.** Email #6 삭제
- Build 탭 캔버스에서 Email #6 노드를 찾아 클릭
- 노드 상단 또는 우측 **"..." 메뉴** 또는 **Delete** 아이콘 클릭
- 삭제 확인 팝업 → **Delete** 클릭

**8.** Timer 노드 삭제 (Email #5 → Email #6 사이 14일 대기 노드)
- Email #5 이후 연결된 Timer 노드 클릭
- **Delete** 클릭 → 확인

**9.** Audience filter 노드 삭제 (있는 경우)
- Email #6와 연결된 조건 분기 노드가 있으면 동일하게 삭제

**10.** 시퀀스 종료 확인
- Email #5 이후 아무 노드도 연결되지 않은 상태 = 정상
- Loops가 자동으로 "Loop completed"로 처리함

**11.** 우측 상단 **"Save"** 또는 **"Publish"** 클릭

---

### PART B — Trial Sequence 신규 생성

**12.** 왼쪽 사이드바 → **Loops** → 우측 상단 **"+ New Loop"** (또는 "+ Create") 클릭

**13.** 팝업에서 이름 입력:
```
Testably Trial Sequence
```
**Create** 클릭

**14.** Build 탭 진입 → **Trigger 노드** 클릭
- Trigger 타입: **"Event received"** 선택
- Event name 입력:
  ```
  trial_started
  ```
- 저장

**15.** Trial Started 이메일 생성
- Trigger 노드 하단 **"+"** 클릭 → **"Send email"** 선택
- **"Create new email"** 클릭
- 이름:
  ```
  Trial Started — Day 0
  ```
- From name: `Kyle from Testably`
- Reply-to: Kyle 개인 이메일
- Subject 입력 (위 Email A 제목 A 복붙):
  ```
  Your 14-day Testably Starter trial has started
  ```
- 본문: **위 Email A 본문 복붙**
- CTA 버튼 추가: 라벨 `Go to Testably →`, 링크 `https://testably.io/dashboard`
- Fallback 설정: `firstName` → `there`, `trialEndsAt` → `in 14 days`
- **Save** 클릭

**16.** Trial Halfway 이메일 추가 (Day 7)
- "Trial Started" 이메일 노드 하단 **"+"** → **"Wait"** 선택
- Duration: **7 days**
- Wait 노드 하단 **"+"** → **"Send email"** → **"Create new email"**
- 이름: `Trial Halfway — Day 7`
- Subject: `You're halfway through your Testably trial — 7 days left`
- 본문: **위 Email B 본문 복붙**
- CTA: `Upgrade to Starter →` / `https://testably.io/settings/billing`
- Fallback: `firstName` → `there`, `testCaseCount` → `0`, `testRunCount` → `0`, `teamMemberCount` → `1`
- **Save**

**17.** Trial Ending Soon 이메일 추가 (Day 11)
- Day 7 이메일 노드 하단 **"+"** → **"Wait"** → **4 days** (누적 11일)
- **"+"** → **"Send email"** → **"Create new email"**
- 이름: `Trial Ending Soon — Day 11`
- Subject: `Your Testably trial ends in 3 days`
- 본문: **위 Email C 본문 복붙**
- CTA: `Upgrade to Starter — $20/month →` / `https://testably.io/settings/billing`
- Fallback: 위와 동일 4개
- **Save**

**18.** Trial Expired 이메일 추가 (Day 14)
- Day 11 이메일 노드 하단 **"+"** → **"Wait"** → **3 days** (누적 14일)
- **"+"** → **"Send email"** → **"Create new email"**
- 이름: `Trial Expired — Day 14`
- Subject: `Your Testably trial has ended — here's what happens now`
- 본문: **위 Email D 본문 복붙** (또는 백업해둔 기존 Email #6 본문 붙여넣기 후 수정)
- CTA: `Upgrade to Starter →` / `https://testably.io/settings/billing`
- Fallback: 위와 동일 4개
- **Save**

**19.** 전체 시퀀스 확인
- Build 탭 캔버스에서 흐름 전체 확인:
  ```
  trial_started → Email A → Wait 7d → Email B → Wait 4d → Email C → Wait 3d → Email D
  ```

**20.** 우측 상단 **"Publish"** 클릭 → 시퀀스 활성화 완료

---

### PART C — Contact Properties 추가 (Trial 변수)

> Trial 이메일에서 `{{testCaseCount}}` 등 사용자 데이터 변수를 쓰려면 아래 설정 필요.
> 백엔드에서 이벤트 발송 시 함께 전달하면 자동 반영됨. 별도 추가 불필요한 경우 생략 가능.

**21.** 왼쪽 사이드바 → **Audience** → **Properties** → **"+ Add property"**

| Property 이름 | 타입 |
|--------------|------|
| `trialEndsAt` | Date |
| `testCaseCount` | Number |
| `testRunCount` | Number |
| `teamMemberCount` | Number |
| `planType` | Text |

---

## 작업 4. 개발자 전달 목록

### 4-1. `trial_started` 이벤트 호출 위치

**파일:** `src/app/settings/billing/page.tsx` (또는 Billing 담당 컴포넌트)

**"Start Starter Trial" 버튼 핸들러에 추가:**

```typescript
async function handleStartTrial() {
  const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

  // 1. DB 업데이트
  await supabase
    .from('profiles')
    .update({
      plan_type: 'trial',
      is_trial: true,
      trial_started_at: new Date().toISOString(),
      trial_ends_at: trialEndsAt.toISOString(),
      trial_ending_soon_sent: false,
      trial_expired_sent: false,
    })
    .eq('user_id', currentUser.id);

  // 2. Loops 이벤트 발송
  await sendLoopsEvent({
    email: currentUser.email,
    eventName: 'trial_started',
    eventProperties: {
      firstName: currentUser.profile.first_name ?? '',
      trialEndsAt: trialEndsAt.toISOString(),
      trialDaysTotal: 14,
      planName: 'Starter',
    },
  });

  // 3. UI 새로고침
  router.refresh();
}
```

---

### 4-2. Supabase Edge Function — `trial-ending-reminder`

**파일 위치:** `supabase/functions/trial-ending-reminder/index.ts`
**실행 주기:** 매일 00:00 UTC

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

Deno.serve(async () => {
  const now = new Date();
  const threeDaysLater = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
  const fourDaysLater = new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000);

  // 조건: trial 중 + trial_ending_soon_sent = false + trial_ends_at이 3~4일 사이
  const { data: users, error } = await supabase
    .from('profiles')
    .select('user_id, email, first_name, trial_ends_at')
    .eq('is_trial', true)
    .eq('trial_ending_soon_sent', false)
    .gte('trial_ends_at', threeDaysLater.toISOString())
    .lt('trial_ends_at', fourDaysLater.toISOString());

  if (error) {
    console.error('Query error:', error);
    return new Response(JSON.stringify({ error }), { status: 500 });
  }

  let sent = 0;
  for (const user of users ?? []) {
    // TC, Run, Team 수 조회 (getUserStats 유틸 또는 직접 쿼리)
    const [tcCount, runCount, memberCount] = await Promise.all([
      supabase.from('test_cases').select('id', { count: 'exact', head: true }).eq('owner_id', user.user_id),
      supabase.from('test_runs').select('id', { count: 'exact', head: true }).eq('owner_id', user.user_id),
      supabase.from('team_members').select('id', { count: 'exact', head: true }).eq('owner_id', user.user_id),
    ]);

    // Loops 이벤트 발송
    await fetch('https://app.loops.so/api/v1/events/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${Deno.env.get('LOOPS_API_KEY')}`,
      },
      body: JSON.stringify({
        email: user.email,
        eventName: 'trial_ending_soon',
        eventProperties: {
          firstName: user.first_name ?? '',
          trialEndsAt: user.trial_ends_at,
          daysRemaining: 3,
          testCaseCount: tcCount.count ?? 0,
          testRunCount: runCount.count ?? 0,
          teamMemberCount: memberCount.count ?? 1,
          upgradeUrl: 'https://testably.io/settings/billing',
        },
      }),
    });

    // 중복 발송 방지 플래그
    await supabase
      .from('profiles')
      .update({ trial_ending_soon_sent: true })
      .eq('user_id', user.user_id);

    sent++;
  }

  return new Response(
    JSON.stringify({ processed: users?.length ?? 0, sent }),
    { status: 200 }
  );
});
```

**Supabase Cron 등록:**
```sql
SELECT cron.schedule(
  'trial-ending-reminder',
  '0 0 * * *',
  $$SELECT net.http_post(
    url := 'https://<project-ref>.supabase.co/functions/v1/trial-ending-reminder',
    headers := '{"Authorization": "Bearer <service-role-key>"}'::jsonb
  )$$
);
```

---

### 4-3. Supabase Edge Function — `trial-expire-handler`

**파일 위치:** `supabase/functions/trial-expire-handler/index.ts`
**실행 주기:** 매일 00:00 UTC

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

Deno.serve(async () => {
  const now = new Date();

  // 조건: trial 중 + 만료일이 현재 이전 + trial_expired_sent = false
  const { data: users, error } = await supabase
    .from('profiles')
    .select('user_id, email, first_name, trial_ends_at')
    .eq('is_trial', true)
    .eq('trial_expired_sent', false)
    .lt('trial_ends_at', now.toISOString());

  if (error) {
    console.error('Query error:', error);
    return new Response(JSON.stringify({ error }), { status: 500 });
  }

  let expired = 0;
  for (const user of users ?? []) {
    // 1. TC, Run, Team 수 조회 (만료 전 마지막 스냅샷)
    const [tcCount, runCount, memberCount] = await Promise.all([
      supabase.from('test_cases').select('id', { count: 'exact', head: true }).eq('owner_id', user.user_id),
      supabase.from('test_runs').select('id', { count: 'exact', head: true }).eq('owner_id', user.user_id),
      supabase.from('team_members').select('id', { count: 'exact', head: true }).eq('owner_id', user.user_id),
    ]);

    // 2. Tier를 Free로 복귀 + 플래그 업데이트
    await supabase
      .from('profiles')
      .update({
        plan_type: 'free',
        is_trial: false,
        trial_expired_sent: true,
      })
      .eq('user_id', user.user_id);

    // 3. Loops trial_expired 이벤트 발송
    await fetch('https://app.loops.so/api/v1/events/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${Deno.env.get('LOOPS_API_KEY')}`,
      },
      body: JSON.stringify({
        email: user.email,
        eventName: 'trial_expired',
        eventProperties: {
          firstName: user.first_name ?? '',
          testCaseCount: tcCount.count ?? 0,
          testRunCount: runCount.count ?? 0,
          teamMemberCount: memberCount.count ?? 1,
          upgradeUrl: 'https://testably.io/settings/billing',
        },
      }),
    });

    expired++;
  }

  return new Response(
    JSON.stringify({ processed: users?.length ?? 0, expired }),
    { status: 200 }
  );
});
```

**Supabase Cron 등록:**
```sql
SELECT cron.schedule(
  'trial-expire-handler',
  '0 0 * * *',
  $$SELECT net.http_post(
    url := 'https://<project-ref>.supabase.co/functions/v1/trial-expire-handler',
    headers := '{"Authorization": "Bearer <service-role-key>"}'::jsonb
  )$$
);
```

---

### 4-4. profiles 테이블 마이그레이션 SQL

```sql
-- Trial 상태 관리
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS plan_type TEXT DEFAULT 'free';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_trial BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS trial_started_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS trial_ending_soon_sent BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS trial_expired_sent BOOLEAN DEFAULT FALSE;

-- 인덱스 (cron 쿼리 최적화)
CREATE INDEX IF NOT EXISTS idx_profiles_trial_status
  ON profiles (is_trial, trial_ends_at, trial_ending_soon_sent, trial_expired_sent)
  WHERE is_trial = true;
```

---

### 4-5. 환경 변수 추가

`.env.local` 및 Supabase Edge Function secrets:

```
LOOPS_API_KEY=loops_api_key_여기에_입력
```

Supabase CLI로 secret 등록:
```bash
supabase secrets set LOOPS_API_KEY=your_loops_api_key
```

---

## 최종 체크리스트

### Kyle이 Loops에서 할 작업 (30~45분 예상)

- [ ] Email #5 제목 수정 (작업 3 — Step 5)
- [ ] Email #6 본문 백업 (작업 3 — Step 6)
- [ ] Email #6 + Timer + Filter 노드 삭제 (작업 3 — Step 7~9)
- [ ] Onboarding Sequence 저장/게시 (작업 3 — Step 11)
- [ ] Trial Sequence 신규 생성 (작업 3 — Step 12~18)
- [ ] Trial Sequence 게시 (작업 3 — Step 20)
- [ ] Contact Properties 추가 (작업 3 — Step 21)

### 개발자가 할 작업

- [ ] `profiles` 테이블 마이그레이션 실행 (§ 4-4 SQL)
- [ ] `LOOPS_API_KEY` 환경 변수 추가 (§ 4-5)
- [ ] `handleStartTrial()` 핸들러에 Loops 이벤트 호출 추가 (§ 4-1)
- [ ] `trial-ending-reminder` Edge Function 배포 + cron 등록 (§ 4-2)
- [ ] `trial-expire-handler` Edge Function 배포 + cron 등록 (§ 4-3)
- [ ] 배포 후 테스트: 직접 `trial_started` 이벤트 발송 → Loops에서 수신 확인

---

**Mark, Testably Marketing**
*즉시 실행 가능한 버전 — 2026-04-08*
