/**
 * Shared fake Supabase client factory for unit tests.
 *
 * Related spec: pm/specs/dev-spec-vitest-infra.md §6-1
 *
 * Usage:
 *   const fake = makeFakeSupabase({
 *     tables: {
 *       profiles: { data: { subscription_tier: 3 } },
 *     },
 *     rpcs: {
 *       get_ai_shared_pool_usage: { data: 150 },
 *     },
 *     authUser: { id: 'user-1' },
 *   });
 *   vi.mocked(supabase.from).mockImplementation(fake.from);
 */

type QueryResult = { data?: unknown; error?: unknown };

interface FakeConfig {
  tables?: Record<string, QueryResult>;
  rpcs?: Record<string, QueryResult>;
  authUser?: { id: string } | null;
}

/** Build a chainable query builder that resolves to the given result. */
function chainable(res: QueryResult) {
  const api: Record<string, unknown> = {};
  const passthrough = () => api;
  api.select = passthrough;
  api.eq = passthrough;
  api.neq = passthrough;
  api.in = passthrough;
  api.gte = passthrough;
  api.lte = passthrough;
  api.gt = passthrough;
  api.lt = passthrough;
  api.like = passthrough;
  api.ilike = passthrough;
  api.is = passthrough;
  api.order = passthrough;
  api.limit = passthrough;
  api.range = passthrough;
  api.filter = passthrough;
  api.or = passthrough;
  api.maybeSingle = async () => res;
  api.single = async () => res;
  api.then = (resolve: (value: QueryResult) => unknown) => resolve(res);
  return api;
}

export function makeFakeSupabase(config: FakeConfig = {}) {
  return {
    from: (table: string) => chainable(config.tables?.[table] ?? { data: [] }),
    rpc: async (name: string) =>
      config.rpcs?.[name] ?? { data: null, error: null },
    auth: {
      getUser: async () => ({ data: { user: config.authUser ?? null } }),
    },
  };
}

export type FakeSupabase = ReturnType<typeof makeFakeSupabase>;
