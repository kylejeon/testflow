# Testably × Loops 이메일 마스터 플랜

**작성일:** 2026-04-08 (PM Onboarding_Strategy.md v1 반영)
**작성자:** Mark (Testably Marketing)
**참고 문서:** `pm/Onboarding_Strategy.md`, `mark/Loops_Trial_Sequence.md`
**문서 목적:** Onboarding Sequence + Trial Sequence 통합 관리 기준서 (Single Source of Truth)

---

## 1. PM 전략 요약 (pm/Onboarding_Strategy.md § 6)

PM이 정의한 이메일 시퀀스 트리거 조건 & 분기:

| Day | 트리거 | 목적 | PM 정의 분기 |
|-----|--------|------|-------------|
| 0 | Signup 즉시 | Welcome + Quick start | 분기 없음 |
| 1 | Signup +24h | 첫 TC 작성 독려 | TC 이미 작성 → AI generation 변형 발송 |
| 3 | Signup +72h | Pro tip: AI 기능 소개 | Run 완료자 → "팀 초대" 변형 발송 |
| 7 | Signup +7d | 팀 초대 유도 | 팀 초대 완료자 → "Connect Jira" 변형 발송 |
| 14 | Signup +14d | 피드백 요청 + NPS lite | Inactive 7일+ → 재활성화 카피 변형 |

**PM이 정의한 Loops 트리거 이벤트 (Supabase webhook 연동):**
- `user.signed_up` — Signup 즉시
- `onboarding.tc_created` — 첫 TC 작성 완료
- `onboarding.run_completed` — 첫 Run 실행 완료
- `onboarding.team_invited` — 팀 멤버 초대 완료
- `onboarding.integration_connected` — Jira/GitHub 연동 완료

> Mark 담당: 5개 이메일 카피 + NPS lite 질문 1개 + Loops 캠페인 트리거 이벤트 매핑 검토

---

## 2. 현재 Loops 설정 vs PM 제안 비교

### 2-1. 변경 결정 요약

| 현재 Loops 설정 | PM 제안 | 변경 결정 | 작업 내용 |
|----------------|---------|---------|---------|
| Day 0 — Welcome | Day 0 — Welcome | ✅ 유지 | 내용 검토 완료, 수정 불필요 |
| Day 1 — First TC nudge | Day 1 — First TC nudge | ✅ 유지 + 분기 추가 | 조건 분기 추가 (§ 4-2 참고) |
| **Day 2** — AI generation | **Day 3** — AI generation | 🔶 **delay 변경** | +2일 → +3일로 타이밍 조정 |
| **Day 4** — [내용 미확인] | 없음 | 🔴 **삭제** | PM 시퀀스에 없음 → 삭제 권장 |
| Day 7 — Team invite | Day 7 — Team invite | ✅ 유지 + 분기 추가 | 조건 분기 추가 (§ 4-5 참고) |
| 없음 | **Day 14** — Feedback/NPS | 🟢 **신규 추가** | 이메일 신규 작성 필요 |

> **Day 4 삭제 전 확인:** Loops에서 +4일 이메일 내용을 Kyle이 직접 확인 후 삭제 진행 권장. 내용이 유효하다면 Day 3(AI)과 Day 7(팀 초대) 사이 어느 포인트에 배치할지 PM과 재논의.

### 2-2. 최종 확정 시퀀스

```
Onboarding Sequence (user_signup 트리거, 전체 사용자)
├── Day  0  Welcome (즉시) ─────────── ✅ 운영 중, 유지
├── Day  1  First TC nudge ──────────── ✅ 운영 중, 분기 추가
├── Day  3  AI generation ──────────── 🔶 현재 +2일 → +3일로 조정
├── Day  7  Team invite ────────────── ✅ 운영 중, 분기 추가
└── Day 14  Feedback + NPS ─────────── 🟢 신규 추가

Trial Sequence (trial_started 등 별도 이벤트, Trial 사용자)
├── trial_started   Trial Welcome ──── ❌ 미구현
├── trial_day_7     Halfway ─────────── ❌ 미구현
├── trial_ending_soon 3일 전 ────────── ❌ 미구현
└── trial_expired   만료 안내 ────────── ❌ 미구현
```

---

## 3. 행동 기반 분기 설계 (PM § 6 분기 구현)

PM이 요구한 분기를 Loops에서 구현하는 방법:

### 방법: Contact Properties 활용

Loops에서 각 온보딩 완료 시점에 Contact Property를 업데이트하고,
이메일 발송 조건으로 활용한다.

**추가 필요한 Contact Properties:**

| Property | 타입 | 설명 | 값 |
|----------|------|------|-----|
| `hasCreatedTC` | Boolean | 첫 TC 작성 여부 | true / false |
| `hasCompletedRun` | Boolean | 첫 Run 완료 여부 | true / false |
| `hasInvitedTeam` | Boolean | 팀 초대 완료 여부 | true / false |
| `hasConnectedIntegration` | Boolean | Jira/GitHub 연동 여부 | true / false |
| `lastActivityAt` | Date | 마지막 활동 시간 | ISO 8601 |
| `planType` | Text | "free" / "trial" / "starter" / "pro" | |

**분기 조건 적용:**

| 이메일 | 기본 버전 조건 | 변형 버전 조건 | 변형 내용 |
|--------|-------------|-------------|---------|
| Day 1 | `hasCreatedTC = false` | `hasCreatedTC = true` | AI generation 소개로 교체 |
| Day 3 | `hasCompletedRun = false` | `hasCompletedRun = true` | 팀 초대 독려로 교체 |
| Day 7 | `hasInvitedTeam = false` | `hasInvitedTeam = true` | Jira/GitHub 연동 안내로 교체 |
| Day 14 | `lastActivityAt ≥ signup - 7d` | `lastActivityAt < signup - 7d` | 재활성화 카피로 교체 |

**Loops 설정 방법 (Day 1 예시):**
```
Loop: Onboarding Day 1
Trigger: user_signup + 1 day
  ├── Condition: hasCreatedTC = false → Send "Day 1: First TC nudge"
  └── Condition: hasCreatedTC = true  → Send "Day 1: AI Generation Tip (variant)"
```

---

## 4. 이메일 템플릿 전체

> **Day 0, Day 1, Day 3(현 Day 2), Day 7은 이전 검토 완료.**
> 이 섹션은 수정/추가가 필요한 이메일과 변형 버전을 수록한다.

---

### 📧 Day 1 — 변형 B: "AI Generation Tip" (hasCreatedTC = true인 유저)

**조건:** 가입 1일 후 + 이미 TC를 작성한 활성 유저
**제목 A:** `Nice work on your first test case — here's what to do next`
**제목 B:** `{{firstName}}, you're already ahead of most users`

**본문:**
```
Hi {{firstName}},

You've already created your first test case. That puts you ahead of the curve.

Here's a tip most users discover on Day 7: AI test case generation.

Instead of writing test cases step by step, you can describe what you want to test in plain English — and Testably generates a full test case with steps and expected results in seconds.

Try it:
→ Open any project → New Test Case → "Generate with AI"
→ Type: "User logs in with incorrect password"
→ Watch it build the test case for you.

It works best for repetitive scenarios where you know what to test but don't want to type it all out.

[Try AI Generation →]

— Kyle
Founder, Testably
```

**CTA:** `Try AI Generation →` → `https://testably.io/dashboard`
**Fallback:** `firstName` → `there`

---

### 📧 Day 3 — 변형 B: "Team Invite" (hasCompletedRun = true인 유저)

**조건:** 가입 3일 후 + 이미 Run을 완료한 유저
**제목 A:** `You've run your first test — your team should see this`
**제목 B:** `{{firstName}}, ready to bring in your team?`

**본문:**
```
Hi {{firstName}},

You've already created and run test cases. The hard part is done.

Now the question is: are you doing this alone, or does your team know about it?

Testably works best when the whole QA team is in one place. Here's what your teammates get when you invite them:

✓ Shared test cases — no more emailing spreadsheets
✓ Parallel test runs — split the workload
✓ One dashboard — everyone sees pass/fail in real time

Inviting takes 10 seconds:
Settings → Team Members → Invite

[Invite Your Team →]

— Kyle
Founder, Testably
```

**CTA:** `Invite Your Team →` → `https://testably.io/settings/team`
**Fallback:** `firstName` → `there`

---

### 📧 Day 7 — 변형 B: "Connect Jira" (hasInvitedTeam = true인 유저)

**조건:** 가입 7일 후 + 이미 팀 초대를 완료한 유저
**제목 A:** `One more thing — connect Jira and close the loop`
**제목 B:** `{{firstName}}, your team is in. Now connect Jira.`

**본문:**
```
Hi {{firstName}},

Your team is in Testably. Now let's connect it to where bugs actually get fixed.

When you connect Jira, every test case marked Fail automatically creates a Jira issue — no copy-pasting, no manual triage.

Your QA team logs failures → Dev team sees them in Jira instantly → nothing falls through the cracks.

Setup takes about 60 seconds:
Settings → Integrations → Jira → Connect

[Connect Jira →]

Don't use Jira? We also support GitHub Issues. Same one-click flow.

— Kyle
Founder, Testably
```

**CTA:** `Connect Jira →` → `https://testably.io/settings/integrations`
**Fallback:** `firstName` → `there`

---

### 📧 Day 14 — 기본: "Feedback + NPS lite" (신규 추가)

**조건:** 가입 14일 후 + 최근 7일 이내 활동 있는 유저 (`lastActivityAt ≥ now - 7d`)
**제목 A:** `Two weeks in — one quick question`
**제목 B:** `{{firstName}}, what would you change about Testably?`

**본문:**
```
Hi {{firstName}},

You've been using Testably for two weeks now.

One question — on a scale of 0–10, how likely are you to recommend Testably to a colleague?

[0 — Not likely]   [5 — Maybe]   [10 — Definitely]
→ (링크로 처리: 각 숫자가 응답 URL로 연결)

That's it. One click. Takes 3 seconds.

If you have more to say — what's working, what's frustrating, what's missing — just reply to this email. I read every message.

And if you haven't tried everything yet:

→ AI Test Case Generation: New TC → Generate with AI
→ Jira Integration: Settings → Integrations
→ Requirements Traceability: Project → Requirements tab

— Kyle
Founder, Testably
```

**CTA:** 각 NPS 숫자(0, 5, 10) → `https://testably.io/feedback?score={n}&uid={{userId}}`
**Fallback:** `firstName` → `there`

> **구현 메모:** NPS 응답 URL은 간단한 landing page 또는 Loops form으로 처리 가능. 초기 MVP는 Google Form 링크로 대체해도 무방.

---

### 📧 Day 14 — 변형 B: "Re-activation" (Inactive 7일+ 유저)

**조건:** 가입 14일 후 + 최근 7일 이상 로그인 없음 (`lastActivityAt < now - 7d`)
**제목 A:** `It's been a while — still there?`
**제목 B:** `{{firstName}}, Testably misses you`

**본문:**
```
Hi {{firstName}},

You signed up for Testably two weeks ago and haven't been back in a while.

That's okay. Life gets busy.

But before you go — a quick question: was there something that didn't click? Something confusing, or missing?

If you hit a wall early on, I'd genuinely like to know. Reply to this email with one sentence. Even "I didn't have time" is helpful.

If you want to pick up where you left off, here's the fastest path back:

→ [Log back in →]

Your account and data are still there. Nothing's been deleted.

— Kyle
Founder, Testably
```

**CTA:** `Log back in →` → `https://testably.io/login`
**Fallback:** `firstName` → `there`

---

### 📧 Trial 이메일 4종

Trial 이메일의 전체 본문/CTA/Fallback은 `mark/Loops_Trial_Sequence.md`를 참고.
이 문서에는 Trial 시퀀스의 위치 관계만 정리한다.

| 이메일 | 이벤트 | 내용 | 상세 위치 |
|--------|--------|------|---------|
| Trial Welcome | `trial_started` 즉시 | 14일 체험 안내 + 48시간 할일 | Loops_Trial_Sequence.md § 2, Email 1 |
| Trial Halfway | `trial_day_7` | 7일 경과 현황 + 업그레이드 옵션 | Loops_Trial_Sequence.md § 2, Email 2 |
| Trial Ending Soon | `trial_ending_soon` | 3일 전 전환 유도 | Loops_Trial_Sequence.md § 2, Email 3 |
| Trial Expired | `trial_expired` | 만료 + Free 복귀 안내 | Loops_Trial_Sequence.md § 2, Email 4 |

---

## 5. Loops 대시보드 설정 — Kyle이 직접 실행할 단계

### Step 1. Contact Properties 추가

**Loops → Audience → Contact Properties → Add Property**

**신규 추가 (PM 분기 구현용):**

| Property 이름 | 타입 | 기본값 | 설명 |
|--------------|------|--------|------|
| `hasCreatedTC` | Boolean | false | 첫 TC 작성 완료 여부 |
| `hasCompletedRun` | Boolean | false | 첫 Run 완료 여부 |
| `hasInvitedTeam` | Boolean | false | 팀 초대 완료 여부 |
| `hasConnectedIntegration` | Boolean | false | Jira/GitHub 연동 여부 |
| `lastActivityAt` | Date | — | 마지막 로그인/활동 시간 |
| `planType` | Text | "free" | "free" / "trial" / "starter" / "pro" |

**Trial 시퀀스용 (이미 추가했다면 생략):**

| Property 이름 | 타입 | 설명 |
|--------------|------|------|
| `trialEndsAt` | Date | 체험 종료일 |
| `trialDaysTotal` | Number | 총 체험 기간 (14) |
| `daysRemaining` | Number | 남은 일수 |
| `testCaseCount` | Number | 현재 TC 수 |
| `testRunCount` | Number | 현재 실행 수 |
| `teamMemberCount` | Number | 팀 멤버 수 |
| `upgradeUrl` | Text | 업그레이드 링크 |

---

### Step 2. Onboarding Sequence 수정

**Loops → Loops → "Testably Onboarding Sequence" → 편집**

**변경 사항:**

| 단계 | 현재 설정 | 수행할 작업 |
|------|---------|------------|
| +2일 (AI generation) | delay: 2일 | **delay를 3일로 변경** |
| +4일 | 불명 내용 | **삭제** (내용 확인 후) |
| +7일 (Team invite) | 단일 버전 | **조건 분기 추가** (§ 3 참고) |
| +14일 | 없음 | **신규 단계 추가** |

**Step 2-A: +2일 → +3일 변경**
1. "wait 2 days" 단계 클릭 → delay 수정 → 3 days로 변경 → 저장

**Step 2-B: +4일 삭제**
1. Loops에서 +4일 이메일 내용 확인 (삭제 전 백업 권장)
2. 단계 삭제

**Step 2-C: +7일 분기 추가**
1. "wait 7 days" 단계 이후에 Condition 노드 추가:
   - `hasInvitedTeam = false` → Send "Day 7: Team Invite (기본)"
   - `hasInvitedTeam = true` → Send "Day 7: Connect Jira (변형)"

**Step 2-D: +14일 신규 추가**
1. 마지막에 "wait 14 days" 단계 추가 (가입일 기준 누적 14일)
2. Condition 추가:
   - `lastActivityAt ≥ 7일 전` → Send "Day 14: Feedback + NPS"
   - `lastActivityAt < 7일 전` → Send "Day 14: Re-activation"

**Step 2-E: Trial Exit 설정**
1. Sequence에 트리거 추가: `trial_started` 이벤트 발생 시 → "Remove from this Loop"
2. 이렇게 하면 Trial 시작 시점 이후 Onboarding Day 7/14 이메일이 중단됨

---

### Step 3. 신규 이메일 템플릿 생성

**Loops → Emails → Create Email**

| 이메일 이름 | 기반 이벤트 | 제목 | 본문 출처 |
|------------|-----------|------|---------|
| Onboarding Day 1 — AI Variant | user_signup +1d (variant) | `Nice work on your first test case...` | § 4, Day 1 변형 B |
| Onboarding Day 3 — Team Variant | user_signup +3d (variant) | `You've run your first test...` | § 4, Day 3 변형 B |
| Onboarding Day 7 — Jira Variant | user_signup +7d (variant) | `One more thing — connect Jira...` | § 4, Day 7 변형 B |
| Onboarding Day 14 — Feedback | user_signup +14d | `Two weeks in — one quick question` | § 4, Day 14 기본 |
| Onboarding Day 14 — Re-activation | user_signup +14d (variant) | `It's been a while — still there?` | § 4, Day 14 변형 B |

각 이메일 생성 시:
- From Name: `Kyle from Testably`
- Reply-To: Kyle 개인 이메일
- Fallback: `firstName` → `there`

---

### Step 4. Trial 시퀀스 신규 생성

Trial 이메일 4종 및 Loop 설정은 `mark/Loops_Trial_Sequence.md` § 3~4 참고.

---

### Step 5. 이벤트 등록 (Loops Events)

**Loops → Events → Create Event**

| 이벤트 이름 | 트리거 시점 | 목적 |
|------------|-----------|------|
| `onboarding.tc_created` | 첫 TC 저장 시 | `hasCreatedTC` 업데이트 + Day 1 분기 |
| `onboarding.run_completed` | 첫 Run 결과 1건 이상 입력 시 | `hasCompletedRun` 업데이트 + Day 3 분기 |
| `onboarding.team_invited` | 팀 멤버 초대 완료 시 | `hasInvitedTeam` 업데이트 + Day 7 분기 |
| `onboarding.integration_connected` | Jira/GitHub 연동 완료 시 | `hasConnectedIntegration` 업데이트 |
| `trial_started` | Trial 시작 시 | Trial 시퀀스 시작 + Onboarding Exit |
| `trial_ending_soon` | Trial 종료 3일 전 | Trial 알림 |
| `trial_expired` | Trial 종료 당일 | Trial 만료 처리 |

---

## 6. Dev 전달 — 추가 코드 작업

### Onboarding 이벤트 emit (PM P1 우선순위)

`src/lib/loops.ts`에 추가:

```typescript
// =============================================
// ONBOARDING EVENTS (PM Onboarding_Strategy § 6)
// =============================================

/**
 * onboarding.tc_created
 * 호출 위치: TC 저장 성공 핸들러 (처음 생성 시 1회만)
 * 조건: profiles.has_created_tc = false인 경우만 emit 후 true로 업데이트
 */
export async function sendOnboardingTCCreatedEvent(userId: string) {
  const user = await getUserWithProfile(userId);
  if (user.profile.has_created_tc) return; // 이미 발송됨

  // Loops Contact Property 업데이트
  await updateLoopsContact(user.email, { hasCreatedTC: true });
  
  // DB 업데이트
  await supabase
    .from('profiles')
    .update({ has_created_tc: true })
    .eq('user_id', userId);
}

/**
 * onboarding.run_completed
 * 호출 위치: Run 결과 저장 시 (첫 번째 Pass/Fail 기록 시)
 * 조건: profiles.has_completed_run = false인 경우만
 */
export async function sendOnboardingRunCompletedEvent(userId: string) {
  const user = await getUserWithProfile(userId);
  if (user.profile.has_completed_run) return;

  await updateLoopsContact(user.email, { hasCompletedRun: true });
  await supabase
    .from('profiles')
    .update({ has_completed_run: true })
    .eq('user_id', userId);
}

/**
 * onboarding.team_invited
 * 호출 위치: 팀 멤버 초대 이메일 발송 성공 시
 */
export async function sendOnboardingTeamInvitedEvent(userId: string) {
  const user = await getUserWithProfile(userId);
  if (user.profile.has_invited_team) return;

  await updateLoopsContact(user.email, { hasInvitedTeam: true });
  await supabase
    .from('profiles')
    .update({ has_invited_team: true })
    .eq('user_id', userId);
}

/**
 * onboarding.integration_connected
 * 호출 위치: Jira/GitHub integration 연동 완료 시
 */
export async function sendOnboardingIntegrationConnectedEvent(userId: string) {
  const user = await getUserWithProfile(userId);
  if (user.profile.has_connected_integration) return;

  await updateLoopsContact(user.email, { hasConnectedIntegration: true });
  await supabase
    .from('profiles')
    .update({ has_connected_integration: true })
    .eq('user_id', userId);
}
```

### profiles 테이블 추가 컬럼 (온보딩 상태)

```sql
-- Onboarding progress flags
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS has_created_tc BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS has_completed_run BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS has_invited_team BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS has_connected_integration BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMPTZ;

-- Trial columns (기존 Loops_Trial_Sequence.md에서 추가 예정)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_trial BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS trial_started_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS trial_ending_soon_sent BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS trial_expired_sent BOOLEAN DEFAULT FALSE;

-- Plan type
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS plan_type TEXT DEFAULT 'free';
```

---

## 7. 전체 이메일 여정 시각화

```
신규 가입자
│
Day 0 ─── Welcome ────────────────────────────────── 전원
│
Day 1 ─┬─ hasCreatedTC = false → First TC Nudge ──── 비활성
│      └─ hasCreatedTC = true  → AI Generation Tip ─ 활성
│
Day 3 ─┬─ hasCompletedRun = false → AI Tip ────────── 미실행
│      └─ hasCompletedRun = true  → Team Invite ────── Run 완료자
│
│   [Trial 시작 시 → Onboarding Exit, Trial 시퀀스로 이동]
│   ├── trial_started    → Trial Welcome (즉시)
│   ├── trial_day_7      → Trial Halfway (+7일)
│   ├── trial_ending_soon→ 3일 전 경고
│   └── trial_expired    → 만료 안내
│
Day 7 ─┬─ hasInvitedTeam = false → Team Invite ────── (Trial 제외)
│      └─ hasInvitedTeam = true  → Connect Jira ────── 팀 있는 유저
│
Day 14 ┬─ lastActivityAt ≥ 7일 전 → Feedback + NPS ── 활성 유저
       └─ lastActivityAt < 7일 전 → Re-activation ──── Inactive
```

---

## 8. 구현 우선순위 체크리스트

### Phase 1 — 즉시 (이번 주) — Trial 핵심

**Loops 대시보드:**
- [ ] `planType` Contact Property 추가
- [ ] `trial_started`, `trial_expired` 이벤트 등록
- [ ] Trial Started / Trial Expired 이메일 생성
- [ ] Trial Loop 2개 (Welcome, Expired) 생성
- [ ] Onboarding Sequence에 `trial_started` → Exit 추가

**Dev:**
- [ ] profiles Trial 컬럼 추가 (SQL)
- [ ] `sendTrialStartedEvent()` + "Start Trial" 버튼 연결
- [ ] Supabase cron (trial_expired 처리) 배포

---

### Phase 2 — 이번 달 (PM P1) — Onboarding 강화

**Loops 대시보드:**
- [ ] Onboarding 행동 기반 Contact Properties 추가 (`hasCreatedTC` 등 6개)
- [ ] Onboarding Day 1 변형 이메일 생성 + 분기 조건 추가
- [ ] Onboarding Day 3 delay 수정 (+2일 → +3일)
- [ ] Onboarding Day 3 변형 이메일 생성 + 분기 조건 추가
- [ ] Onboarding Day 7 변형 이메일 생성 + 분기 조건 추가
- [ ] Onboarding Day 14 이메일 2종 생성 + 단계 추가
- [ ] Onboarding +4일 이메일 내용 확인 후 삭제
- [ ] `trial_ending_soon` 이벤트 + 이메일 + Loop 추가

**Dev:**
- [ ] Onboarding 이벤트 4종 emit 함수 구현 (`sendOnboardingTCCreatedEvent` 등)
- [ ] profiles Onboarding 컬럼 추가 (SQL)
- [ ] `last_activity_at` 업데이트 로직 추가
- [ ] `sendTrialEndingSoonEvent()` + cron 추가

---

### Phase 3 — 선택 사항

- [ ] NPS lite 응답 수집 페이지 또는 Google Form 연동
- [ ] `trial_day_7` Loop (Loops delay 방식 권장)
- [ ] `onboarding.integration_connected` emit 추가

---

## 9. 미확인 / Kyle 확인 요청 항목

| # | 확인 항목 | 우선순위 |
|---|---------|---------|
| 1 | Loops **+4일 이메일** 내용 확인 후 삭제 결정 | 🔴 높음 |
| 2 | Trial 유저가 현재 Onboarding +7일 이메일 수신 중인지 여부 | 🔴 높음 |
| 3 | NPS lite 응답 수집 방식 결정 (Google Form vs 전용 페이지) | 🟠 중간 |
| 4 | Loops에서 "Condition branch" 기능 지원 확인 (플랜 제한 여부) | 🟠 중간 |

---

## 10. 연관 문서

| 문서 | 경로 | 내용 |
|------|------|------|
| PM 온보딩 전략 | `pm/Onboarding_Strategy.md` | 샘플 프로젝트, 체크리스트, 이메일 트리거 정의 |
| Trial 시퀀스 상세 | `mark/Loops_Trial_Sequence.md` | Trial 이메일 4종 전체 본문 + 코드 + SQL |
| LinkedIn 캘린더 | `mark/Testably_LinkedIn_Content_Calendar_Apr2026.xlsx` | 4월 포스팅 일정 |
| Product Hunt 전략 | `mark/ProductHunt_Launch_Strategy.md` | May 5 런칭 플랜 |

---

**Mark, Testably Marketing**
*최종 업데이트: 2026-04-08 — PM Onboarding_Strategy.md v1 반영 완료*
*이 문서는 Loops 이메일 전략의 단일 진실 공급원(Single Source of Truth)입니다.*
