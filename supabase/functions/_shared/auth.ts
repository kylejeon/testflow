/**
 * Shared auth helper for sync Edge Functions.
 *
 * Usage:
 *   import { verifySyncCaller, assertProjectMembership, SYNC_ALLOWED_ROLES } from '../_shared/auth.ts';
 *   const caller = await verifySyncCaller(req, admin);
 *   if (caller.kind === 'user') {
 *     await assertProjectMembership(admin, caller.userId, projectId, SYNC_ALLOWED_ROLES);
 *   }
 *
 * Auth model (hybrid):
 *   1. If request has `x-cron-secret` header matching env `CRON_SECRET` →
 *      treat as trusted cron caller (no user identity, no project check needed).
 *      This allows pg_cron to invoke sync functions without a JWT.
 *   2. Otherwise, require a Bearer JWT in `Authorization` header and verify via
 *      Supabase Auth. Caller must then be a `project_members` row with a role
 *      in `SYNC_ALLOWED_ROLES` for any `project_id` whose data they touch.
 */

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

export class AuthError extends Error {
  status: number;
  constructor(message: string, status = 401) {
    super(message);
    this.name = 'AuthError';
    this.status = status;
  }
}

export type SyncCaller =
  | { kind: 'cron' }
  | { kind: 'user'; userId: string };

/** Roles permitted to trigger a manual metadata sync. */
export const SYNC_ALLOWED_ROLES = ['owner', 'admin', 'manager', 'tester'] as const;
export type SyncRole = typeof SYNC_ALLOWED_ROLES[number];

/**
 * Verify the caller identity for a sync function.
 * Returns `{ kind: 'cron' }` for pg_cron (trusted), or `{ kind: 'user', userId }`
 * for an authenticated end-user. Throws `AuthError` otherwise.
 */
export async function verifySyncCaller(
  req: Request,
  _admin: SupabaseClient,
): Promise<SyncCaller> {
  // ── 1. Trusted cron bypass ────────────────────────────────────────────────
  const cronSecretHeader = req.headers.get('x-cron-secret');
  const cronSecretEnv = Deno.env.get('CRON_SECRET');
  if (cronSecretEnv && cronSecretHeader && cronSecretHeader === cronSecretEnv) {
    return { kind: 'cron' };
  }

  // ── 2. User JWT verification ──────────────────────────────────────────────
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    throw new AuthError('Missing Authorization header', 401);
  }
  const token = authHeader.replace('Bearer ', '');

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new AuthError('Server mis-configured (missing Supabase env)', 500);
  }

  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: { user }, error } = await userClient.auth.getUser(token);
  if (error || !user) {
    throw new AuthError('Unauthorized', 401);
  }
  return { kind: 'user', userId: user.id };
}

/**
 * Assert that `userId` is a member of `projectId` with one of the
 * `allowedRoles`. Throws `AuthError(403)` if not.
 *
 * Must be called with the admin (service_role) client to bypass RLS.
 */
export async function assertProjectMembership(
  admin: SupabaseClient,
  userId: string,
  projectId: string,
  allowedRoles: readonly string[] = SYNC_ALLOWED_ROLES,
): Promise<void> {
  if (!projectId) {
    throw new AuthError('Missing project_id', 400);
  }
  const { data, error } = await admin
    .from('project_members')
    .select('role')
    .eq('project_id', projectId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('[assertProjectMembership] query error:', error);
    throw new AuthError('Failed to verify project membership', 500);
  }
  if (!data || !allowedRoles.includes(data.role)) {
    throw new AuthError('Forbidden', 403);
  }
}

/**
 * Resolve the set of project_ids that `userId` has sync permission on.
 * Used to narrow `scope=all` requests down to just the caller's projects.
 */
export async function getAuthorizedProjectIds(
  admin: SupabaseClient,
  userId: string,
  allowedRoles: readonly string[] = SYNC_ALLOWED_ROLES,
): Promise<string[]> {
  const { data, error } = await admin
    .from('project_members')
    .select('project_id, role')
    .eq('user_id', userId);
  if (error) {
    console.error('[getAuthorizedProjectIds] query error:', error);
    throw new AuthError('Failed to load project memberships', 500);
  }
  return (data || [])
    .filter((r) => allowedRoles.includes(r.role))
    .map((r) => r.project_id);
}
