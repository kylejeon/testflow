import { supabase } from './supabase';

/**
 * 인증 필요 Edge Function 호출 래퍼 (AI + 비-AI 공용).
 *
 * Supabase 가 anon JWT 를 publishable key 로 전환하고 사용자 세션을 ES256 으로 발급하면서
 * Edge Functions 게이트웨이가 토큰 파싱 단계에서 요청을 거부하는 문제 (UNAUTHORIZED_*) 발생.
 *
 * 해결: Authorization 에는 HS256 anon JWT (게이트웨이 통과용) + 실제 사용자 JWT 는
 * `x-user-token` 커스텀 헤더로 전달. 서버는 `x-user-token` 에서 payload 를 수동 디코딩한다.
 *
 * 인증되지 않은 상태에서 호출되면 error 를 throw 한다 (기존 패턴 계승).
 */
export async function edgeFetch(
  functionName: string,
  body: Record<string, unknown>,
  options?: {
    signal?: AbortSignal;
    method?: 'POST' | 'GET' | 'DELETE';
    /** true 면 비-로그인 상태에서도 호출 허용 (x-user-token 생략, anon key 만). */
    allowAnonymous?: boolean;
  },
): Promise<Response> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token && !options?.allowAnonymous) {
    throw new Error('Not authenticated');
  }

  const supabaseUrl = import.meta.env.VITE_PUBLIC_SUPABASE_URL as string;
  const anonKey = import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY as string;
  const method = options?.method ?? 'POST';

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${anonKey}`,
    apikey: anonKey,
  };
  if (session?.access_token) {
    headers['x-user-token'] = session.access_token;
  }

  return fetch(`${supabaseUrl}/functions/v1/${functionName}`, {
    method,
    headers,
    body: method === 'GET' ? undefined : JSON.stringify(body),
    signal: options?.signal,
  });
}

/** AI 호출 사이트 하위호환 alias. 신규 코드는 edgeFetch 를 권장. */
export const aiFetch = edgeFetch;

/**
 * `supabase.functions.invoke()` 드롭인 대체 — ES256 안전.
 *
 * `supabase.functions.invoke` 는 세션 JWT 를 그대로 Authorization 헤더에 넣기 때문에
 * ES256 세션이면 게이트웨이가 파싱 거부 → function 실행조차 안 됨.
 * 이 래퍼는 edgeFetch 와 동일한 전략 (HS256 anon JWT + x-user-token) 으로 호출하되
 * `{ data, error }` 형태를 반환해서 기존 호출부 수정 최소화.
 */
export async function invokeEdge<T = unknown>(
  functionName: string,
  opts?: { body?: Record<string, unknown>; signal?: AbortSignal; allowAnonymous?: boolean },
): Promise<{ data: T | null; error: Error | null }> {
  try {
    const res = await edgeFetch(functionName, opts?.body ?? {}, {
      signal: opts?.signal,
      allowAnonymous: opts?.allowAnonymous,
    });
    const text = await res.text();
    let parsed: unknown = null;
    if (text) {
      try { parsed = JSON.parse(text); } catch { parsed = text; }
    }
    if (!res.ok) {
      const msg = (parsed && typeof parsed === 'object' && 'error' in parsed && typeof (parsed as { error: unknown }).error === 'string')
        ? String((parsed as { error: string }).error)
        : `Edge function ${functionName} returned ${res.status}`;
      return { data: null, error: new Error(msg) };
    }
    return { data: parsed as T, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}
