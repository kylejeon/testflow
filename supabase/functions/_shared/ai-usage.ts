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
 * Owner 팀의 user_id 목록 반환 (owner 본인 + owner 소유 프로젝트의 모든 멤버)
 *
 * - owner 소유 프로젝트가 없으면 [ownerId] 단일 배열
 * - 팀 멤버 중복은 Set 으로 제거
 *
 * AI 캐시 조회(`ai_generation_logs` SELECT)와 shared pool credit 집계의
 * 공통 범위로 사용한다. 프론트(RLS 우회 필요)는 대응 RPC
 * `get_owner_team_user_ids` 를 통해 동일 목록을 얻는다.
 */
export async function getOwnerTeamUserIds(
  supabase: SB,
  ownerId: string,
): Promise<string[]> {
  if (!ownerId) return [];

  const { data: ownerProjects } = await supabase
    .from('projects')
    .select('id')
    .eq('owner_id', ownerId);

  if (!ownerProjects || (ownerProjects as any[]).length === 0) {
    return [ownerId];
  }

  const projectIds = (ownerProjects as any[]).map((p: any) => p.id);
  const { data: members } = await supabase
    .from('project_members')
    .select('user_id')
    .in('project_id', projectIds);

  return [...new Set([
    ownerId,
    ...(((members as any[]) ?? []).map((m: any) => m.user_id).filter(Boolean)),
  ])];
}

/**
 * owner의 이번 달 shared pool 사용량 (credits SUM)
 * - owner 팀 user_id 목록을 `getOwnerTeamUserIds` 로 조회
 * - 소유 프로젝트가 0개면 owner 본인 로그만 집계
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

  const memberIds = await getOwnerTeamUserIds(supabase, ownerId);
  if (memberIds.length === 0) return 0;

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
 * ⚠ pre-flight ONLY. 실제 원자성 보장은 `consume_ai_credit_and_log` RPC
 *    (20260424_f018_ai_credit_atomic_consume_rpc.sql) 에서 owner 단위
 *    advisory lock + re-check + INSERT 로 처리한다. 이 함수의 반환값은
 *    tier gate + UX hint 용도이며, Claude API 호출 이후의 최종 차감은
 *    `consumeAiCredit()` 헬퍼를 통해 수행해야 한다 (f018).
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

  // Unlimited plan — quota check는 skip하되 usage는 계산 (Dev Spec BR-6)
  // Enterprise tier도 관리자 모니터링/Dashboard 표시를 위해 실제 사용량 계산 유지.
  const limit = PLAN_LIMITS[tier] ?? -1;
  if (limit === -1) {
    const usage = await getSharedPoolUsage(supabase, ownerId);
    return {
      allowed: true,
      tier,
      ownerId,
      usage,
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

// ─── f018 — Atomic credit consume ────────────────────────────────────────────

/**
 * consume_ai_credit_and_log RPC 호출 파라미터.
 *
 * 대응 SQL: supabase/migrations/20260424_f018_ai_credit_atomic_consume_rpc.sql
 */
export interface ConsumeAiCreditParams {
  userId: string;
  ownerId: string;
  projectId: string | null;
  mode: string;
  step: number;
  creditCost: number;
  /** PLAN_LIMITS[tier] ?? -1. -1 = unlimited. */
  limit: number;
  tokensUsed?: number;
  latencyMs?: number;
  inputData?: Record<string, unknown> | null;
  outputData?: unknown;
  titlesGenerated?: number | null;
  titlesSelected?: number | null;
  modelUsed?: string | null;
  sessionId?: string | null;
  inputText?: string | null;
}

/**
 * consume_ai_credit_and_log RPC 반환 JSON (타입 안전).
 *
 * - allowed=true  → INSERT 수행됨, used=INSERT 이후 합계
 * - allowed=false → INSERT 안 됨, reason='quota_exceeded'
 */
export interface ConsumeAiCreditResult {
  allowed: boolean;
  used: number;
  limit: number;
  creditCost: number;
  logId: string | null;
  reason: 'quota_exceeded' | null;
}

/**
 * RPC 호출 실패 (DB error) 시 throw 되는 에러 타입.
 * Edge Function 은 이 에러를 catch 하여 AC-14 fallback (AI payload 보존)
 * 을 수행해야 한다.
 */
export class ConsumeAiCreditError extends Error {
  readonly cause: unknown;
  constructor(message: string, cause: unknown) {
    super(message);
    this.name = 'ConsumeAiCreditError';
    this.cause = cause;
  }
}

/**
 * `consume_ai_credit_and_log` RPC 를 호출하여 AI credit 을 원자적으로
 * 소비하고 `ai_generation_logs` 에 INSERT 한다. owner 단위 advisory lock
 * 아래에서 usage 를 재검증하므로 concurrent 호출 시에도 limit over-shoot
 * 이 발생하지 않는다 (f018).
 *
 * 호출자는 이 함수 호출 전에 `checkAiAccess` 로 tier gate 를 통과한 상태이며,
 * Claude API 호출도 이미 완료한 상태여야 한다. (Dev Spec §4-1 Happy Path)
 *
 * RPC 자체 실패 (error 반환) 시 `ConsumeAiCreditError` 를 throw. 호출자는
 * AC-14 에 따라 AI payload 를 보존하고 `meta.credits_logged:false` 로 응답.
 */
export async function consumeAiCredit(
  supabase: SB,
  params: ConsumeAiCreditParams,
): Promise<ConsumeAiCreditResult> {
  const { data, error } = await supabase.rpc('consume_ai_credit_and_log', {
    p_user_id: params.userId,
    p_owner_id: params.ownerId,
    p_project_id: params.projectId,
    p_mode: params.mode,
    p_step: params.step,
    p_credit_cost: params.creditCost,
    p_limit: params.limit,
    p_tokens_used: params.tokensUsed ?? 0,
    p_latency_ms: params.latencyMs ?? 0,
    p_input_data: params.inputData ?? null,
    p_output_data: params.outputData ?? null,
    p_titles_generated: params.titlesGenerated ?? null,
    p_titles_selected: params.titlesSelected ?? null,
    p_model_used: params.modelUsed ?? null,
    p_session_id: params.sessionId ?? null,
    p_input_text: params.inputText ?? null,
  });

  if (error) {
    throw new ConsumeAiCreditError(
      `[f018] consume_ai_credit_and_log failed: ${error.message ?? 'unknown error'}`,
      error,
    );
  }

  if (!data || typeof data !== 'object') {
    throw new ConsumeAiCreditError(
      '[f018] consume_ai_credit_and_log returned empty payload',
      data,
    );
  }

  const row = data as Record<string, unknown>;
  return {
    allowed: row.allowed === true,
    used: Number(row.used ?? 0),
    limit: Number(row.limit ?? -1),
    creditCost: Number(row.credit_cost ?? params.creditCost),
    logId: (row.log_id as string | null | undefined) ?? null,
    reason: row.reason === 'quota_exceeded' ? 'quota_exceeded' : null,
  };
}

