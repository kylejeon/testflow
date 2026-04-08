# Testably × Loops Trial 알림 시퀀스 설정

**작성일:** 2026-04-08
**작성자:** Mark (Testably Marketing)
**우선순위:** trial_expired > trial_started > trial_ending_soon > trial_day_7

---

## 1. 이벤트 4개 정의

### 1-1. `trial_started`
**트리거 시점:** Settings > Billing에서 "Start Starter Trial" 버튼 클릭 시 즉시 호출
**우선순위:** 🔴 높음

| Property | 타입 | 예시 | 설명 |
|----------|------|------|------|
| `firstName` | string | "Kyle" | 사용자 이름 (fallback: "there") |
| `email` | string | "kyle@testably.io" | 수신 이메일 |
| `trialEndsAt` | string (ISO 8601) | "2026-04-22T00:00:00Z" | 체험 종료일 |
| `trialDaysTotal` | number | 14 | 총 체험 기간 |
| `planName` | string | "Starter" | 체험 플랜명 |

---

### 1-2. `trial_day_7`
**트리거 시점:** trial_ends_at 기준 -7일 (체험 시작 7일 후), Supabase cron 매일 실행
**우선순위:** 🟡 낮음 (nice-to-have)

| Property | 타입 | 예시 | 설명 |
|----------|------|------|------|
| `firstName` | string | "Kyle" | fallback: "there" |
| `email` | string | | |
| `trialEndsAt` | string | "2026-04-22T00:00:00Z" | 종료일 |
| `daysRemaining` | number | 7 | 남은 일수 |
| `testCaseCount` | number | 24 | 현재 TC 수 (fallback: 0) |
| `testRunCount` | number | 8 | 현재 실행 수 (fallback: 0) |
| `teamMemberCount` | number | 3 | 팀 멤버 수 (fallback: 1) |

---

### 1-3. `trial_ending_soon`
**트리거 시점:** trial_ends_at - 3일, Supabase cron 매일 실행
**우선순위:** 🟠 중간

| Property | 타입 | 예시 | 설명 |
|----------|------|------|------|
| `firstName` | string | "Kyle" | fallback: "there" |
| `email` | string | | |
| `trialEndsAt` | string | "2026-04-22T00:00:00Z" | 종료일 |
| `daysRemaining` | number | 3 | 남은 일수 |
| `testCaseCount` | number | | fallback: 0 |
| `testRunCount` | number | | fallback: 0 |
| `teamMemberCount` | number | | fallback: 1 |
| `upgradeUrl` | string | "https://testably.io/settings/billing" | 업그레이드 링크 |

---

### 1-4. `trial_expired`
**트리거 시점:** trial_ends_at < now(), Supabase cron 매일 실행 + tier Free로 복귀 처리 후 즉시 호출
**우선순위:** 🔴 최우선

| Property | 타입 | 예시 | 설명 |
|----------|------|------|------|
| `firstName` | string | "Kyle" | fallback: "there" |
| `email` | string | | |
| `testCaseCount` | number | | fallback: 0 |
| `testRunCount` | number | | fallback: 0 |
| `teamMemberCount` | number | | fallback: 1 |
| `upgradeUrl` | string | "https://testably.io/settings/billing" | |

---

## 2. 이메일 템플릿 4세트

---

### 📧 Email 1 — `trial_started` (즉시 발송)

**제목 A:**
```
Your 14-day Testably Starter trial has started
```
**제목 B:**
```
{{firstName}}, your Starter trial is live — here's how to make the most of it
```

**본문:**
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

[Go to Testably →]

If you have any questions during the trial, just reply to this email. I read every message.

— Kyle
Founder, Testably
```

**CTA 버튼:** `Go to Testably →` → `https://testably.io/dashboard`
**Fallback values:** firstName → `there`, trialEndsAt → `in 14 days`

---

### 📧 Email 2 — `trial_day_7` (7일차 중간 점검)

**제목 A:**
```
You're halfway through your Testably trial — 7 days left
```
**제목 B:**
```
{{firstName}}, your trial snapshot (+ what happens next)
```

**본문:**
```
Hi {{firstName}},

You're halfway through your 14-day Testably Starter trial. Here's what you've built so far:

{{testCaseCount}} test cases · {{testRunCount}} test runs · {{teamMemberCount}} team members

You have 7 days left with full Starter access. Here's what happens when the trial ends:

**Keep it going — Upgrade to Starter**
$20/month for the whole team. Everything you've built stays exactly as-is.

[Upgrade to Starter →]

**Switch to Free**
3 projects, 5 team members, forever. Your data is safe — you'll just move to a smaller workspace.

**Do nothing**
Your account moves to Free automatically. No data deleted, no surprises.

---

How's the trial going so far? If something isn't clicking, reply now — there's still time to fix it.

— Kyle
Founder, Testably
```

**CTA 버튼:** `Upgrade to Starter →` → `https://testably.io/settings/billing`
**Fallback values:** firstName → `there`, testCaseCount → `0`, testRunCount → `0`, teamMemberCount → `1`

---

### 📧 Email 3 — `trial_ending_soon` (종료 3일 전)

**제목 A:**
```
Your Testably trial ends in 3 days
```
**제목 B:**
```
{{firstName}}, 3 days left on your Starter trial
```

**본문:**
```
Hi {{firstName}},

Your Testably Starter trial ends in 3 days.

Here's what you've built:

{{testCaseCount}} test cases · {{testRunCount}} test runs · {{teamMemberCount}} team members

After the trial ends, your account moves to the Free plan automatically. No data is deleted.

But if you want to keep everything — unlimited projects, Jira integration, advanced reporting — upgrading takes 30 seconds:

[Upgrade to Starter — $20/month →]

**What's on the Free plan:**
- 3 projects
- 5 team members
- Unlimited test cases
- No Jira integration
- No milestone dashboards

If you have questions about which plan fits your team, just reply. Happy to help.

— Kyle
Founder, Testably
```

**CTA 버튼:** `Upgrade to Starter — $20/month →` → `https://testably.io/settings/billing`
**Fallback values:** firstName → `there`, testCaseCount → `0`, testRunCount → `0`, teamMemberCount → `1`

---

### 📧 Email 4 — `trial_expired` (종료 당일)

**제목 A:**
```
Your Testably trial has ended — here's what happens now
```
**제목 B:**
```
{{firstName}}, your trial is up. Here's what you've built.
```

**본문:**
```
Hi {{firstName}},

Your 14-day Testably Starter trial has ended. Here's what you built during that time:

{{testCaseCount}} test cases · {{testRunCount}} test runs · {{teamMemberCount}} team members

Your account has moved to the Free plan. Your data is safe — nothing has been deleted.

But if you want to keep using everything you had during the trial, upgrading takes 30 seconds:

**Starter — $20/month for the whole team**
- Unlimited projects & team members
- Jira integration
- Advanced reporting & milestone dashboards
- Priority support

[Upgrade to Starter →]

If the Free plan works for you, no action needed. You can upgrade anytime.

---

One last thing — how was the trial? What worked, what didn't? Hit reply and tell me. Even a one-liner helps us improve.

— Kyle
Founder, Testably
```

**CTA 버튼:** `Upgrade to Starter →` → `https://testably.io/settings/billing`
**Fallback values:** firstName → `there`, testCaseCount → `0`, testRunCount → `0`, teamMemberCount → `1`

---

## 3. Loops 대시보드 설정 가이드 (Kyle이 직접 실행)

### Step 1. Contact Properties 추가

**Loops → Audience → Contact Properties → Add Property**

| Property 이름 | 타입 | 설명 |
|--------------|------|------|
| `trialEndsAt` | Date | 체험 종료일 |
| `trialDaysTotal` | Number | 총 체험 기간 (14) |
| `daysRemaining` | Number | 남은 일수 |
| `planType` | Text | "free" / "trial" / "starter" / "pro" |
| `testCaseCount` | Number | 현재 TC 수 |
| `testRunCount` | Number | 현재 실행 수 |
| `teamMemberCount` | Number | 팀 멤버 수 |
| `upgradeUrl` | Text | 업그레이드 링크 |

---

### Step 2. 이벤트 4개 등록

**Loops → Events → Create Event**

순서대로 등록:
```
1. trial_started
2. trial_day_7
3. trial_ending_soon
4. trial_expired
```

각 이벤트 등록 시:
- Event Name: snake_case 그대로 입력
- Description: 위 섹션 1의 트리거 시점 설명 복붙

---

### Step 3. 이메일 템플릿 4개 생성

**Loops → Emails → Create Email**

각 이메일마다:
1. Name: `Trial Started`, `Trial Day 7`, `Trial Ending Soon`, `Trial Expired`
2. Subject: 위 섹션 2의 제목 A 입력 (A/B 테스트 원하면 제목 B도 추가)
3. From Name: `Kyle from Testably`
4. Reply-To: Kyle 개인 이메일 (답장 받을 수 있도록)
5. 본문: 위 섹션 2의 내용 복붙
6. Fallback values 설정 (아래 참고)

**Fallback values 설정 위치:**
각 이메일 편집 화면 → Variables 패널 → 각 변수 옆 fallback 입력

| Variable | Fallback |
|----------|----------|
| `firstName` | `there` |
| `testCaseCount` | `0` |
| `testRunCount` | `0` |
| `teamMemberCount` | `1` |
| `trialEndsAt` | `soon` |
| `daysRemaining` | `a few` |

---

### Step 4. 시퀀스 연결

**Loops → Loops → Create Loop**

**Loop 1: Trial Welcome (즉시)**
```
Trigger: Event → trial_started
Action: Send Email → "Trial Started"
Delay: 0 (즉시)
```

**Loop 2: Trial Day 7 (선택)**
```
Trigger: Event → trial_started
Action: Wait 7 days → Send Email → "Trial Day 7"
```
> trial_day_7 이벤트를 백엔드에서 보내도 되고,
> trial_started 후 7일 delay로 Loops에서 처리해도 됩니다.
> 후자가 더 단순합니다.

**Loop 3: Trial Ending Soon**
```
Trigger: Event → trial_ending_soon
Action: Send Email → "Trial Ending Soon"
Delay: 0 (즉시)
```

**Loop 4: Trial Expired**
```
Trigger: Event → trial_expired
Action: Send Email → "Trial Expired"
Delay: 0 (즉시)
```

---

### Step 5. 기존 Onboarding Sequence와 충돌 방지

현재 "Testably Onboarding Sequence"가 user_signup을 트리거로 사용 중입니다.
Trial 유저는 user_signup 이후 trial_started가 별도로 호출됩니다.

**충돌 방지 설정:**
- Onboarding Sequence에 조건 추가: `planType is not "trial"` 또는
- Trial 유저는 Onboarding Sequence를 suppress 처리 (Loops의 Loop 설정에서 Audience filter 사용)

가장 단순한 방법: Trial 시작 시 Onboarding Sequence를 중단하는 것.
Loops에서 "Unsubscribe from Loop" 액션을 trial_started 이벤트에 추가.

---

## 4. Dev에게 전달할 코드 작업 목록

### 4-1. `src/lib/loops.ts`에 추가할 함수

```typescript
// =============================================
// TRIAL EVENTS
// =============================================

/**
 * trial_started
 * 호출 위치: Settings > Billing > "Start Starter Trial" 버튼 클릭 핸들러
 * 호출 시점: trial 시작 처리(DB 업데이트) 완료 직후
 */
export async function sendTrialStartedEvent(userId: string) {
  const user = await getUserWithProfile(userId);
  
  return sendLoopsEvent({
    userId: user.id,
    email: user.email,
    eventName: 'trial_started',
    eventProperties: {
      firstName: user.profile.first_name ?? '',
      trialEndsAt: user.profile.trial_ends_at, // ISO 8601
      trialDaysTotal: 14,
      planName: 'Starter',
    },
  });
}

/**
 * trial_day_7
 * 호출 위치: Supabase Edge Function (cron, 매일 00:00 UTC)
 * 조건: is_trial = true AND trial_started_at = now() - 7 days
 * 선택사항 — Loops에서 trial_started + 7일 delay로 처리해도 됨
 */
export async function sendTrialDay7Event(userId: string) {
  const user = await getUserWithProfile(userId);
  const stats = await getUserStats(userId); // TC, Run, Member 수

  return sendLoopsEvent({
    userId: user.id,
    email: user.email,
    eventName: 'trial_day_7',
    eventProperties: {
      firstName: user.profile.first_name ?? '',
      trialEndsAt: user.profile.trial_ends_at,
      daysRemaining: 7,
      testCaseCount: stats.testCaseCount,
      testRunCount: stats.testRunCount,
      teamMemberCount: stats.teamMemberCount,
    },
  });
}

/**
 * trial_ending_soon
 * 호출 위치: Supabase Edge Function (cron, 매일 00:00 UTC)
 * 조건: is_trial = true AND trial_ends_at BETWEEN now() AND now() + 3 days
 * 중복 방지: trial_ending_soon_sent = false인 경우만 발송 후 true로 업데이트
 */
export async function sendTrialEndingSoonEvent(userId: string) {
  const user = await getUserWithProfile(userId);
  const stats = await getUserStats(userId);

  return sendLoopsEvent({
    userId: user.id,
    email: user.email,
    eventName: 'trial_ending_soon',
    eventProperties: {
      firstName: user.profile.first_name ?? '',
      trialEndsAt: user.profile.trial_ends_at,
      daysRemaining: 3,
      testCaseCount: stats.testCaseCount,
      testRunCount: stats.testRunCount,
      teamMemberCount: stats.teamMemberCount,
      upgradeUrl: 'https://testably.io/settings/billing',
    },
  });
}

/**
 * trial_expired
 * 호출 위치: Supabase Edge Function (cron, 매일 00:00 UTC)
 * 조건: is_trial = true AND trial_ends_at < now()
 * 순서: 1) tier를 Free로 복귀 2) is_trial = false 3) 이 함수 호출
 * 중복 방지: trial_expired_sent = false인 경우만
 */
export async function sendTrialExpiredEvent(userId: string) {
  const user = await getUserWithProfile(userId);
  const stats = await getUserStats(userId);

  return sendLoopsEvent({
    userId: user.id,
    email: user.email,
    eventName: 'trial_expired',
    eventProperties: {
      firstName: user.profile.first_name ?? '',
      testCaseCount: stats.testCaseCount,
      testRunCount: stats.testRunCount,
      teamMemberCount: stats.teamMemberCount,
      upgradeUrl: 'https://testably.io/settings/billing',
    },
  });
}
```

---

### 4-2. Supabase Edge Function — Trial Cron

**파일 위치:** `supabase/functions/trial-cron/index.ts`
**실행 주기:** 매일 00:00 UTC (Supabase Cron 설정)

```typescript
import { createClient } from '@supabase/supabase-js';
import {
  sendTrialDay7Event,
  sendTrialEndingSoonEvent,
  sendTrialExpiredEvent,
} from '../../src/lib/loops';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

Deno.serve(async () => {
  const now = new Date();
  const in3Days = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

  // 1. trial_ending_soon: 3일 이내 만료 예정이고 아직 발송 안 된 유저
  const { data: endingSoonUsers } = await supabase
    .from('profiles')
    .select('user_id')
    .eq('is_trial', true)
    .eq('trial_ending_soon_sent', false)
    .gte('trial_ends_at', now.toISOString())
    .lte('trial_ends_at', in3Days.toISOString());

  for (const user of endingSoonUsers ?? []) {
    await sendTrialEndingSoonEvent(user.user_id);
    await supabase
      .from('profiles')
      .update({ trial_ending_soon_sent: true })
      .eq('user_id', user.user_id);
  }

  // 2. trial_expired: 만료됐는데 아직 처리 안 된 유저
  const { data: expiredUsers } = await supabase
    .from('profiles')
    .select('user_id')
    .eq('is_trial', true)
    .eq('trial_expired_sent', false)
    .lt('trial_ends_at', now.toISOString());

  for (const user of expiredUsers ?? []) {
    // tier Free로 복귀
    await supabase
      .from('profiles')
      .update({
        tier: 1,          // Free tier
        is_trial: false,
        trial_expired_sent: true,
      })
      .eq('user_id', user.user_id);

    await sendTrialExpiredEvent(user.user_id);
  }

  return new Response(JSON.stringify({
    endingSoon: endingSoonUsers?.length ?? 0,
    expired: expiredUsers?.length ?? 0,
  }), { status: 200 });
});
```

---

### 4-3. profiles 테이블에 추가할 컬럼

```sql
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_trial BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS trial_started_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS trial_ending_soon_sent BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS trial_expired_sent BOOLEAN DEFAULT FALSE;
```

---

### 4-4. "Start Starter Trial" 버튼 핸들러 추가 위치

**파일:** `src/app/settings/billing/page.tsx` (또는 해당 컴포넌트)

```typescript
async function handleStartTrial() {
  // 1. DB 업데이트
  const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
  
  await supabase
    .from('profiles')
    .update({
      tier: 2,                              // Starter tier
      is_trial: true,
      trial_started_at: new Date().toISOString(),
      trial_ends_at: trialEndsAt.toISOString(),
      trial_ending_soon_sent: false,
      trial_expired_sent: false,
    })
    .eq('user_id', currentUser.id);

  // 2. Loops 이벤트 발송
  await sendTrialStartedEvent(currentUser.id);

  // 3. UI 업데이트
  router.refresh();
}
```

---

## 5. 구현 우선순위 및 체크리스트

### Phase 1 — 최우선 (이번 주)
- [ ] `profiles` 테이블 컬럼 추가 (SQL 마이그레이션)
- [ ] `sendTrialStartedEvent` 구현 + "Start Trial" 버튼에 연결
- [ ] `sendTrialExpiredEvent` 구현
- [ ] Supabase cron Edge Function 배포 (trial_expired 처리만)
- [ ] Loops: `trial_started`, `trial_expired` 이벤트 등록
- [ ] Loops: Email 1 (Trial Started), Email 4 (Trial Expired) 생성
- [ ] Loops: Loop 1, Loop 4 연결

### Phase 2 — 이번 달 안
- [ ] `sendTrialEndingSoonEvent` 구현 + cron에 추가
- [ ] Loops: `trial_ending_soon` 이벤트 + Email 3 + Loop 3

### Phase 3 — 선택사항
- [ ] `trial_day_7` 이벤트 (Loops delay 방식으로 처리하면 코드 불필요)
- [ ] Loops: Email 2 (Trial Day 7) + Loop 2

---

## 6. 요약

| 이벤트 | 우선순위 | 코드 작업 | Loops 작업 |
|--------|---------|---------|-----------|
| `trial_started` | 🔴 최우선 | 버튼 핸들러에 함수 추가 | 이벤트 등록 + 이메일 + Loop |
| `trial_expired` | 🔴 최우선 | cron Edge Function | 이벤트 등록 + 이메일 + Loop |
| `trial_ending_soon` | 🟠 중간 | cron에 추가 | 이벤트 등록 + 이메일 + Loop |
| `trial_day_7` | 🟡 낮음 | 선택 (Loops delay 방식 권장) | Loop에 7일 delay 추가만 |

**가장 빠른 구현 경로:**
1. DB 컬럼 추가 → 2. trial_started 연결 → 3. trial_expired cron 배포 → 4. Loops 설정
이 4단계만 해도 trial 플로우의 핵심이 완성됩니다.

---

**Mark, Testably Marketing**
