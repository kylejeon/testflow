/**
 * AI Usage Shared Pool — Internal-only configuration.
 *
 * Subscription tiers and cross-org billing aggregation are no longer enforced.
 * Every authenticated user acts as their own billing entity with the highest
 * tier value (7). The monthly cap is centralized in
 * `src/hooks/useAiFeature.ts` (`INTERNAL_MONTHLY_AI_LIMIT`).
 *
 * The `get_ai_shared_pool_usage` RPC is still called to surface actual
 * consumption per user — admins can watch this via Supabase dashboards or
 * the in-app AI Usage panel.
 */

import { supabase } from './supabase';

export interface EffectiveTierInfo {
  tier: number;
  ownerId: string;
}

/** UTC 기준 해당 월 1일 00:00:00 */
export function startOfUtcMonth(): Date {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1, 0, 0, 0, 0));
}

/**
 * Effective billing entity = the user themselves. Tier is constant 7 so
 * any `tier >= minTier` check downstream passes trivially.
 */
export async function getEffectiveOwnerId(userId: string): Promise<EffectiveTierInfo> {
  return { tier: 7, ownerId: userId };
}

/**
 * Per-user monthly credit usage. RPC may fail; we return 0 on error to avoid
 * blocking UX — server-side enforcement is the source of truth.
 */
export async function getSharedPoolUsage(
  ownerId: string,
  monthStart?: Date,
): Promise<number> {
  if (!ownerId) return 0;
  const start = monthStart ?? startOfUtcMonth();
  const { data, error } = await supabase.rpc('get_ai_shared_pool_usage', {
    p_owner_id: ownerId,
    p_month_start: start.toISOString(),
  });
  if (error) {
    console.error('[aiUsage] get_ai_shared_pool_usage error:', error, 'ownerId=', ownerId);
    return 0;
  }
  const n = Number(data ?? 0);
  return Number.isFinite(n) ? n : 0;
}

/** Current user's monthly AI credit usage. */
export async function getMySharedPoolUsage(): Promise<number> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 0;
  const { ownerId } = await getEffectiveOwnerId(user.id);
  return getSharedPoolUsage(ownerId);
}
