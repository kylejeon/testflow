import type { TFunction } from 'i18next';

type ShowToastFn = (message: string, type?: 'success' | 'error' | 'info' | 'warning') => void;

interface AiResponseShape {
  cached?: boolean;
  meta?: { credits_used?: number };
}

/**
 * AI Edge Function 호출 성공 후 "AI 크레딧 N개 사용됨" 토스트를 표시한다.
 *
 * 크레딧 판정:
 *   - response.meta.credits_used 가 있으면 그 값
 *   - response.cached === true 이면 0 (캐시 히트, 크레딧 소모 없음)
 *   - 둘 다 없으면 기본값 1 (현재 모든 AI feature 의 creditCost 가 1)
 *
 * credits === 0 이면 아무것도 표시하지 않는다.
 */
export function showAiCreditToast(
  showToast: ShowToastFn,
  t: TFunction,
  response?: AiResponseShape | null,
): void {
  if (!response) return;
  const explicit = response.meta?.credits_used;
  const credits = typeof explicit === 'number'
    ? explicit
    : response.cached === true
      ? 0
      : 1;
  if (credits <= 0) return;
  showToast(t('common:ai.creditToast.used', { count: credits }), 'success');
}
