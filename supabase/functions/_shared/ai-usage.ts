/**
 * AI Usage Shared Pool — 백엔드 공통 헬퍼
 *
 * 관련 스펙: pm/specs/dev-spec-ai-usage-shared-pool.md §4-1 / §6-2
 *
 * 정책:
 *   Billing entity  = projects.owner_id (owner)
 *   Usage scope     = owner ∪ owner 소유 프로젝트의 멤버 전원
 *   Aggregate       = SUM(COALESCE(credits_used, 1)) WHERE step=1 AND created_at >= startOfUtcMonth
 *   Tier            = 본인 tier > 1 이면 self, 아니면 소속 프로젝트 owner 중 최고 tier
 *
 * ⚠ 프론트 src/lib/aiUsage.ts 와 로직 동기화 필수.
 * ⚠ 호출자는 service_role client를 넘겨야 함 (RLS 우회 + projects.owner_id 조회).
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import {
  AI_FEATURES,
  PLAN_LIMITS,
  TIER_NAMES,
  type AiFeatureKey,
  type AiAccessResult,
} from './ai-config.ts';

type SB = ReturnType<typeof createClient>;

/** UTC 기준 해당 월 1일 00:00:00 */
export function startOfUtcMonth(): Date {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1, 0, 0, 0, 0));
}

/**
 * 유효 구독 tier + billing entity owner 식별
 * owner 식별은 projects.owner_id 기준으로 통일 (project_members.role='owner' 사용 금지).
 */
export async function getEffectiveTier(
  supabase: SB,
  userId: string,
): Promise<{ tier: number; ownerId: string }> {
  // 1. 본인 tier 조회
  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_tier, is_trial, trial_ends_at')
    .eq('id', userId)
    .maybeSingle();

  let ownTier = (profile as any)?.subscription_tier || 1;
  if ((profile as any)?.is_trial && (profile as any)?.trial_ends_at) {
    if (new Date() > new Date((profile as any).trial_ends_at)) ownTier = 1;
  }

  // 2. 본인이 유료면 본인 기준
  if (ownTier > 1) return { tier: ownTier, ownerId: userId };

  // 3. 소속 프로젝트 owner 조회 (projects.owner_id 기준)
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
 * owner의 이번 달 shared pool 사용량 (credits SUM)
 * - owner 소유 프로젝트가 0개면 owner 본인 로그만 집계
 * - 소유 프로젝트가 있으면 owner + 모든 프로젝트 멤버 로그를 합산
 * - credits_used IS NULL 은 1로 집계
 */
export async function getSharedPoolUsage(
  supabase: SB,
  ownerId: string,
  monthStart?: Date,
): Promise<number> {
  if (!ownerId) return 0;

  const start = monthStart ?? startOfUtcMonth();

  const sumRows = (rows: any[]): number =>
    rows.reduce((acc, r) => acc + (r.credits_used ?? 1), 0);

  // 1. owner 소유 프로젝트 목록
  const { data: ownerProjects } = await supabase
    .from('projects')
    .select('id')
    .eq('owner_id', ownerId);

  if (!ownerProjects || (ownerProjects as any[]).length === 0) {
    // owner 본인만 집계 (프로젝트 없는 Free 단독 사용자 포함)
    const { data } = await supabase
      .from('ai_generation_logs')
      .select('credits_used')
      .eq('user_id', ownerId)
      .eq('step', 1)
      .gte('created_at', start.toISOString());
    return sumRows((data as any[]) ?? []);
  }

  // 2. 해당 프로젝트들의 모든 멤버
  const projectIds = (ownerProjects as any[]).map((p: any) => p.id);
  const { data: members } = await supabase
    .from('project_members')
    .select('user_id')
    .in('project_id', projectIds);

  const memberIds = [...new Set([
    ownerId,
    ...(((members as any[]) ?? []).map((m: any) => m.user_id)),
  ])];

  // 3. 팀 전체 credit 합산
  const { data } = await supabase
    .from('ai_generation_logs')
    .select('credits_used')
    .in('user_id', memberIds)
    .eq('step', 1)
    .gte('created_at', start.toISOString());

  return sumRows((data as any[]) ?? []);
}

/**
 * AI 기능 접근 통합 체크 — tier gate + credit quota 동시 검사.
 *
 * 반환 필드:
 *   - allowed    : 호출 허용 여부
 *   - tier       : 유효 tier
 *   - ownerId    : billing entity (로그 insert 시 user_id는 호출자를 사용하되,
 *                  quota 계산은 이 ownerId 기준 shared pool로 수행)
 *   - usage/limit: 현재 사용량/월 한도 (-1 = 무제한)
 *   - creditCost : 이번 호출 비용
 *   - error/requiredTier/upgradeUrl : 거부 시 응답 구성용
 */
export async function checkAiAccess(
  supabase: SB,
  userId: string,
  featureKey: AiFeatureKey,
): Promise<AiAccessResult> {
  const config = AI_FEATURES[featureKey];
  const { tier, ownerId } = await getEffectiveTier(supabase, userId);

  // Tier gate
  if (tier < config.minTier) {
    const tierName = TIER_NAMES[config.minTier] ?? 'Professional';
    return {
      allowed: false,
      tier,
      ownerId,
      usage: 0,
      limit: 0,
      creditCost: config.creditCost,
      error: `${tierName} plan required`,
      requiredTier: config.minTier,
      upgradeUrl: '/settings?tab=billing',
    };
  }

  // Unlimited plan — skip quota check
  const limit = PLAN_LIMITS[tier] ?? -1;
  if (limit === -1) {
    return {
      allowed: true,
      tier,
      ownerId,
      usage: 0,
      limit: -1,
      creditCost: config.creditCost,
    };
  }

  // Credit quota (owner 단위 shared pool)
  const usage = await getSharedPoolUsage(supabase, ownerId);
  if (limit - usage < config.creditCost) {
    return {
      allowed: false,
      tier,
      ownerId,
      usage,
      limit,
      creditCost: config.creditCost,
      error: 'Monthly AI credit limit reached.',
      upgradeUrl: '/settings?tab=billing',
    };
  }

  return {
    allowed: true,
    tier,
    ownerId,
    usage,
    limit,
    creditCost: config.creditCost,
  };
}
