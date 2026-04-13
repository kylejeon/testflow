import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

// 역할 계층 (숫자가 클수록 높은 권한)
const ROLE_LEVEL: Record<string, number> = {
  owner:   6,
  admin:   5,
  manager: 4,
  tester:  3,
  viewer:  2,
  guest:   1,
};

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

export function usePermission(): UsePermissionResult {
  const [role, setRole] = useState<string | null>(null);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function loadRole() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data } = await supabase
          .from('organization_members')
          .select('role, organization_id')
          .eq('user_id', user.id)
          .order('joined_at', { ascending: true })
          .limit(1)
          .maybeSingle();

        if (!cancelled) {
          setRole(data?.role ?? null);
          setOrgId(data?.organization_id ?? null);
        }
      } catch (e) {
        console.error('[usePermission] Failed to load role:', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadRole();
    return () => { cancelled = true; };
  }, []);

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

  /**
   * 플랜별 사용 가능한 역할 목록
   * - Starter(tier=3): owner, admin, tester(UI: Member)
   * - Professional+(tier≥4): 전체 6가지
   * - Free/Hobby(tier≤2): owner, admin (구분 없음, 전원 admin)
   */
  const getAvailableRoles = (subscriptionTier: number): string[] => {
    if (subscriptionTier >= 4) {
      return ['owner', 'admin', 'manager', 'tester', 'viewer', 'guest'];
    }
    if (subscriptionTier === 3) {
      return ['owner', 'admin', 'tester']; // tester는 UI에서 "Member"로 표시
    }
    return ['owner', 'admin'];
  };

  /**
   * 역할 표시명 반환 (플랜별)
   * - Starter: 'tester' → 'Member'
   * - Pro+: 역할명 그대로 Title-case
   */
  const getRoleLabel = (r: string, subscriptionTier: number): string => {
    if (subscriptionTier === 3 && r === 'tester') return 'Member';
    return r.charAt(0).toUpperCase() + r.slice(1);
  };

  return { role, orgId, loading, can, canManageRole, getAvailableRoles, getRoleLabel };
}
