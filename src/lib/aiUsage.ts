/**
 * AI Usage Shared Pool — 프론트 공통 헬퍼
 *
 * 관련 스펙: pm/specs/dev-spec-ai-usage-shared-pool.md §4-1 / §6-1
 *
 * 정책:
 *   Billing entity  = projects.owner_id (owner)
 *   Usage scope     = owner ∪ owner 소유 프로젝트 멤버 전원
 *   Aggregate       = SUM(COALESCE(credits_used, 1)) WHERE step=1 AND created_at >= startOfUtcMonth
 *   Tier            = 본인 tier > 1 이면 self, 아니면 소속 프로젝트 owner 중 최고 tier
 *
 * ⚠ 백엔드 supabase/functions/_shared/ai-usage.ts 와 로직 동기화 필수.
 * ⚠ owner 팀 전체 합계는 RLS를 우회해야 하므로 SECURITY DEFINER RPC
 *    `get_ai_shared_pool_usage` 를 호출한다.
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
 * 유효 구독 tier + billing entity owner 식별.
 *
 * 우선순위:
 *   1) 본인 tier > 1 이면 self (본인이 billing entity)
 *   2) 그렇지 않으면 소속 프로젝트의 owner_id 중 최고 tier owner
 *   3) 모두 실패하면 self
 */
export async function getEffectiveOwnerId(userId: string): Promise<EffectiveTierInfo> {
  // 1. 본인 tier
  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_tier, is_trial, trial_ends_at')
    .eq('id', userId)
    .maybeSingle();

  let ownTier = (profile as any)?.subscription_tier || 1;
  if ((profile as any)?.is_trial && (profile as any)?.trial_ends_at) {
    if (new Date() > new Date((profile as any).trial_ends_at)) ownTier = 1;
  }

  if (ownTier > 1) return { tier: ownTier, ownerId: userId };

  // 2. 소속 프로젝트 owner 조회
  const { data: memberships } = await supabase
    .from('project_members')
    .select('project_id')
    .eq('user_id', userId);

  if (!memberships?.length) return { tier: ownTier, ownerId: userId };

  const projectIds = (memberships as any[]).map((m: any) => m.project_id);

  const { data: projects } = await supabase
    .from('projects')
    .select('id, owner_id')
    .in('id', projectIds);

  if (!projects?.length) return { tier: ownTier, ownerId: userId };

  const ownerIds = [...new Set(
    (projects as any[]).map((p: any) => p.owner_id).filter(Boolean),
  )];

  if (ownerIds.length === 0) return { tier: ownTier, ownerId: userId };

  const { data: ownerProfiles } = await supabase
    .from('profiles')
    .select('id, subscription_tier, is_trial, trial_ends_at')
    .in('id', ownerIds);

  let bestTier = ownTier;
  let bestOwnerId = userId;
  for (const p of (ownerProfiles as any[] ?? [])) {
    let t = p.subscription_tier || 1;
    if (p.is_trial && p.trial_ends_at && new Date() > new Date(p.trial_ends_at)) t = 1;
    if (t > bestTier) {
      bestTier = t;
      bestOwnerId = p.id;
    }
  }
  return { tier: bestTier, ownerId: bestOwnerId };
}

/**
 * owner의 이번 달 shared pool 사용량 (credits SUM).
 * RLS 통과를 위해 SECURITY DEFINER RPC `get_ai_shared_pool_usage` 호출.
 * 실패 시 0 반환 (UX 블로킹 회피 — quota 검증은 서버 측에서 재수행됨).
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
  console.log('[aiUsage] getSharedPoolUsage returned', n, 'for ownerId=', ownerId);
  return Number.isFinite(n) ? n : 0;
}

/**
 * 현재 로그인 사용자 기준 effective owner의 이번 달 shared pool 사용량.
 * getEffectiveOwnerId + getSharedPoolUsage를 결합한 편의 함수.
 */
export async function getMySharedPoolUsage(): Promise<number> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 0;
  const { ownerId } = await getEffectiveOwnerId(user.id);
  return getSharedPoolUsage(ownerId);
}
