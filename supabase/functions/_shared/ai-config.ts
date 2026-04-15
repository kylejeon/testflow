/**
 * AI 기능 중앙 설정 — 백엔드 Edge Function 공유 모듈
 *
 * 이 파일은 순수 상수/타입만 포함합니다. DB 접근 로직은 각 Edge Function에 위치.
 * 프론트엔드는 src/hooks/useAiFeature.ts에 동일 내용을 미러링합니다.
 */

// ─── Plan Limits (월 credit 한도) ────────────────────────────────────────────
// 1 credit = AI 기능 호출 1회분 기본 단위. 기능에 따라 1~2 credit 차감.
export const PLAN_LIMITS: Record<number, number> = {
  1: 3,    // Free
  2: 15,   // Hobby
  3: 30,   // Starter
  4: 150,  // Professional
  5: -1,   // Enterprise S (무제한)
  6: -1,   // Enterprise M (무제한)
  7: -1,   // Enterprise L (무제한)
};

// ─── Tier Names ───────────────────────────────────────────────────────────────
export const TIER_NAMES: Record<number, string> = {
  1: 'Free',
  2: 'Hobby',
  3: 'Starter',
  4: 'Professional',
  5: 'Enterprise',
  6: 'Enterprise',
  7: 'Enterprise',
};

// ─── AI Feature Config ────────────────────────────────────────────────────────
export interface AiFeatureConfig {
  /** 최소 요구 구독 tier */
  minTier: number;
  /** 호출 1회당 차감 credit (1 또는 2) */
  creditCost: number;
  /** UI 표시용 기능명 */
  label: string;
  /** DB ai_generation_logs.mode 값 */
  mode: string;
}

export const AI_FEATURES = {
  // ── 기존 기능 ─────────────────────────────────────────────────────────────
  tc_generation_text: {
    minTier: 1, creditCost: 1,
    label: 'AI TC Generation (Text)',
    mode: 'text',
  },
  tc_generation_jira: {
    minTier: 2, creditCost: 1,
    label: 'AI TC Generation (Jira)',
    mode: 'jira',
  },
  tc_generation_session: {
    minTier: 4, creditCost: 1,
    label: 'AI TC Generation (Session)',
    mode: 'session',
  },
  run_summary: {
    minTier: 2, creditCost: 1,
    label: 'AI Run Summary',
    mode: 'run-summary',
  },
  coverage_gap: {
    minTier: 3, creditCost: 1,
    label: 'Coverage Gap Analysis',
    mode: 'run-summary',  // logs under 'run-summary' action
  },
  flaky_analysis: {
    minTier: 3, creditCost: 1,
    label: 'Flaky Test Analysis',
    mode: 'run-summary',  // logs under 'run-summary' action
  },
  requirement_suggest: {
    minTier: 2, creditCost: 1,
    label: 'Requirement TC Suggestion',
    mode: 'requirement-suggest',
  },

  // ── 신규 기능 — Test Plans & Milestones 구현 시 함께 활성화 ────────────────
  plan_assistant: {
    minTier: 1, creditCost: 1,
    label: 'AI Plan Assistant',
    mode: 'plan-assistant',
  },
  activity_summary: {
    minTier: 2, creditCost: 1,
    label: 'AI Activity Summary',
    mode: 'activity-summary',
  },
  risk_predictor: {
    minTier: 3, creditCost: 2,
    label: 'AI Risk Predictor',
    mode: 'risk-predictor',
  },
  burndown_insight: {
    minTier: 3, creditCost: 2,
    label: 'AI Burndown Insight',
    mode: 'burndown-insight',
  },
  issues_analysis: {
    minTier: 4, creditCost: 2,
    label: 'AI Issues Analysis',
    mode: 'issues-analysis',
  },
  tag_heatmap_insight: {
    minTier: 4, creditCost: 2,
    label: 'AI Tag Heatmap Insight',
    mode: 'tag-heatmap-insight',
  },
} as const satisfies Record<string, AiFeatureConfig>;

export type AiFeatureKey = keyof typeof AI_FEATURES;

// ─── Access Check Result ──────────────────────────────────────────────────────
export interface AiAccessResult {
  allowed: boolean;
  tier: number;
  ownerId: string;
  /** 당월 사용 credit 합계 */
  usage: number;
  /** 월 credit 한도 (-1 = 무제한) */
  limit: number;
  /** 이번 호출의 credit 비용 */
  creditCost: number;
  error?: string;
  requiredTier?: number;
  upgradeUrl?: string;
}
