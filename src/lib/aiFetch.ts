import { supabase } from './supabase';

/**
 * AI / 인증 필요 Edge Function 호출 래퍼.
 *
 * Supabase 가 anon JWT 를 publishable key 로 전환하고 사용자 세션을 ES256 으로 발급하면서
 * Edge Functions 게이트웨이가 토큰 파싱 단계에서 요청을 거부하는 문제 (UNAUTHORIZED_*) 발생.
 *
 * 해결: Authorization 에는 HS256 anon JWT (게이트웨이 통과용) + 실제 사용자 JWT 는
 * `x-user-token` 커스텀 헤더로 전달. 서버는 `x-user-token` 에서 payload 를 수동 디코딩한다.
 *
 * 인증되지 않은 상태에서 호출되면 error 를 throw 한다 (기존 패턴 계승).
 */
export async function aiFetch(
  functionName: string,
  body: Record<string, unknown>,
  options?: { signal?: AbortSignal },
): Promise<Response> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error('Not authenticated');
  }

  const supabaseUrl = import.meta.env.VITE_PUBLIC_SUPABASE_URL as string;
  const anonKey = import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY as string;

  return fetch(`${supabaseUrl}/functions/v1/${functionName}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${anonKey}`,
      apikey: anonKey,
      'x-user-token': session.access_token,
    },
    body: JSON.stringify(body),
    signal: options?.signal,
  });
}
