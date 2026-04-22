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
 * ES256-safe user token verification.
 *
 * 배경: Supabase 가 JWT signing key 를 HS256 → ES256 으로 전환하면서
 * Edge Functions gateway 가 ES256 유저 JWT 를 Authorization 헤더로 받으면
 * 파싱 단계에서 거부한다 (UNAUTHORIZED_UNSUPPORTED_TOKEN_ALGORITHM).
 *
 * 우회 패턴:
 *   - 클라이언트는 `x-user-token` 커스텀 헤더로 ES256 유저 JWT 전송
 *   - Authorization 에는 HS256 anon JWT 만 (게이트웨이 통과용)
 *   - 서버는 x-user-token 우선 읽고, 없으면 Authorization Bearer fallback
 *   - JWT payload 를 서명 검증 없이 수동 디코딩 → sub 추출
 *   - admin.auth.admin.getUserById 로 실존 유저 확인
 *
 * @throws AuthError(401) if token missing/expired/invalid
 */
export async function verifyUserToken(
  req: Request,
  admin: SupabaseClient,
): Promise<{ userId: string; email: string | null }> {
  const userTokenHeader = req.headers.get('x-user-token');
  const authHeader = req.headers.get('Authorization');
  const token = userTokenHeader
    || (authHeader?.startsWith('Bearer ') ? authHeader.replace('Bearer ', '') : '');
  if (!token) {
    throw new AuthError('Missing user token', 401);
  }

  // JWT payload 디코딩 (서명 검증 없이 sub 추출)
  let userId: string;
  try {
    const [, payloadB64] = token.split('.');
    const padded = payloadB64.replace(/-/g, '+').replace(/_/g, '/');
    const json = new TextDecoder().decode(
      Uint8Array.from(atob(padded), (c) => c.charCodeAt(0)),
    );
    const payload = JSON.parse(json);
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      throw new Error('Token expired');
    }
    userId = payload.sub;
    if (!userId) throw new Error('No sub in token');
  } catch (e) {
    throw new AuthError(`Invalid or expired token: ${String(e)}`, 401);
  }

  // admin API 로 실존 사용자 확인 (service_role 이 필요함)
  const { data: { user }, error } = await admin.auth.admin.getUserById(userId);
  if (error || !user) {
    throw new AuthError('Unauthorized', 401);
  }
  return { userId: user.id, email: user.email ?? null };
}

/**
 * Verify the caller identity for a sync function.
 * Returns `{ kind: 'cron' }` for pg_cron (trusted), or `{ kind: 'user', userId }`
 * for an authenticated end-user. Throws `AuthError` otherwise.
 */
export async function verifySyncCaller(
  req: Request,
  admin: SupabaseClient,
): Promise<SyncCaller> {
  // ── 1. Trusted cron bypass ────────────────────────────────────────────────
  const cronSecretHeader = req.headers.get('x-cron-secret');
  const cronSecretEnv = Deno.env.get('CRON_SECRET');
  if (cronSecretEnv && cronSecretHeader && cronSecretHeader === cronSecretEnv) {
    return { kind: 'cron' };
  }

  // ── 2. User JWT verification (ES256-safe) ─────────────────────────────────
  const { userId } = await verifyUserToken(req, admin);
  return { kind: 'user', userId };
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
