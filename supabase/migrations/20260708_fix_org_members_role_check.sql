-- 20260708_fix_org_members_role_check.sql
-- organization_members.role CHECK 를 6-set 으로 정정.
--
-- 문제: 프로덕션에 20260413_rbac_roles.sql 의 organization_members CHECK 확장이
-- 적용되지 않아, role 이 아직 3-set(owner/admin/member)로 남아 있었다.
-- 그 결과 org 이메일 초대에서 manager/tester/viewer/guest 역할로 수락 시
-- 23514 check_violation → "조직 멤버 추가에 실패했습니다" 로 실패했다.
--
-- 순서 주의: 제약을 먼저 DROP 한 뒤 legacy 값을 이관하고, 그다음 새 제약을 ADD.
-- (넓히기 전에 tester 로 UPDATE 하면 옛 제약 위반 — 닭/달걀)
-- 멱등적 — 재실행 안전.

-- 1) 옛 CHECK 제거
ALTER TABLE public.organization_members
  DROP CONSTRAINT IF EXISTS organization_members_role_check;

-- 2) 6-set 밖 legacy 값(member 등)을 tester 로 이관 (제약 없는 상태에서 안전)
UPDATE public.organization_members
SET    role = 'tester'
WHERE  role NOT IN ('owner','admin','manager','tester','viewer','guest');

-- 3) 6-set CHECK 추가
ALTER TABLE public.organization_members
  ADD CONSTRAINT organization_members_role_check
  CHECK (role IN ('owner','admin','manager','tester','viewer','guest'));

-- 4) 기본값도 6-set 기준으로 정정 (20260413 과 동일)
ALTER TABLE public.organization_members ALTER COLUMN role SET DEFAULT 'tester';
