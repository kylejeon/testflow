-- ============================================================
-- Fix: environments RLS에 project owner 바이패스 추가
--
-- 문제:
--   projects.owner_id = auth.uid() 인 사용자가 project_members에 없거나
--   role_override NULL + organization_members 가입 안 됨 → COALESCE가 'viewer'로
--   떨어져 INSERT 거부됨 ("new row violates row-level security policy").
--
-- 해결:
--   각 policy에 "EXISTS(SELECT 1 FROM projects WHERE id = project_id AND owner_id = auth.uid())"
--   OR 절 추가하여 project owner는 무조건 통과.
-- ============================================================

-- SELECT
DROP POLICY IF EXISTS "environments_select" ON environments;
CREATE POLICY "environments_select" ON environments FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM projects WHERE id = environments.project_id AND owner_id = auth.uid())
    OR project_id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid())
  );

-- INSERT
DROP POLICY IF EXISTS "environments_insert" ON environments;
CREATE POLICY "environments_insert" ON environments FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM projects WHERE id = environments.project_id AND owner_id = auth.uid())
  OR project_id IN (
    SELECT pm.project_id FROM project_members pm
    LEFT JOIN organization_members om
      ON om.organization_id = (SELECT organization_id FROM projects WHERE id = pm.project_id)
      AND om.user_id = pm.user_id
    WHERE pm.user_id = auth.uid()
      AND COALESCE(pm.role_override, om.role, 'viewer') IN ('owner','admin','manager','tester')
  )
);

-- UPDATE
DROP POLICY IF EXISTS "environments_update" ON environments;
CREATE POLICY "environments_update" ON environments FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM projects WHERE id = environments.project_id AND owner_id = auth.uid())
    OR project_id IN (
      SELECT pm.project_id FROM project_members pm
      LEFT JOIN organization_members om
        ON om.organization_id = (SELECT organization_id FROM projects WHERE id = pm.project_id)
        AND om.user_id = pm.user_id
      WHERE pm.user_id = auth.uid()
        AND COALESCE(pm.role_override, om.role, 'viewer') IN ('owner','admin','manager','tester')
    )
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM projects WHERE id = environments.project_id AND owner_id = auth.uid())
    OR project_id IN (
      SELECT pm.project_id FROM project_members pm
      LEFT JOIN organization_members om
        ON om.organization_id = (SELECT organization_id FROM projects WHERE id = pm.project_id)
        AND om.user_id = pm.user_id
      WHERE pm.user_id = auth.uid()
        AND COALESCE(pm.role_override, om.role, 'viewer') IN ('owner','admin','manager','tester')
    )
  );

-- DELETE
DROP POLICY IF EXISTS "environments_delete" ON environments;
CREATE POLICY "environments_delete" ON environments FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM projects WHERE id = environments.project_id AND owner_id = auth.uid())
    OR project_id IN (
      SELECT pm.project_id FROM project_members pm
      LEFT JOIN organization_members om
        ON om.organization_id = (SELECT organization_id FROM projects WHERE id = pm.project_id)
        AND om.user_id = pm.user_id
      WHERE pm.user_id = auth.uid()
        AND COALESCE(pm.role_override, om.role, 'viewer') IN ('owner','admin')
    )
  );
