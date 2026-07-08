-- 20260708_fix_project_members_role_check.sql
-- project_members.role CHECK 를 6-set 으로 정정.
--
-- 문제: project_members 는 out-of-band(대시보드) 생성 테이블이라 role CHECK 가
-- 옛 값 집합(owner/admin/member/viewer)에 머물러, project 멤버 추가 시 'tester'/'manager'
-- 등 역할이 23514 check_violation("project_members_role_check")으로 거부됐다.
-- role_override(20260413_project_members_role_override.sql:15)는 이미 6-set 인데
-- base role 컬럼만 뒤처져 있던 것.
--
-- 순서 주의: 제약을 먼저 DROP 한 뒤 legacy 값을 이관하고, 그다음 새 제약을 ADD 한다.
-- (제약을 넓히기 전에 'tester' 로 UPDATE 하면 옛 제약 위반으로 실패 — 닭/달걀)
-- 멱등적 — 재실행 안전.

-- 1) 옛 CHECK 제거
ALTER TABLE public.project_members
  DROP CONSTRAINT IF EXISTS project_members_role_check;

-- 2) 6-set 밖의 legacy 값(member 등)을 tester 로 이관 (제약 없는 상태에서 안전)
UPDATE public.project_members
SET    role = 'tester'
WHERE  role NOT IN ('owner','admin','manager','tester','viewer','guest');

-- 3) 6-set CHECK 추가 (role_override 와 동일 집합)
ALTER TABLE public.project_members
  ADD CONSTRAINT project_members_role_check
  CHECK (role IN ('owner','admin','manager','tester','viewer','guest'));

-- 4) 기본값도 6-set 기준으로 정정 (member 는 더 이상 유효하지 않으므로)
ALTER TABLE public.project_members ALTER COLUMN role SET DEFAULT 'tester';
