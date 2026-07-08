-- 20260708_fix_org_members_role_check.sql
-- organization_members.role CHECK 를 6-set 으로 정정.
--
-- 문제: 프로덕션에 20260413_rbac_roles.sql 의 organization_members CHECK 확장이
-- 적용되지 않아, role 이 아직 3-set(owner/admin/member)로 남아 있었다.
-- 그 결과 org 이메일 초대에서 manager/tester/viewer/guest 역할로 수락 시
-- 23514 check_violation → "조직 멤버 추가에 실패했습니다" 로 실패했다.
--
-- 멱등적 — 재실행 안전.

-- 1) 기존 'member' 역할을 'tester' 로 이관 (신규 CHECK 위반 방지, 20260413 의도)
UPDATE public.organization_members SET role = 'tester' WHERE role = 'member';

-- 2) CHECK 를 6-set 으로 재정의
ALTER TABLE public.organization_members
  DROP CONSTRAINT IF EXISTS organization_members_role_check;

ALTER TABLE public.organization_members
  ADD CONSTRAINT organization_members_role_check
  CHECK (role IN ('owner','admin','manager','tester','viewer','guest'));

-- 3) 기본값도 6-set 기준으로 정정 (20260413 과 동일)
ALTER TABLE public.organization_members ALTER COLUMN role SET DEFAULT 'tester';
