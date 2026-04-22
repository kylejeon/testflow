import { useMutation, useQueryClient } from '@tanstack/react-query';
import i18n from '../../i18n';
import { supabase } from '../../lib/supabase';
import { normalizeLocale } from '../../lib/claudeLocale';

export type MilestoneRiskLevel = 'on_track' | 'at_risk' | 'critical';

export interface MilestoneAiRiskCache {
  generated_at: string;
  stale_after?: string;
  risk_level: MilestoneRiskLevel;
  confidence: number;
  summary: string;
  bullets: string[];
  recommendations: string[];
  meta?: {
    model?: string;
    tokens_used?: number;
    latency_ms?: number;
    input_snapshot?: {
      total_tcs?: number;
      pass_rate?: number;
      days_left?: number | null;
    };
  };
}

export interface MilestoneAiRiskResult extends MilestoneAiRiskCache {
  generated_at: string;
  meta: {
    from_cache: boolean;
    credits_used: number;
    credits_remaining: number;
    monthly_limit: number;
    tokens_used: number;
    latency_ms: number;
    no_tcs?: boolean;
  };
}

export interface MilestoneAiRiskError {
  error:
    | 'tier_too_low'
    | 'monthly_limit_reached'
    | 'ai_timeout'
    | 'ai_parse_failed'
    | 'upstream_rate_limit'
    | 'not_found'
    | 'unauthorized'
    | 'forbidden'
    | 'bad_request'
    | 'internal'
    | 'network';
  detail?: string;
  used?: number;
  limit?: number;
  retry_after_sec?: number;
  upgradeUrl?: string;
  raw_snippet?: string;
}

/**
 * TanStack Query mutation 훅 — milestone-risk-predictor Edge Function 호출.
 *
 * onSuccess 전략: invalidateQueries 대신 setQueryData로 milestone.ai_risk_cache만
 * 부분 업데이트 — Overview 전체 refetch flicker 제거 (design-spec v2 §14-3 주의사항 1).
 */
export function useMilestoneAiRisk(milestoneId: string) {
  const queryClient = useQueryClient();

  const mutation = useMutation<
    MilestoneAiRiskResult,
    MilestoneAiRiskError,
    { force: boolean }
  >({
    mutationKey: ['milestone-ai-risk', milestoneId],
    mutationFn: async ({ force }) => {
      try {
        const { data, error } = await supabase.functions.invoke('milestone-risk-predictor', {
          body: {
            milestone_id: milestoneId,
            force_refresh: force,
            locale: normalizeLocale(i18n.language), // f021
          },
        });

        // Supabase functions.invoke treats non-2xx as error.
        if (error) {
          // Try to parse the error context for an application-level error code
          const ctx = (error as any).context;
          if (ctx?.response?.json) {
            try {
              const body = await ctx.response.json();
              if (body?.error) throw body as MilestoneAiRiskError;
            } catch (inner) {
              if ((inner as MilestoneAiRiskError).error) throw inner;
            }
          }
          // Network / unknown
          const msg = (error as Error).message || 'Network error';
          if (/network|fetch|connection|abort/i.test(msg)) {
            throw { error: 'network', detail: msg } as MilestoneAiRiskError;
          }
          throw { error: 'internal', detail: msg } as MilestoneAiRiskError;
        }

        if (data?.error) {
          throw data as MilestoneAiRiskError;
        }

        return data as MilestoneAiRiskResult;
      } catch (e: any) {
        if (e?.error) throw e;
        const msg = e?.message || String(e);
        if (/network|fetch|failed to fetch|load failed|abort/i.test(msg)) {
          throw { error: 'network', detail: msg } as MilestoneAiRiskError;
        }
        throw { error: 'internal', detail: msg } as MilestoneAiRiskError;
      }
    },
    onSuccess: (data) => {
      // Partial update: only patch milestone.ai_risk_cache to avoid Overview refetch flicker.
      const cache: MilestoneAiRiskCache = {
        generated_at: data.generated_at,
        stale_after: data.generated_at
          ? new Date(Date.parse(data.generated_at) + 24 * 3600_000).toISOString()
          : undefined,
        risk_level: data.risk_level,
        confidence: data.confidence,
        summary: data.summary,
        bullets: data.bullets,
        recommendations: data.recommendations,
      };

      queryClient.setQueryData(
        ['milestone-detail', milestoneId],
        (old: any) => {
          if (!old?.milestone) return old;
          return {
            ...old,
            milestone: { ...old.milestone, ai_risk_cache: cache },
          };
        },
      );
    },
  });

  return mutation;
}
