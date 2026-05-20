/**
 * RBAC — Internal-only configuration.
 *
 * Subscription tiers are no longer enforced. All authenticated users have
 * unlimited member counts and access to every role label. Role-based access
 * (owner/admin/manager/tester/viewer/guest) still applies for permission
 * separation within the team.
 */

/** Member limit per organization — unlimited for internal use */
export const TIER_MAX_MEMBERS: Record<number, number> = {
  1: Infinity,
  2: Infinity,
  3: Infinity,
  4: Infinity,
  5: Infinity,
  6: Infinity,
  7: Infinity,
};

/** Plan name labels — retained for legacy display only (unused in gating) */
export const TIER_NAME: Record<number, string> = {
  1: 'Internal',
  2: 'Internal',
  3: 'Internal',
  4: 'Internal',
  5: 'Internal',
  6: 'Internal',
  7: 'Internal',
};

/** Role hierarchy: higher number = higher privilege */
export const ROLE_LEVEL: Record<string, number> = {
  owner:   6,
  admin:   5,
  manager: 4,
  tester:  3,
  viewer:  2,
  guest:   1,
};

/** Role badge styling */
export const ROLE_BADGE: Record<string, { label: string; className: string }> = {
  owner:   { label: 'Owner',   className: 'bg-violet-50 text-violet-600' },
  admin:   { label: 'Admin',   className: 'bg-orange-50 text-orange-700' },
  manager: { label: 'Manager', className: 'bg-blue-50 text-blue-700' },
  tester:  { label: 'Tester',  className: 'bg-indigo-50 text-indigo-700' },
  viewer:  { label: 'Viewer',  className: 'bg-slate-100 text-slate-500' },
  guest:   { label: 'Guest',   className: 'bg-gray-50 text-gray-400' },
};

/** Role descriptions */
export const ROLE_DESCRIPTIONS: Record<string, string> = {
  owner:   'Full control including org settings',
  admin:   'Full access — manage members and all settings',
  manager: 'Manage projects and runs within the org',
  tester:  'Create and execute test cases and runs',
  viewer:  'View all content and export reports',
  guest:   'View assigned projects only (read-only)',
};

/** Role display name — Title-cased role */
export function getRoleLabel(role: string, _subscriptionTier: number): string {
  return role.charAt(0).toUpperCase() + role.slice(1);
}

/** Available roles for selection — full set for all users in internal mode */
export function getAvailableRoles(_subscriptionTier: number): string[] {
  return ['owner', 'admin', 'manager', 'tester', 'viewer', 'guest'];
}
