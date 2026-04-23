/**
 * f001 — Environment AI Insights mutation hook.
 *
 * Pattern mirror of src/pages/milestone-detail/useMilestoneAiRisk.ts.
 * Edge Function 은 force_refresh 와 locale 을 받는다.
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n';
import { normalizeLocale } from '../lib/claudeLocale';
import { aiFetch } from '../lib/aiFetch';
import { showAiCreditToast } from '../lib/aiCreditToast';
import { useToast } from '../components/Toast';
import type { EnvAiInsightsResult, EnvAiInsightsError } from '../types/envAiInsights';

/**
 * TanStack Query mutation 훅 — env-ai-insights Edge Function 호출.
 */
export function useEnvAiInsights(planId: string | null) {
  const queryClient = useQueryClient();
  const { t } = useTranslation('common');
  const { showToast } = useToast();

  const mutation = useMutation<
    EnvAiInsightsResult,
    EnvAiInsightsError,
    { force: boolean }
  >({
    mutationKey: ['env-ai-insights', planId],
    mutationFn: async ({ force }) => {
      if (!planId) {
        throw { error: 'bad_request', detail: 'plan_id is required' } as EnvAiInsightsError;
      }
      try {
        const resp = await aiFetch('env-ai-insights', {
          plan_id: planId,
          force_refresh: force,
          locale: normalizeLocale(i18n.language),
        });

        let data: any;
        try {
          data = await resp.json();
        } catch {
          throw { error: 'internal', detail: `HTTP ${resp.status}` } as EnvAiInsightsError;
        }

        // race-lost 특수 케이스: 429 with AI payload preserved
        if (resp.status === 429 && data?.error === 'monthly_limit_reached' && data?.headline !== undefined) {
          // AI payload 보존하면서도 error 로 던져서 toast 처리
          throw data as EnvAiInsightsError;
        }

        if (!resp.ok) {
          if (data?.error) throw data as EnvAiInsightsError;
          throw { error: 'internal', detail: `HTTP ${resp.status}` } as EnvAiInsightsError;
        }

        if (data?.error) {
          throw data as EnvAiInsightsError;
        }

        return data as EnvAiInsightsResult;
      } catch (e: any) {
        if (e?.error) throw e;
        const msg = e?.message || String(e);
        if (/network|fetch|failed to fetch|load failed|abort/i.test(msg)) {
          throw { error: 'network', detail: msg } as EnvAiInsightsError;
        }
        throw { error: 'internal', detail: msg } as EnvAiInsightsError;
      }
    },
    onSuccess: (data) => {
      showAiCreditToast(showToast, t, data);
      // Partial update: patch test_plans.ai_env_insights_cache in query cache if present.
      // plan-detail page 는 직접 aiInsight state 로 관리하므로 여기서는 invalidate 만.
      if (planId) {
        queryClient.invalidateQueries({ queryKey: ['plan-detail', planId] });
      }
    },
  });

  return mutation;
}
