/** 플랜별 최대 멤버 수 (organization_members 기준) */
export const TIER_MAX_MEMBERS: Record<number, number> = {
  1: 2,        // Free
  2: 5,        // Hobby
  3: 5,        // Starter
  4: 20,       // Professional
  5: 50,       // Enterprise S
  6: 100,      // Enterprise M
  7: Infinity, // Enterprise L
};

/** 플랜 이름 */
export const TIER_NAME: Record<number, string> = {
  1: 'Free',
  2: 'Hobby',
  3: 'Starter',
  4: 'Professional',
  5: 'Enterprise S',
  6: 'Enterprise M',
  7: 'Enterprise L',
};

/** 역할 계층: 숫자가 클수록 높은 권한 */
export const ROLE_LEVEL: Record<string, number> = {
  owner:   6,
  admin:   5,
  manager: 4,
  tester:  3,
  viewer:  2,
  guest:   1,
};

/** 역할별 뱃지 스타일 */
export const ROLE_BADGE: Record<string, { label: string; className: string }> = {
  owner:   { label: 'Owner',   className: 'bg-violet-50 text-violet-600' },
  admin:   { label: 'Admin',   className: 'bg-orange-50 text-orange-700' },
  manager: { label: 'Manager', className: 'bg-blue-50 text-blue-700' },
  tester:  { label: 'Tester',  className: 'bg-indigo-50 text-indigo-700' },
  viewer:  { label: 'Viewer',  className: 'bg-slate-100 text-slate-500' },
  guest:   { label: 'Guest',   className: 'bg-gray-50 text-gray-400' },
};

/** 역할별 설명 */
export const ROLE_DESCRIPTIONS: Record<string, string> = {
  owner:   'Full control including billing and org settings',
  admin:   'Full access — manage members and all settings',
  manager: 'Manage projects and runs within the org',
  tester:  'Create and execute test cases and runs',
  viewer:  'View all content and export reports',
  guest:   'View assigned projects only (read-only)',
};

/**
 * 역할 표시명 반환 (플랜별)
 * - Starter(tier=3): 'tester' → 'Member'
 * - Pro+(tier≥4): 역할명 그대로 Title-case
 * - Free/Hobby(tier≤2): 역할 구분 없음 (모두 Admin으로 동작)
 */
export function getRoleLabel(role: string, subscriptionTier: number): string {
  if (subscriptionTier === 3 && role === 'tester') return 'Member';
  return role.charAt(0).toUpperCase() + role.slice(1);
}

/**
 * 플랜별 사용 가능한 역할 목록
 * - Free/Hobby(≤2): owner, admin
 * - Starter(3):     owner, admin, tester
 * - Professional+(≥4): 전체 6가지
 */
export function getAvailableRoles(subscriptionTier: number): string[] {
  if (subscriptionTier >= 4) {
    return ['owner', 'admin', 'manager', 'tester', 'viewer', 'guest'];
  }
  if (subscriptionTier === 3) {
    return ['owner', 'admin', 'tester'];
  }
  return ['owner', 'admin'];
}
