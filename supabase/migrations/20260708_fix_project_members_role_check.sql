-- 20260708_fix_project_members_role_check.sql
-- project_members.role CHECK 를 6-set 으로 정정.
--
-- 문제: project_members 는 out-of-band(대시보드) 생성 테이블이라 role CHECK 가
-- 옛날 값 집합에 머물러 있어, project 멤버 추가 시 'tester' 등 역할이
-- 23514 check_violation("project_members_role_check")으로 거부됐다.
-- role_override(20260413_project_members_role_override.sql:15)는 이미 6-set 인데
-- base role 컬럼만 뒤처져 있던 것.
--
-- 프로덕션 실제 role 분포: owner(53), member(1), viewer(1).
-- → 6-set 밖 값은 'member' 1건뿐이므로 tester 로 이관 후 CHECK 확장.
-- 멱등적 — 재실행 안전.

-- 1) 기존 'member' 역할을 'tester' 로 이관 (org 이관과 동일 규칙)
UPDATE public.project_members SET role = 'tester' WHERE role = 'member';

-- 2) CHECK 를 6-set 으로 재정의 (role_override 와 동일 집합)
ALTER TABLE public.project_members
  DROP CONSTRAINT IF EXISTS project_members_role_check;

ALTER TABLE public.project_members
  ADD CONSTRAINT project_members_role_check
  CHECK (role IN ('owner','admin','manager','tester','viewer','guest'));

-- 3) 기본값도 6-set 기준으로 정정 (member 는 더 이상 유효하지 않으므로)
ALTER TABLE public.project_members ALTER COLUMN role SET DEFAULT 'tester';
