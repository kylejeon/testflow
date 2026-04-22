/**
 * useAiFeature — AI 기능별 접근 권한 + credit 정보 훅
 *
 * 백엔드 _shared/ai-config.ts 와 동기화된 프론트엔드 미러 상수.
 * 새 기능 추가 시 양쪽 모두 업데이트 필요.
 *
 * Usage 집계는 owner 단위 shared pool로 수행된다 (src/lib/aiUsage.ts 참조).
 * Dev Spec: pm/specs/dev-spec-ai-usage-shared-pool.md
 */
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { getEffectiveOwnerId, getSharedPoolUsage } from '../lib/aiUsage';

// ─── Plan Limits (백엔드와 동일) ──────────────────────────────────────────────
// 모든 AI 기능은 1 credit/call + mode 무관 shared pool 합산
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
  milestone_risk:        { minTier: 2, creditCost: 1, label: 'AI Milestone Risk' },
  burndown_insight:      { minTier: 3, creditCost: 1, label: 'AI Burndown Insight' },
  issues_analysis:       { minTier: 4, creditCost: 1, label: 'AI Issues Analysis' },
  tag_heatmap_insight:   { minTier: 4, creditCost: 1, label: 'AI Tag Heatmap Insight' },
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
  /** AI 호출 성공 후 usedCredits 재조회. 호출처에서 호출 완료 시 invoke. */
  refetch?: () => void;
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
  const [refetchTick, setRefetchTick] = useState(0);
  const refetch = useCallback(() => {
    console.log('[useAiFeature] refetch triggered for', featureKey);
    setRefetchTick(t => t + 1);
  }, [featureKey]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          console.warn('[useAiFeature] no user session — using DEFAULT_STATE');
          if (!cancelled) setState({ ...DEFAULT_STATE, loading: false, refetch });
          return;
        }

        // Effective tier + billing entity owner 계산 (projects.owner_id 기준)
        const { tier, ownerId } = await getEffectiveOwnerId(user.id);

        const config = AI_FEATURES[featureKey];
        const monthlyLimit = PLAN_LIMITS[tier] ?? -1;

        // Owner 단위 shared pool 사용량 조회 (RPC)
        const usedCredits = await getSharedPoolUsage(ownerId);
        console.log('[useAiFeature]', featureKey, 'tick=', refetchTick, '→ usedCredits=', usedCredits, 'ownerId=', ownerId, 'limit=', monthlyLimit);

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
            refetch,
          });
        }
      } catch (err) {
        console.error('[useAiFeature] load failed:', err);
        if (!cancelled) setState({ ...DEFAULT_STATE, loading: false, refetch });
      }
    }

    load();
    return () => { cancelled = true; };
  }, [featureKey, refetchTick, refetch]);

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

  // 순서 무관하게 동일 key 집합이면 재실행 안 되도록 정렬된 키 문자열을 deps로 사용.
  // featureKeys 참조가 매 렌더 새로 생겨도 집합만 같으면 effect가 재실행되지 않는다.
  const stableKey = featureKeys.slice().sort().join('|');

  useEffect(() => {
    let cancelled = false;
    const keys = stableKey ? (stableKey.split('|') as K[]) : [];

    async function load() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Effective tier + billing entity owner (projects.owner_id 기준)
        const { tier, ownerId } = await getEffectiveOwnerId(user.id);

        const monthlyLimit = PLAN_LIMITS[tier] ?? -1;

        // Owner 단위 shared pool 사용량 (RPC, 한 번만 조회)
        const usedCredits = await getSharedPoolUsage(ownerId);

        const remainingCredits = monthlyLimit === -1 ? -1 : Math.max(0, monthlyLimit - usedCredits);

        const next = {} as Record<K, AiFeatureState>;
        for (const key of keys) {
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
  }, [stableKey]);

  return states;
}
