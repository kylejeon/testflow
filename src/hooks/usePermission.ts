import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { ROLE_LEVEL, getRoleLabel, getAvailableRoles } from '../lib/rbac';

// 액션별 최소 요구 레벨
const PERMISSION_LEVEL: Record<string, number> = {
  create_project:   5, // admin+
  delete_project:   5, // admin+
  create_testcase:  3, // tester+
  edit_testcase:    3, // tester+
  delete_testcase:  3, // tester+
  create_run:       3, // tester+
  execute_run:      3, // tester+
  export:           2, // viewer+
  use_ai:           3, // tester+
  manage_billing:   6, // owner only
  manage_members:   5, // admin+
  view_members:     1, // 전원
  manage_settings:  5, // admin+
};

export interface UsePermissionResult {
  role: string | null;
  orgId: string | null;
  loading: boolean;
  can: (action: string) => boolean;
  canManageRole: (targetRole: string) => boolean;
  /** 현재 플랜에서 표시할 역할 목록 반환 */
  getAvailableRoles: (subscriptionTier: number) => string[];
  /** Starter 플랜에서 'tester' DB값을 'member'로 레이블링 */
  getRoleLabel: (role: string, subscriptionTier: number) => string;
}

export function usePermission(projectId?: string): UsePermissionResult {
  const [role, setRole] = useState<string | null>(null);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function loadRole() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Fetch org role
        const { data: orgMember } = await supabase
          .from('organization_members')
          .select('role, organization_id')
          .eq('user_id', user.id)
          .order('joined_at', { ascending: true })
          .limit(1)
          .maybeSingle();

        let effectiveRole = orgMember?.role ?? null;

        // If projectId provided, check for a per-project role_override
        if (projectId && effectiveRole !== null) {
          const { data: projectMember } = await supabase
            .from('project_members')
            .select('role_override')
            .eq('project_id', projectId)
            .eq('user_id', user.id)
            .maybeSingle();

          if (projectMember?.role_override) {
            effectiveRole = projectMember.role_override;
          }
        }

        if (!cancelled) {
          setRole(effectiveRole);
          setOrgId(orgMember?.organization_id ?? null);
        }
      } catch (e) {
        console.error('[usePermission] Failed to load role:', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadRole();
    return () => { cancelled = true; };
  }, [projectId]);

  const currentLevel = ROLE_LEVEL[role ?? ''] ?? 0;

  const can = (action: string): boolean => {
    const required = PERMISSION_LEVEL[action] ?? 0;
    return currentLevel >= required;
  };

  /** 자신보다 낮은 역할만 관리 가능 */
  const canManageRole = (targetRole: string): boolean => {
    const targetLevel = ROLE_LEVEL[targetRole] ?? 0;
    return currentLevel > targetLevel;
  };

  return {
    role,
    orgId,
    loading,
    can,
    canManageRole,
    getAvailableRoles,
    getRoleLabel,
  };
}
