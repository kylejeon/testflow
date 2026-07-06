# Dev Spec: 조직(Org) 이메일 초대링크

> **작성일:** 2026-07-06
> **작성자:** PM (@planner)
> **상태:** Draft → Review → Approved
> **관련 디자인:** `docs/specs/design-spec-org-email-invite.md` (미작성 — @designer 후속)

---

## 1. 개요

- **문제:** 설정 → 멤버 화면의 조직 초대 모달(`OrgInviteModal`)은 **이미 Testably 계정이 있는 유저만** org에 추가할 수 있다. 미가입자를 초대하면 `User not found. Ask them to sign up first...` 에러로 막힌다 (`src/pages/settings/components/OrgMembersPanel.tsx:472-474`).
- **해결:** 미가입 유저도 **이메일 초대링크**로 org에 초대하고, 초대받은 사람이 링크로 가입/로그인하면 `organization_members`에 자동 추가되도록 확장한다. 기존 프로젝트 단위 초대 인프라(`send-invitation`/`accept-invitation`/`/accept-invitation` 페이지)를 org 분기로 재사용한다.
- **성공 지표:** org 초대 성공률(발급→수락 전환율), 미가입자 초대→가입 전환 수, "User not found" 에러 발생 0건.

### 핵심 제약 (조사 완료 반영)

| # | 제약 | 근거 |
|---|------|------|
| C-1 | `organization_members.user_id`는 `NOT NULL REFERENCES auth.users(id)` → 미가입자는 이 테이블에 넣을 수 없음 | `supabase/migrations/20260403_multitenant_isolation.sql:43-51` |
| C-2 | org 단위 초대 인프라(테이블/엣지함수/코드)가 저장소에 하나도 없음. 기존 것은 전부 프로젝트 단위 | 조사 결과 |
| C-3 | `project_invitations` 테이블은 migration 파일 없이 Supabase 대시보드에서 out-of-band 생성됨 → 신규 org 초대 테이블은 **반드시 migration 파일로** 추가 | 조사 결과 |
| C-4 | org role은 6-set(`owner/admin/manager/tester/viewer/guest`), DEFAULT `tester` | `supabase/migrations/20260413_rbac_roles.sql:20-25, 94` |
| C-5 | 앱은 현재 internal-only 모드 → 티어 게이팅 없음, 멤버 수 무제한 | `src/lib/rbac.ts:10-19` |

---

## 2. 유저 스토리

- As an **org Owner/Admin**, I want to 미가입 이메일 주소로 초대링크를 발급하고 싶다, so that 상대가 계정이 없어도 초대 이메일 하나로 팀에 합류시킬 수 있다.
- As an **초대받은 미가입자**, I want to 초대링크를 눌러 가입만 하면 자동으로 org에 합류하고 싶다, so that 별도로 "org에 넣어달라"고 재요청할 필요가 없다.
- As an **초대받은 기존 유저(로그인 상태)**, I want to 초대링크에서 버튼 한 번으로 org에 합류하고 싶다, so that 즉시 팀 프로젝트에 접근할 수 있다.

---

## 3. 수용 기준 (Acceptance Criteria)

- [ ] **AC-1:** Owner/Admin이 `OrgInviteModal`에서 **미가입 이메일**을 입력하고 역할을 선택해 제출하면, `organization_invitations`에 pending 레코드가 생성되고 모달에 `${baseUrl}/accept-invitation?token=...` 형태의 초대링크가 표시되며 복사 버튼이 동작한다. "User not found" 에러는 더 이상 발생하지 않는다.
- [ ] **AC-2:** 미가입자가 초대링크를 열면 `/accept-invitation` 페이지가 org 초대 정보(org 이름, 초대 이메일, 역할)를 표시한다. 로그인 버튼 클릭 시 `sessionStorage['invitation_token']`에 토큰 저장 후 `/auth`로 이동한다.
- [ ] **AC-3:** 미가입자가 `/auth`에서 초대 이메일로 가입을 완료하면, 가입 직후 자동으로 org 초대가 수락되어 `organization_members`에 (해당 org, user_id, 초대 role) 레코드가 1건 생성되고, `organization_invitations.accepted_at`이 채워진다.
- [ ] **AC-4:** 이미 로그인한 기존 유저가 초대링크를 열고 "수락" 버튼을 누르면 즉시 `organization_members`에 추가되고 성공 메시지 노출 후 2초 내 리다이렉트된다.
- [ ] **AC-5:** 초대 이메일 ≠ 가입/로그인 이메일이면 수락이 거부되고 "이 초대는 {email} 앞으로 발송되었습니다" 안내가 표시된다 (org 멤버십 미생성).
- [ ] **AC-6:** 만료(7일 초과)되거나 이미 수락된(`accepted_at IS NOT NULL`) 토큰으로 verify/accept 하면 "유효하지 않거나 만료된 초대입니다" 에러가 반환된다.
- [ ] **AC-7:** 동일 org+email에 미수락·미만료 초대가 존재하는 상태에서 다시 초대하면 신규 레코드 생성이 아니라 기존 레코드의 token/role/expires_at이 갱신된다(upsert 성격).
- [ ] **AC-8:** 이미 해당 org 멤버인 유저가 초대링크를 수락하면 중복 INSERT 없이 초대만 `accepted_at` 처리되고 "이미 조직 멤버입니다" 메시지가 반환된다.
- [ ] **AC-9:** 초대 발급/수락 시 비-Owner/Admin(manager 이하)이 발급 API를 호출하면 403 성격의 에러(권한 없음)로 거부된다.
- [ ] **AC-10:** 기존 **프로젝트 초대**(project_invitations 경로) 흐름은 회귀 없이 그대로 동작한다.

---

## 4. 기능 상세

### 4-1. 동작 흐름 (Flow)

**정상 흐름 A — 미가입자 초대:**
1. Owner/Admin이 설정 → 멤버 → "Invite Member" → `OrgInviteModal`에서 이메일+역할 입력, 제출.
2. 프론트가 `edgeFetch('send-invitation', { email, fullName, organizationId, role, baseUrl })` 호출 (기존 project 경로와 달리 `organizationId` 전달).
3. `send-invitation`이 org 분기 진입 → 발급자 admin 권한 검증 → `organization_invitations` upsert → `inviteUrl` 반환.
4. 프론트가 `send-notification`(event `org_invited`)으로 초대 이메일 발송 + 모달에 링크/복사버튼 표시.
5. 초대받은 사람이 링크 클릭 → `/accept-invitation?token=` → verify로 org 초대 정보 표시.
6. 미로그인 → "로그인/가입" 버튼 → `sessionStorage['invitation_token']` 저장 → `/auth`.
7. `/auth` 마운트가 sessionStorage 토큰 읽어 `checkInvitation()` → org 초대 인식 → 가입 탭, 이메일 프리필.
8. 가입 완료 → `handleSignup`이 `acceptInvitation(token)` 호출 → `accept-invitation`(action='accept') org 분기 → `organization_members` INSERT + `accepted_at` 갱신.
9. org 홈/설정으로 리다이렉트.

**정상 흐름 B — 기존 로그인 유저 초대 (링크 경유):**
1~5. 동일. 6에서 이미 로그인 & 이메일 일치 → `/accept-invitation` 페이지가 "수락" 버튼 노출.
7. 수락 클릭 → `accept-invitation`(accept) → `organization_members` INSERT → 리다이렉트.

**대안 흐름 — 기존 유저 직접 추가 (현행 유지):**
- `OrgInviteModal`이 우선 `profiles`에서 이메일 조회. 계정이 이미 있으면 **현행처럼 즉시 `organization_members` INSERT**로 추가(초대링크 없이). 계정이 없을 때만 초대링크 발급 경로로 폴백. (설계 대안 2 참조 — 결정 필요, §11 OPEN-1)

**에러 흐름:**
- 발급자 권한 부족(manager 이하) → 엣지함수가 `권한이 없습니다` 반환, 모달에 에러.
- 만료/이미수락 토큰 → verify 실패 → `/accept-invitation` 에러 상태.
- 초대 email ≠ 로그인 email → accept 거부, 안내 메시지.
- 이미 org 멤버 → INSERT skip, `accepted_at`만 갱신, "이미 조직 멤버입니다".

### 4-2. 비즈니스 규칙

| 규칙 ID | 규칙 | 비고 |
|---------|------|------|
| BR-1 | 초대 토큰 = `crypto.randomUUID() + "-" + Date.now().toString(36)`, 만료 7일 | 기존 send-invitation과 동일 규칙 |
| BR-2 | 발급 가능 역할은 발급자 role보다 낮은 역할 + `owner` 제외 | 프론트 `invitableRoles` 필터(`OrgMembersPanel.tsx:455-457`) 재사용, 엣지함수에서도 재검증 권장 |
| BR-3 | 초대 수락 시 org role은 `organization_invitations.role`을 그대로 `organization_members.role`에 기입 | org 6-set 사용. project role과 값 집합이 겹치므로 매핑 변환 불필요 (§4-5 주의) |
| BR-4 | 동일 (org, email) 미수락·미만료 초대는 1건만 유지(upsert) | AC-7 |
| BR-5 | 수락은 초대 email == 인증 email 일 때만 | AC-5, 보안 |
| BR-6 | 발급 권한은 Owner/Admin만 (manager 이하 불가) | AC-9, RLS + 엣지 재검증 |

### 4-3. 권한 (RBAC) — org 초대 발급/수락

| org 역할 | 초대 목록 조회 | 초대 발급 | 초대 취소(삭제) | 초대 수락(본인) |
|------|------|------|------|------|
| Owner | ✓ | ✓ | ✓ | ✓ |
| Admin | ✓ | ✓ (owner 초대는 불가) | ✓ | ✓ |
| Manager | ✗ | ✗ | ✗ | ✓ (본인이 초대받은 경우) |
| Tester | ✗ | ✗ | ✗ | ✓ |
| Viewer | ✗ | ✗ | ✗ | ✓ |
| Guest | ✗ | ✗ | ✗ | ✓ |

> 수락은 "초대받은 당사자"의 인증 이메일 일치로 판정하므로 org 역할과 무관하게 본인만 가능. INSERT는 서비스 롤로 수행(RLS 우회)하되 이메일 일치 검증으로 게이팅.

### 4-4. 플랜별 제한

> 현재 앱은 **internal-only 모드**로 티어 게이팅이 비활성(`src/lib/rbac.ts:10-19`, `TIER_MAX_MEMBERS` 전부 `Infinity`). 아래는 게이팅 재활성화 시를 대비한 legacy 의도이며, **이번 구현에서는 제한을 강제하지 않는다**.

| 플랜 | 멤버 상한(legacy 의도) | 초과 시 동작 |
|------|------|-------------|
| Free | 5 | 초대 발급 차단 + 업그레이드 배너 |
| Hobby | 5 | 동일 |
| Starter | 10 | 동일 |
| Professional | 25 | 동일 |
| Enterprise S·M·L | 무제한 | - |

- 이번 스코프: 멤버 수 상한 검사 **하지 않음**(internal 모드). 단 `OrgMembersPanel`의 기존 usage 배너(`:262-290`)는 `TIER_MAX_MEMBERS`가 `Infinity`이므로 `∞`로 표시되어 그대로 유지.

### 4-5. 역할 매핑 주의 (중요)

- **org role 6-set:** `owner/admin/manager/tester/viewer/guest` (`20260413_rbac_roles.sql:25`).
- **project role:** `project_members`는 다른 CHECK 제약을 가질 수 있으며 legacy에서 `developer/viewer` 등 다른 값이 존재(`accept-invitation` 페이지의 role 라벨 매핑 `'developer'` 참조 `src/pages/accept-invitation/page.tsx:167-168`).
- 따라서 `send-invitation`/`accept-invitation`의 **org 분기에서는 org 6-set만 검증**하고, project 분기의 role 값과 섞지 말 것. `organization_invitations.role`에 CHECK 제약을 org 6-set로 명시(§5).
- `/accept-invitation` 페이지의 역할 라벨 표시는 org 초대일 때 `getRoleLabel(role)`(rbac.ts:63) 사용, project 초대일 때 기존 하드코딩 매핑 유지.

---

## 5. 데이터 설계

### 신규 테이블 — `organization_invitations`

**마이그레이션 파일:** `supabase/migrations/20260706_organization_invitations.sql` (멱등적, `IF NOT EXISTS` 사용)

| 컬럼 | 타입 | 필수 | 기본값 | 설명 |
|------|------|------|--------|------|
| id | uuid | ✓ | gen_random_uuid() | PK |
| organization_id | uuid | ✓ | - | FK → organizations.id ON DELETE CASCADE |
| email | text | ✓ | - | 초대 대상 이메일 (소문자 정규화 권장) |
| role | text | ✓ | 'tester' | org 6-set CHECK |
| full_name | text | ✗ | null | 가입 시 프로필에 채울 이름 |
| token | text | ✓ | - | 초대 토큰 (UNIQUE) |
| invited_by | uuid | ✓ | - | FK → auth.users.id (발급자) |
| expires_at | timestamptz | ✓ | - | 만료 시각 (발급+7일) |
| accepted_at | timestamptz | ✗ | null | 수락 시각 (null = pending) |
| created_at | timestamptz | ✓ | now() | 생성일 |

**제약/인덱스:**
- `CHECK (role IN ('owner','admin','manager','tester','viewer','guest'))` — org 6-set (C-4와 일치).
- `UNIQUE (token)`.
- 부분 유니크 인덱스로 pending 중복 방지:
  `CREATE UNIQUE INDEX IF NOT EXISTS uq_org_inv_pending ON organization_invitations(organization_id, lower(email)) WHERE accepted_at IS NULL;`
- `CREATE INDEX IF NOT EXISTS idx_org_inv_org ON organization_invitations(organization_id);`
- `CREATE INDEX IF NOT EXISTS idx_org_inv_token ON organization_invitations(token);`

**DDL 초안:**
```sql
-- supabase/migrations/20260706_organization_invitations.sql
CREATE TABLE IF NOT EXISTS organization_invitations (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email           text        NOT NULL,
  role            text        NOT NULL DEFAULT 'tester'
                              CHECK (role IN ('owner','admin','manager','tester','viewer','guest')),
  full_name       text,
  token           text        NOT NULL,
  invited_by      uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  expires_at      timestamptz NOT NULL,
  accepted_at     timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT organization_invitations_token_unique UNIQUE (token)
);

CREATE INDEX IF NOT EXISTS idx_org_inv_org   ON organization_invitations(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_inv_token ON organization_invitations(token);
CREATE UNIQUE INDEX IF NOT EXISTS uq_org_inv_pending
  ON organization_invitations(organization_id, lower(email))
  WHERE accepted_at IS NULL;
```

### 기존 테이블 변경

| 테이블 | 변경 내용 | 마이그레이션 필요 |
|--------|---------|----------------|
| organization_invitations | 신규 생성 | Y |
| organization_members | 변경 없음 (INSERT는 서비스 롤로 수행) | N |
| project_invitations | 변경 없음 (공존) | N |

### RLS 정책

> 패턴은 `organization_members`의 `org_admins_can_add_members`(`20260403_multitenant_isolation.sql:162-171`) 및 헬퍼 `get_user_admin_org_ids()`(`20260403_fix_rls_infinite_recursion.sql:12`)를 따른다. 실제 INSERT/수락은 **서비스 롤 클라이언트(RLS 우회)**로 엣지함수가 수행하므로 아래 정책은 프론트 직접 조회/취소용 안전망이다.

```sql
ALTER TABLE organization_invitations ENABLE ROW LEVEL SECURITY;

-- SELECT: 해당 org의 admin/owner만 초대 목록 조회
DROP POLICY IF EXISTS "org_admins_can_view_invitations" ON organization_invitations;
CREATE POLICY "org_admins_can_view_invitations"
  ON organization_invitations FOR SELECT
  USING (organization_id = ANY(get_user_admin_org_ids()));

-- INSERT: 해당 org의 admin/owner만 (엣지함수는 서비스 롤로 우회)
DROP POLICY IF EXISTS "org_admins_can_create_invitations" ON organization_invitations;
CREATE POLICY "org_admins_can_create_invitations"
  ON organization_invitations FOR INSERT
  WITH CHECK (organization_id = ANY(get_user_admin_org_ids()));

-- UPDATE: admin/owner만 (accepted_at 갱신/재발급). 엣지함수 서비스 롤로 우회
DROP POLICY IF EXISTS "org_admins_can_update_invitations" ON organization_invitations;
CREATE POLICY "org_admins_can_update_invitations"
  ON organization_invitations FOR UPDATE
  USING (organization_id = ANY(get_user_admin_org_ids()))
  WITH CHECK (organization_id = ANY(get_user_admin_org_ids()));

-- DELETE: admin/owner만 (초대 취소)
DROP POLICY IF EXISTS "org_admins_can_delete_invitations" ON organization_invitations;
CREATE POLICY "org_admins_can_delete_invitations"
  ON organization_invitations FOR DELETE
  USING (organization_id = ANY(get_user_admin_org_ids()));
```

> **주의(RLS 우회 경로):** verify(미인증 초대정보 조회)와 accept(멤버 추가)는 반드시 **서비스 롤 클라이언트**로 수행해야 한다. 위 SELECT 정책은 admin만 허용하므로, 미인증/피초대자 관점의 verify를 RLS로 열면 안 된다 → 엣지함수 서비스 롤 사용(기존 accept-invitation과 동일 패턴).

---

## 6. API 설계

### 6-1. `send-invitation` 엣지함수 — org 분기 추가

**파일:** `supabase/functions/send-invitation/index.ts` (기존 project 로직 유지 + org 분기)

**Request (org):**
```json
{
  "email": "teammate@email.com",
  "fullName": "Jane Doe",
  "organizationId": "uuid",
  "role": "tester",
  "baseUrl": "https://app.testably.io"
}
```

**분기 로직:**
1. 인증(x-user-token JWT) — 기존 `:26-55` 재사용.
2. body에 `organizationId`가 있으면 **org 분기**, 없고 `projectId`면 기존 project 분기(`:57-135`).
3. org 분기:
   - 발급자 admin 권한 검증: `get_user_org_role(organizationId, userId)` RPC 또는 `organization_members` 조회로 role ∈ {owner, admin} 확인. 아니면 `권한이 없습니다` 400.
   - (선택) BR-2: 발급 role이 발급자 role보다 낮은지 검증.
   - `organizations`에서 `name` 조회 (project.name 대신).
   - 토큰 생성/만료 규칙 동일(`:87-88`).
   - `organization_invitations`에서 (organizationId, lower(email), accepted_at IS NULL, expires_at > now) 조회 → 있으면 UPDATE(token/role/full_name/expires_at/invited_by), 없으면 INSERT.
   - 응답:

```json
{
  "success": true,
  "message": "초대 링크가 생성되었습니다.",
  "inviteUrl": "https://app.testably.io/accept-invitation?token=...",
  "organizationName": "Acme QA",
  "inviterName": "Kyle",
  "type": "organization",
  "emailSent": false
}
```

**Response (에러):** 기존 형태 `{ "error": "...", "details": "..." }`, status 400.

### 6-2. `accept-invitation` 엣지함수 — org 분기 추가

**파일:** `supabase/functions/accept-invitation/index.ts`

**분기 판정:** 토큰으로 먼저 `project_invitations` 조회(기존 `:32-44`), 없으면 `organization_invitations` 조회. 둘 다 없으면 만료/무효 에러. (또는 요청 body에 `scope: 'organization'` 명시 — §11 OPEN-2)

**action='verify' 응답 (org):**
```json
{
  "success": true,
  "type": "organization",
  "invitation": {
    "email": "teammate@email.com",
    "role": "tester",
    "organizationName": "Acme QA",
    "organizationId": "uuid"
  }
}
```
> project 초대는 기존 응답(`projectName`, `projectId`) 유지. 프론트는 `type` 필드로 분기.

**action='accept' (org):**
1. 인증(x-user-token) — 기존 `:74-103` 재사용.
2. 이메일 일치 검증 `user.email === invitation.email` (기존 `:106-108`).
3. `full_name` 프로필 보정 (기존 `:110-125`).
4. 이미 org 멤버인지: `organization_members` where (organization_id, user_id) 조회. 있으면 INSERT skip + `accepted_at`만 갱신 → "이미 조직 멤버입니다".
5. 아니면 `organization_members` INSERT `{ organization_id, user_id, role: invitation.role }` (서비스 롤).
6. `organization_invitations.accepted_at = now()`.
7. 응답:
```json
{
  "success": true,
  "type": "organization",
  "message": "조직에 참여했습니다",
  "organizationId": "uuid"
}
```

### 6-3. 프론트 — `OrgInviteModal` (`OrgMembersPanel.tsx:447-611`)

- `handleInvite`(`:459-504`) 수정:
  - `profiles` 조회 후 계정 존재 → (대안 흐름) 기존 직접 INSERT 유지. **미존재 시 `:472-474`의 에러 대신** `edgeFetch('send-invitation', { email, fullName, organizationId: orgId, role, baseUrl: window.location.origin })` 호출.
  - 성공 시 `inviteUrl`을 state에 저장하고 링크/복사 UI 노출 (패턴: `InviteMemberModal.tsx:203-248`의 `inviteLink`/`copyInviteLink`).
  - `send-notification`(event `org_invited`) 호출로 이메일 발송 (패턴: `InviteMemberModal.tsx:218-229`).
- 모달 카피 수정: `Only existing Testably accounts can be added directly`(`:552`) → "미가입자는 초대링크로 초대됩니다" 취지로 변경(i18n §10).

**클라이언트 호출 스니펫 참조:** `edgeFetch`/`invokeEdge`는 `src/lib/aiFetch.ts`, `OrgMembersPanel`은 이미 `supabase` import. `edgeFetch` import 추가 필요.

### 6-4. 프론트 — `/auth` `checkInvitation` (`auth/page.tsx:262-288`)

- 현재 `project_invitations`만 조회. org 토큰도 처리하도록 확장:
  - project_invitations에서 못 찾으면 `organization_invitations`에서 token 조회(미인증 → 엣지함수 verify 경유 권장, 직접 테이블 조회는 RLS로 막힘).
  - 권장: `edgeFetch('accept-invitation', { token, action: 'verify' }, { allowAnonymous: true })`로 통일 조회 → `type`으로 분기. `invitation` state에 org 여부 저장.
  - `acceptInvitation`(`:290-...`)은 이미 `edgeFetch('accept-invitation', { token })` 호출이므로 org 토큰도 그대로 동작(엣지함수가 org 분기 처리). 리다이렉트 목적지만 `result.type`에 따라 org 화면 or project 화면 분기.
- `handleSignup`(`:420-423`)의 `acceptInvitation(invitation.token)` 호출은 org 토큰에도 동일 적용 — 수정 불필요(엣지함수 분기로 흡수).

### 6-5. 프론트 — `/accept-invitation` 페이지 (`accept-invitation/page.tsx`)

- `InvitationInfo` 타입에 org 필드 추가(`organizationName?`, `organizationId?`, `type`).
- `verifyInvitation`(`:27-75`) 응답의 `type`으로 분기, 화면 라벨을 "프로젝트 초대" ↔ "조직 초대"로 전환.
- 역할 라벨: org면 `getRoleLabel(role)`(rbac.ts:63) 사용. 기존 project 하드코딩 매핑(`:167-168`) 유지.
- `acceptInvitation`(`:77-129`) 리다이렉트: org면 `/settings?tab=members`(또는 org 홈), project면 기존 `/projects/${projectId}`.
- 성공 시 알림: org는 `notifyProjectMembers` 대신 생략 또는 org 멤버 알림(§11 OPEN-3).

---

## 7. 영향 범위 (변경 파일 목록)

### 신규 파일

| 파일 | 역할 |
|------|------|
| `supabase/migrations/20260706_organization_invitations.sql` | 테이블 + 인덱스 + RLS |

### 수정 파일

| 파일 | 변경 내용 |
|------|---------|
| `supabase/functions/send-invitation/index.ts` | `organizationId` 분기, 발급자 admin 검증, `organization_invitations` upsert, org 응답 |
| `supabase/functions/accept-invitation/index.ts` | 토큰→org 초대 폴백 조회, verify/accept org 분기, `organization_members` INSERT |
| `supabase/functions/send-notification/index.ts` | `org_invited` 이벤트 추가 (`PREF_COLUMN` `:10-16`, `TEMPLATE_ENV` `:19-25`) — org 이메일 템플릿 |
| `src/pages/settings/components/OrgMembersPanel.tsx` | `OrgInviteModal.handleInvite`(`:459-504`) 미가입자 초대링크 발급 경로, 링크/복사 UI, 카피 변경 |
| `src/pages/auth/page.tsx` | `checkInvitation`(`:262-288`) org 토큰 처리, 리다이렉트 분기 |
| `src/pages/accept-invitation/page.tsx` | verify 응답 org 대응, 라벨/리다이렉트 분기 |
| `src/locales/en.json` | 초대 관련 EN 키 |
| `src/locales/ko.json` | 초대 관련 KO 키 |

> 라우터 변경 불필요: `/accept-invitation`, `/auth` 라우트 이미 존재.

---

## 8. 엣지 케이스

| 케이스 | 예상 동작 |
|--------|---------|
| 미가입자 초대 후 다른 이메일로 가입 | accept 시 email 불일치 → 거부, org 멤버십 미생성 (AC-5) |
| 만료(7일 초과) 토큰 verify | "유효하지 않거나 만료된 초대입니다" (AC-6) |
| 이미 수락된 토큰 재사용 | `accepted_at IS NOT NULL` → verify 실패 (부분 유니크로 pending 없음) |
| 동일 org+email 재초대 | 기존 pending UPDATE(재발급), 신규 미생성 (AC-7, `uq_org_inv_pending`) |
| 이미 org 멤버가 수락 | INSERT skip, `accepted_at`만 갱신, "이미 조직 멤버입니다" (AC-8) |
| manager 이하가 발급 API 호출 | 발급자 권한 검증 실패 → `권한이 없습니다` 400 (AC-9) |
| project 토큰과 org 토큰 값 충돌 | 토큰은 UUID 기반 → 사실상 충돌 없음. 폴백 조회는 project→org 순서 고정 |
| org 삭제 후 남은 초대 | `ON DELETE CASCADE`로 초대 자동 삭제 |
| 네트워크 끊김(발급 중) | 에러 토스트, 재시도 가능. upsert라 중복 안전 |
| 마지막 owner가 초대로 강등 위험 | 초대 역할은 신규 멤버 대상이라 무관. 기존 owner 강등 방지 로직(`OrgMembersPanel.tsx:114-121`)과 분리 |
| 빈 상태(초대 목록) | 이번 스코프에 초대 목록 UI 미포함 → 해당 없음 (§9) |

---

## 9. Out of Scope (이번에 안 하는 것)

- [ ] org 초대 **목록/취소 관리 UI** (pending 초대 리스트, 재발송, 취소 버튼) — 후속 스펙.
- [ ] 멤버 수 상한 강제 (internal-only 모드라 게이팅 없음, §4-4).
- [ ] 초대 링크 만료 기간 커스터마이즈(7일 고정).
- [ ] 프로젝트 초대 흐름 리팩터/변경 (회귀 방지만, 로직 변경 없음).
- [ ] 대량(bulk) 이메일 초대, CSV 업로드.
- [ ] org role → project role 자동 전파(초대는 org 멤버십만 생성).
- [ ] 초대 이메일 템플릿 디자인 자체(카피만 정의, Loops 템플릿은 운영이 세팅 — §11 OPEN-4).

---

## 10. i18n 키

| 키 | EN | KO |
|----|----|----|
| `orgInvite.title` | "Invite to Organization" | "조직에 초대" |
| `orgInvite.subtitle` | "Invite teammates by email — no account required" | "이메일로 팀원 초대 — 계정이 없어도 됩니다" |
| `orgInvite.emailLabel` | "Email Address" | "이메일 주소" |
| `orgInvite.emailHint` | "New users get an invite link to sign up and join" | "미가입자는 초대링크로 가입 후 자동 합류합니다" |
| `orgInvite.roleLabel` | "Default Role" | "기본 역할" |
| `orgInvite.send` | "Send Invite" | "초대 보내기" |
| `orgInvite.linkCreated` | "Invite link created. Copy and share it below." | "초대 링크가 생성되었습니다. 아래에서 복사해 공유하세요." |
| `orgInvite.copyLink` | "Copy Link" | "링크 복사" |
| `orgInvite.copied` | "Invite link copied to clipboard" | "초대 링크가 클립보드에 복사되었습니다" |
| `orgInvite.alreadyMember` | "This user is already an organization member." | "이미 조직 멤버입니다." |
| `orgInvite.noPermission` | "You don't have permission to invite members." | "멤버를 초대할 권한이 없습니다." |
| `orgInvite.failed` | "Failed to create invitation." | "초대 생성에 실패했습니다." |
| `acceptInvite.orgTitle` | "Organization Invitation" | "조직 초대" |
| `acceptInvite.orgLabel` | "Organization" | "조직" |
| `acceptInvite.emailLabel` | "Invited email" | "초대된 이메일" |
| `acceptInvite.roleLabel` | "Role" | "역할" |
| `acceptInvite.joinOrg` | "Join Organization" | "조직 합류하기" |
| `acceptInvite.joinedOrg` | "You've joined the organization!" | "조직에 합류했습니다!" |
| `acceptInvite.emailMismatch` | "This invitation was sent to {email}. Please sign in with that address." | "이 초대는 {email} 앞으로 발송되었습니다. 해당 이메일로 로그인해주세요." |
| `acceptInvite.expired` | "This invitation is invalid or has expired." | "유효하지 않거나 만료된 초대입니다." |

---

## 11. 미결정 / 오픈 이슈

- **OPEN-1 (대안 흐름 결정):** 기존 유저를 `OrgInviteModal`에서 조회 시 (a) **현행처럼 즉시 직접 INSERT** vs (b) 모든 케이스를 초대링크로 통일. 권장: (a) 유지(즉시 추가 UX가 더 빠름) + 미가입자만 링크. → CEO/기획 확정 필요.
- **OPEN-2 (분기 판정 방식):** `accept-invitation`이 토큰으로 project→org 순서 폴백 조회 vs 요청 body `scope` 명시. 권장: 폴백 조회(프론트 변경 최소, 토큰 충돌 사실상 없음).
- **OPEN-3 (수락 알림):** org 합류 시 기존 org 멤버들에게 알림을 보낼지. project는 `notifyProjectMembers` 있음. org용 알림 함수 부재 → 이번엔 생략 or 후속.
- **OPEN-4 (이메일 템플릿):** `org_invited` Loops 템플릿(`LOOPS_TEMPLATE_ORG_INVITED` env) 신규 생성 필요 — 운영이 Loops 대시보드에서 세팅. 미세팅 시 링크 복사로 폴백(발송 실패 무시, `emailSent:false`).
- **OPEN-5 (발급자 role 재검증):** BR-2(발급 role ≤ 발급자 role)를 엣지함수에서 강제할지 프론트 필터에만 의존할지. 보안상 엣지 재검증 권장.

---

## 12. 배포 / 롤아웃 순서

> Claude는 **claude 브랜치 커밋까지만** 수행. 아래 (a)~(c)는 CEO/운영이 수동 실행.

1. **[Claude]** claude 브랜치에 migration + 엣지함수 + 프론트 변경 커밋.
2. **(a) [운영]** 마이그레이션 프로덕션 push: `supabase db push` (또는 대시보드에서 `20260706_organization_invitations.sql` 실행). — 멱등적이라 재실행 안전.
3. **(b) [운영]** 엣지함수 deploy: `supabase functions deploy send-invitation accept-invitation send-notification`.
4. **(c) [운영]** (선택) Loops에 `LOOPS_TEMPLATE_ORG_INVITED` 템플릿 생성 + env 등록.
5. **(d) [CEO]** claude → main 수동 머지 → 프론트 배포.
6. **검증:** 미가입 이메일로 초대 → 링크 가입 → `organization_members` 자동 추가 e2e 확인 (AC-1~AC-3).

> 순서 주의: 프론트가 org `organizationId` 파라미터를 보내기 전에 엣지함수(b)가 먼저 배포돼도 무해(기존 project 분기 유지). 반대로 프론트만 먼저 나가면 org 초대가 실패하므로 (a)(b)를 프론트 머지(d)보다 **먼저** 수행.

---

## 개발 착수 전 체크리스트

- [x] 수용 기준이 전부 테스트 가능한 문장인가 (AC-1~AC-10)
- [x] DB 스키마가 컬럼 타입/제약조건까지 명시되었는가 (§5 DDL)
- [x] RLS 정책이 SQL로 정의되었는가 (§5)
- [x] 플랜별 제한이 명시되었는가 (§4-4, internal-only 반영)
- [x] RBAC 권한 매트릭스가 있는가 (§4-3)
- [x] 변경 파일 목록이 실제 경로로 구체적인가 (§7)
- [x] 엣지 케이스가 식별되었는가 (§8)
- [x] Out of Scope이 명시되었는가 (§9)
- [x] i18n 키가 en/ko 둘 다 있는가 (§10)
- [ ] OPEN-1~OPEN-5 확정 (기획/CEO)
- [ ] 관련 디자인 명세가 Approved 상태인가 (@designer 후속)
