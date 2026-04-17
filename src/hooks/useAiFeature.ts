/**
 * useAiFeature — AI 기능별 접근 권한 + credit 정보 훅
 *
 * 백엔드 _shared/ai-config.ts 와 동기화된 프론트엔드 미러 상수.
 * 새 기능 추가 시 양쪽 모두 업데이트 필요.
 */
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

// ─── Plan Limits (백엔드와 동일) ──────────────────────────────────────────────
export const PLAN_LIMITS: Record<number, number> = {
  1: 3,    // Free
  2: 15,   // Hobby
  3: 30,   // Starter
  4: 150,  // Professional
  5: -1,   // Enterprise S (무제한)
  6: -1,   // Enterprise M (무제한)
  7: -1,   // Enterprise L (무제한)
};

export const TIER_NAMES: Record<number, string> = {
  1: 'Free',
  2: 'Hobby',
  3: 'Starter',
  4: 'Professional',
  5: 'Enterprise',
  6: 'Enterprise',
  7: 'Enterprise',
};

// ─── AI Feature Config (백엔드 AI_FEATURES와 동기화) ─────────────────────────
export interface AiFeatureConfig {
  minTier: number;
  creditCost: number;
  label: string;
}

export const AI_FEATURES = {
  // ── 기존 기능 ────────────────────────────────────────────────────────────
  tc_generation_text:    { minTier: 1, creditCost: 1, label: 'AI TC Generation (Text)' },
  tc_generation_jira:    { minTier: 2, creditCost: 1, label: 'AI TC Generation (Jira)' },
  tc_generation_session: { minTier: 4, creditCost: 1, label: 'AI TC Generation (Session)' },
  run_summary:           { minTier: 2, creditCost: 1, label: 'AI Run Summary' },
  coverage_gap:          { minTier: 3, creditCost: 1, label: 'Coverage Gap Analysis' },
  flaky_analysis:        { minTier: 3, creditCost: 1, label: 'Flaky Test Analysis' },
  requirement_suggest:   { minTier: 2, creditCost: 1, label: 'Requirement TC Suggestion' },

  // ── 신규 기능 — Test Plans & Milestones 구현 시 활성화 ────────────────────
  plan_assistant:        { minTier: 1, creditCost: 1, label: 'AI Plan Assistant' },
  activity_summary:      { minTier: 2, creditCost: 1, label: 'AI Activity Summary' },
  risk_predictor:        { minTier: 3, creditCost: 1, label: 'AI Risk Predictor' },
  burndown_insight:      { minTier: 3, creditCost: 2, label: 'AI Burndown Insight' },
  issues_analysis:       { minTier: 4, creditCost: 2, label: 'AI Issues Analysis' },
  tag_heatmap_insight:   { minTier: 4, creditCost: 2, label: 'AI Tag Heatmap Insight' },
} as const satisfies Record<string, AiFeatureConfig>;

export type AiFeatureKey = keyof typeof AI_FEATURES;

// ─── Hook Return Type ─────────────────────────────────────────────────────────
export interface AiFeatureState {
  /** 티어 요건 충족 여부 */
  tierOk: boolean;
  /** credit 여유 여부 (tierOk && remaining >= creditCost) */
  canUse: boolean;
  /** 기능 실행 가능 여부 (= tierOk && canUse) */
  available: boolean;
  /** 이 기능에 필요한 최소 tier 번호 */
  requiresTier: number;
  /** 이 기능에 필요한 최소 tier 이름 */
  requiresTierName: string;
  /** 이번 호출의 credit 비용 */
  creditCost: number;
  /** 이번 달 사용한 credit */
  usedCredits: number;
  /** 이번 달 남은 credit (-1 = 무제한) */
  remainingCredits: number;
  /** 월 credit 한도 (-1 = 무제한) */
  monthlyLimit: number;
  /** 현재 사용자 tier */
  currentTier: number;
  loading: boolean;
}

const DEFAULT_STATE: AiFeatureState = {
  tierOk: false,
  canUse: false,
  available: false,
  requiresTier: 1,
  requiresTierName: 'Free',
  creditCost: 1,
  usedCredits: 0,
  remainingCredits: 0,
  monthlyLimit: 0,
  currentTier: 1,
  loading: true,
};

/**
 * AI 기능 접근 권한 훅
 *
 * @example
 * const { available, requiresTierName, creditCost, remainingCredits } =
 *   useAiFeature('plan_assistant');
 *
 * if (!available) {
 *   return <UpgradeModal requiredTier={requiresTierName} creditCost={creditCost} />;
 * }
 */
export function useAiFeature(featureKey: AiFeatureKey): AiFeatureState {
  const [state, setState] = useState<AiFeatureState>(DEFAULT_STATE);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          if (!cancelled) setState({ ...DEFAULT_STATE, loading: false });
          return;
        }

        // 구독 tier 조회 (백엔드 getEffectiveTier와 동일 로직)
        const { data: profile } = await supabase
          .from('profiles')
          .select('subscription_tier, is_trial, trial_ends_at')
          .eq('id', user.id)
          .maybeSingle();

        let tier = profile?.subscription_tier || 1;
        // 만료된 trial은 Free로 처리
        if (profile?.is_trial && profile?.trial_ends_at) {
          if (new Date() > new Date(profile.trial_ends_at)) tier = 1;
        }

        // 자신의 tier가 1이면 소속 프로젝트 owner의 tier도 확인 (effective tier)
        if (tier <= 1) {
          try {
            const { data: memberships } = await supabase
              .from('project_members').select('project_id').eq('user_id', user.id);
            if (memberships?.length) {
              const projectIds = memberships.map((m: any) => m.project_id);
              const { data: owners } = await supabase
                .from('project_members').select('user_id').in('project_id', projectIds).eq('role', 'owner');
              if (owners?.length) {
                const ownerIds = [...new Set(owners.map((o: any) => o.user_id))];
                const { data: ownerProfiles } = await supabase
                  .from('profiles').select('subscription_tier, is_trial, trial_ends_at').in('id', ownerIds);
                for (const p of ownerProfiles || []) {
                  let t = p.subscription_tier || 1;
                  if (p.is_trial && p.trial_ends_at && new Date() > new Date(p.trial_ends_at)) t = 1;
                  if (t > tier) tier = t;
                }
              }
            }
          } catch { /* silent — fall back to own tier */ }
        }

        const config = AI_FEATURES[featureKey];
        const monthlyLimit = PLAN_LIMITS[tier] ?? -1;

        // 당월 사용 credit 합산 (credits_used 컬럼 SUM)
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const { data: logs } = await supabase
          .from('ai_generation_logs')
          .select('credits_used')
          .eq('user_id', user.id)
          .eq('step', 1)
          .gte('created_at', startOfMonth.toISOString());

        const usedCredits = (logs ?? []).reduce(
          (acc, row) => acc + ((row as any).credits_used ?? 1),
          0,
        );

        const tierOk = tier >= config.minTier;
        const remainingCredits = monthlyLimit === -1 ? -1 : Math.max(0, monthlyLimit - usedCredits);
        const canUse = monthlyLimit === -1 || remainingCredits >= config.creditCost;

        if (!cancelled) {
          setState({
            tierOk,
            canUse,
            available: tierOk && canUse,
            requiresTier: config.minTier,
            requiresTierName: TIER_NAMES[config.minTier] ?? 'Professional',
            creditCost: config.creditCost,
            usedCredits,
            remainingCredits,
            monthlyLimit,
            currentTier: tier,
            loading: false,
          });
        }
      } catch {
        if (!cancelled) setState({ ...DEFAULT_STATE, loading: false });
      }
    }

    load();
    return () => { cancelled = true; };
  }, [featureKey]);

  return state;
}

/**
 * 여러 AI 기능 상태를 한번에 조회
 *
 * @example
 * const features = useAiFeatures(['plan_assistant', 'risk_predictor']);
 * features.plan_assistant.available   // true / false
 * features.risk_predictor.creditCost  // 2
 */
export function useAiFeatures<K extends AiFeatureKey>(
  featureKeys: K[],
): Record<K, AiFeatureState> {
  const [states, setStates] = useState<Record<K, AiFeatureState>>(
    () => Object.fromEntries(featureKeys.map(k => [k, DEFAULT_STATE])) as Record<K, AiFeatureState>,
  );

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profile } = await supabase
          .from('profiles')
          .select('subscription_tier, is_trial, trial_ends_at')
          .eq('id', user.id)
          .maybeSingle();

        let tier = profile?.subscription_tier || 1;
        if (profile?.is_trial && profile?.trial_ends_at) {
          if (new Date() > new Date(profile.trial_ends_at)) tier = 1;
        }

        if (tier <= 1) {
          try {
            const { data: memberships } = await supabase
              .from('project_members').select('project_id').eq('user_id', user.id);
            if (memberships?.length) {
              const projectIds = memberships.map((m: any) => m.project_id);
              const { data: owners } = await supabase
                .from('project_members').select('user_id').in('project_id', projectIds).eq('role', 'owner');
              if (owners?.length) {
                const ownerIds = [...new Set(owners.map((o: any) => o.user_id))];
                const { data: ownerProfiles } = await supabase
                  .from('profiles').select('subscription_tier, is_trial, trial_ends_at').in('id', ownerIds);
                for (const p of ownerProfiles || []) {
                  let t = p.subscription_tier || 1;
                  if (p.is_trial && p.trial_ends_at && new Date() > new Date(p.trial_ends_at)) t = 1;
                  if (t > tier) tier = t;
                }
              }
            }
          } catch { /* silent */ }
        }

        const monthlyLimit = PLAN_LIMITS[tier] ?? -1;

        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const { data: logs } = await supabase
          .from('ai_generation_logs')
          .select('credits_used')
          .eq('user_id', user.id)
          .eq('step', 1)
          .gte('created_at', startOfMonth.toISOString());

        const usedCredits = (logs ?? []).reduce(
          (acc, row) => acc + ((row as any).credits_used ?? 1),
          0,
        );

        const remainingCredits = monthlyLimit === -1 ? -1 : Math.max(0, monthlyLimit - usedCredits);

        const next = {} as Record<K, AiFeatureState>;
        for (const key of featureKeys) {
          const config = AI_FEATURES[key];
          const tierOk = tier >= config.minTier;
          const canUse = monthlyLimit === -1 || remainingCredits >= config.creditCost;
          next[key] = {
            tierOk,
            canUse,
            available: tierOk && canUse,
            requiresTier: config.minTier,
            requiresTierName: TIER_NAMES[config.minTier] ?? 'Professional',
            creditCost: config.creditCost,
            usedCredits,
            remainingCredits,
            monthlyLimit,
            currentTier: tier,
            loading: false,
          };
        }

        if (!cancelled) setStates(next);
      } catch {
        // silent
      }
    }

    load();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [featureKeys.join(',')]);

  return states;
}
