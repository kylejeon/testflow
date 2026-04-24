/**
 * f012 — Plan-aware rate limit for IssuesList manual refresh.
 *
 * sync-jira-metadata / sync-github-metadata 에서 scope='run_ids' (manual refresh)
 * 경로에 공통 적용.
 *
 * Free  (tier 1): 1 refresh / 12h — capacity 1, refill 1/43200 tokens/sec
 * Hobby (tier 2): 3 refresh / 24h — capacity 3, refill 1/28800 tokens/sec
 * Starter (tier 3): 10 / 1h        — capacity 10, refill 10/3600 tokens/sec
 * Pro+ (tier 4+): 60 / 1h          — capacity 60, refill 60/3600 tokens/sec
 *
 * 서버 측에서 owner 기준으로 쿼터 관리 → 같은 워크스페이스의 여러 멤버가 spam 하면
 * 공동 쿼터를 빠르게 소진함. 의도된 설계 — owner 가 limits 을 공유.
 */

import type { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { checkRateLimit, type RateLimitConfig, type RateLimitResult } from './rate-limit.ts';

type SB = ReturnType<typeof createClient>;

export const ISSUES_REFRESH_SCOPE = 'issues_refresh';

/**
 * Plan-aware config for IssuesList refresh.
 * tier: 1 = Free, 2 = Hobby, 3 = Starter, 4+ = Professional / Enterprise
 */
export function getIssuesRefreshConfig(tier: number): RateLimitConfig {
  if (tier <= 1) {
    // Free: 1 per 12h
    return { capacity: 1, refillRate: 1 / (12 * 3600) };
  }
  if (tier === 2) {
    // Hobby: 3 per day (24h)
    return { capacity: 3, refillRate: 3 / (24 * 3600) };
  }
  if (tier === 3) {
    // Starter: 10 per hour
    return { capacity: 10, refillRate: 10 / 3600 };
  }
  // Professional / Enterprise: 60 per hour (effectively unlimited for UX)
  return { capacity: 60, refillRate: 60 / 3600 };
}

/**
 * Apply plan-aware rate limit for `ownerId`.
 *
 * - owner 기준 (billing entity). 여러 프로젝트 / 여러 sync 함수 가 같은 bucket 공유.
 * - tier 조회 실패 시 tier=1 (Free) 로 fallback — fail-safe.
 */
export async function checkIssuesRefreshLimit(
  supabase: SB,
  ownerId: string,
  tier: number,
): Promise<RateLimitResult & { tierUsed: number }> {
  const config = getIssuesRefreshConfig(tier);
  const result = await checkRateLimit(supabase, ownerId, ISSUES_REFRESH_SCOPE, config);
  return { ...result, tierUsed: tier };
}

/**
 * 429 응답 body 의 표준 포맷.
 * UI 가 error code 로 분기할 수 있도록 `error: 'issues_refresh_rate_limit'` 명시.
 */
export function issuesRefreshRateLimitBody(
  result: RateLimitResult,
  tier: number,
) {
  const retry = Math.ceil(result.retryAfterSeconds ?? 60);
  return {
    success: false,
    error: 'issues_refresh_rate_limit',
    message: `Issues refresh quota exceeded for your plan. Retry after ${retry} seconds.`,
    retry_after_seconds: retry,
    tokens_remaining: Math.max(0, Math.floor(result.tokensRemaining)),
    tier,
  };
}
