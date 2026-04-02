/**
 * P2: Token Bucket Rate Limiting — Shared Deno Module
 *
 * 사용법:
 *   import { checkRateLimit, RATE_CONFIGS } from '../_shared/rate-limit.ts';
 *   const result = await checkRateLimit(supabase, userId, 'ci_upload');
 *   if (!result.allowed) return rateLimitResponse(result);
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

// ── Scope별 기본 설정 ───────────────────────────────────────────
export interface RateLimitConfig {
  /** 버킷 최대 토큰 수 (burst 한도) */
  capacity: number;
  /** 초당 보충 토큰 수 (1 = 분당 60개) */
  refillRate: number;
  /** 요청당 소비 토큰 수 (기본 1) */
  cost?: number;
}

export const RATE_CONFIGS: Record<string, RateLimitConfig> = {
  // CI/CD 결과 업로드: 분당 60회 버스트, 1/s 정상
  ci_upload:    { capacity: 60,  refillRate: 1.0  },
  // AI 테스트케이스 생성: 10회 버스트, 분당 10회 정상
  ai_generate:  { capacity: 10,  refillRate: 0.167 },
  // 웹훅 발송: 30회 버스트, 분당 30회 정상
  webhook_send: { capacity: 30,  refillRate: 0.5  },
  // Jira 인바운드 웹훅: 120회 버스트, 분당 120회 정상
  jira_webhook: { capacity: 120, refillRate: 2.0  },
  // 기본값 (명시적 scope 없을 때)
  default:      { capacity: 30,  refillRate: 0.5  },
};

// ── 결과 타입 ──────────────────────────────────────────────────
export interface RateLimitResult {
  allowed: boolean;
  tokensRemaining: number;
  /** 허용된 경우 undefined, 거부된 경우 재시도까지 대기 시간(초) */
  retryAfterSeconds?: number;
}

// ── 핵심 함수: DB 원자적 체크 ──────────────────────────────────
export async function checkRateLimit(
  supabase: ReturnType<typeof createClient>,
  identifier: string,
  scope: string,
  config?: RateLimitConfig,
): Promise<RateLimitResult> {
  const cfg = config ?? RATE_CONFIGS[scope] ?? RATE_CONFIGS['default'];

  const { data, error } = await supabase.rpc('check_rate_limit', {
    p_identifier:  identifier,
    p_scope:       scope,
    p_capacity:    cfg.capacity,
    p_refill_rate: cfg.refillRate,
    p_cost:        cfg.cost ?? 1,
  });

  if (error) {
    // DB 오류 시 Fail-open: 서비스 중단 방지 우선
    console.error('[rate-limit] DB error, failing open:', error.message);
    return { allowed: true, tokensRemaining: -1 };
  }

  const result = data as {
    allowed: boolean;
    tokens_remaining: number;
    retry_after_seconds: number;
  };

  return {
    allowed:            result.allowed,
    tokensRemaining:    result.tokens_remaining,
    retryAfterSeconds:  result.allowed ? undefined : result.retry_after_seconds,
  };
}

// ── 429 응답 헬퍼 ──────────────────────────────────────────────
export function rateLimitResponse(
  result: RateLimitResult,
  corsHeaders: Record<string, string> = {},
): Response {
  const retryAfter = Math.ceil(result.retryAfterSeconds ?? 60);
  return new Response(
    JSON.stringify({
      error:               'Too Many Requests',
      message:             `Rate limit exceeded. Retry after ${retryAfter} seconds.`,
      retry_after_seconds: retryAfter,
    }),
    {
      status: 429,
      headers: {
        ...corsHeaders,
        'Content-Type':  'application/json',
        'Retry-After':   String(retryAfter),
        'X-RateLimit-Remaining': '0',
      },
    },
  );
}

// ── 응답 헤더에 rate limit 정보 추가 헬퍼 ──────────────────────
export function addRateLimitHeaders(
  headers: Record<string, string>,
  result: RateLimitResult,
  config: RateLimitConfig,
): Record<string, string> {
  return {
    ...headers,
    'X-RateLimit-Limit':     String(config.capacity),
    'X-RateLimit-Remaining': String(Math.floor(Math.max(0, result.tokensRemaining))),
  };
}
