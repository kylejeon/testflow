/**
 * f001 — Environment AI Insights types
 *
 * Client-side mirror of the Edge Function response (supabase/functions/env-ai-insights/index.ts).
 * Keep in sync with server schema — see docs/specs/dev-spec-f001-f002-env-ai-insights.md §5.
 */

export interface EnvAiInsightsMeta {
  from_cache: boolean;
  credits_used: 0 | 1;
  /** -1 = unlimited */
  credits_remaining: number;
  /** -1 = unlimited */
  monthly_limit: number;
  tokens_used: number;
  latency_ms: number;
  log_id?: string | null;
  /** f018 race-lost 응답 시 true */
  rate_limited_post_check?: boolean;
  /** f018 RPC 실패 fallback 시 false */
  credits_logged?: boolean;
  /** executed < 5 short-circuit */
  too_little_data?: boolean;
  /** Cached payload에만 저장되는 locale */
  locale?: 'en' | 'ko';
  /** input_snapshot (캐시 payload 내부) */
  input_snapshot?: {
    total_tcs?: number;
    total_envs?: number;
    overall_pass_rate?: number;
    executed_count?: number;
  };
  /** 구체 에러 (200 with error flag) */
  error?: string;
}

/**
 * Claude-generated coverage insight.
 *
 * - `too_little_data === true` → 나머지 필드는 전부 null / 빈 배열,
 *   credits_used = 0, Claude 호출 skip.
 * - `critical_env` 는 env name 또는 browser_name (rule-based critical과 동일)
 */
export interface EnvAiInsightsResult {
  headline: string | null;
  critical_env: string | null;
  critical_reason: string | null;
  coverage_gap_tc: string | null;
  coverage_gap_reason: string | null;
  recommendations: string[];
  /** 0..100 integer */
  confidence: number;
  too_little_data?: boolean;
  /** ISO 8601 */
  generated_at: string;
  meta: EnvAiInsightsMeta;
}

/**
 * Edge Function error response shape.
 * Note: 'monthly_limit_reached' race-lost 은 EnvAiInsightsResult 필드를 함께 보존하므로
 *       핸들러 쪽에서는 200/429 양쪽을 모두 AI payload 로 해석할 수 있다.
 */
export interface EnvAiInsightsError {
  error:
    | 'bad_request'
    | 'unauthorized'
    | 'forbidden'
    | 'not_found'
    | 'tier_too_low'
    | 'rate_limited'
    | 'monthly_limit_reached'
    | 'upstream_rate_limit'
    | 'ai_timeout'
    | 'ai_parse_failed'
    | 'internal'
    | 'network';
  detail?: string;
  used?: number;
  limit?: number;
  requiredTier?: number;
  retry_after_sec?: number;
  upgradeUrl?: string;
  raw_snippet?: string;
}

/** Issue pre-fill payload sent from EnvironmentAIInsights → IssueCreateInlineModal. */
export interface IssueCreatePrefill {
  title: string;
  description: string;
  envName?: string;
  tcTitle?: string;
  /** 'ai' 이면 AI insight 로부터, 'rule' 이면 rule-based detail 로부터 생성 */
  source: 'ai' | 'rule';
}
