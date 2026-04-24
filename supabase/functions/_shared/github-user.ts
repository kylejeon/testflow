/**
 * f014 — GitHub User 실명(name) 조회 헬퍼.
 *
 * `/repos/{owner}/{repo}/issues/{n}` 응답의 assignee 는 login/avatar 만 포함한다.
 * 실명 (User.name) 을 얻으려면 별도로 `/users/{login}` 호출이 필요.
 *
 * 호출 비용 완화:
 *   - 같은 sync batch 내에서 같은 login 은 한 번만 조회 → Map 캐시 재사용.
 *   - .name 이 null 인 경우도 명시적으로 캐시 (null 을 돌려주므로 호출자가
 *     login fallback 적용).
 *   - 404/403/429 실패 시 fallback 결과 (null) 캐시 + 반복 재시도 방지.
 *
 * BR-6 rate limit (100ms sleep) 은 호출자 (sync 함수) 가 관리 — 이 모듈은 단일
 * fetch 만 수행한다.
 */

export type GitHubUserNameCache = Map<string, string | null>;

export function createGitHubUserNameCache(): GitHubUserNameCache {
  return new Map();
}

/**
 * login 으로 실명 조회. 실패/null name 은 null 반환 (호출자가 login 으로 fallback).
 * 캐시 hit 시 즉시 반환 (fetch 생략).
 */
export async function getGitHubUserName(
  login: string,
  token: string,
  cache: GitHubUserNameCache,
): Promise<string | null> {
  if (cache.has(login)) return cache.get(login) ?? null;

  try {
    const res = await fetch(`https://api.github.com/users/${encodeURIComponent(login)}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });
    if (!res.ok) {
      // 404 (deleted user) / 403 (rate limit) / 500 등 전부 null 로 캐시 → fallback.
      cache.set(login, null);
      return null;
    }
    const data = await res.json();
    const name: string | null = typeof data?.name === 'string' && data.name.trim().length > 0
      ? data.name.trim()
      : null;
    cache.set(login, name);
    return name;
  } catch {
    cache.set(login, null);
    return null;
  }
}

/**
 * assignee_display_name 을 결정하는 편의 함수.
 * 실명 있으면 실명, 없으면 login, login 도 없으면 null.
 */
export async function resolveAssigneeDisplayName(
  login: string | null | undefined,
  token: string,
  cache: GitHubUserNameCache,
): Promise<string | null> {
  if (!login) return null;
  const realName = await getGitHubUserName(login, token, cache);
  return realName ?? login;
}
