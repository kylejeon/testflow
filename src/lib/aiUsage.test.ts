/**
 * Tests for src/lib/aiUsage.ts
 *
 * Related spec: pm/specs/dev-spec-vitest-infra.md §AC-2 / §AC-3 (shared pool AC-10 해소)
 *
 * Strategy: vi.mock('./supabase') to replace module-level singleton with a
 * mock object whose `from` / `rpc` / `auth.getUser` are vi.fn() we can program
 * per-test with `mockReturnValue` / `mockResolvedValue`.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('./supabase', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
    auth: { getUser: vi.fn() },
  },
}));

import { supabase } from './supabase';
import {
  startOfUtcMonth,
  getEffectiveOwnerId,
  getSharedPoolUsage,
  getMySharedPoolUsage,
} from './aiUsage';

// ─── fixtures ────────────────────────────────────────────────────────────────

/** Build a chainable select->eq->maybeSingle result. */
function selectEqMaybeSingle(data: unknown, error: unknown = null) {
  return {
    select: () => ({
      eq: () => ({
        maybeSingle: async () => ({ data, error }),
      }),
    }),
  };
}

/** Build a chainable select->eq->(thenable awaited) result (returns array). */
function selectEqList(data: unknown, error: unknown = null) {
  const res = { data, error };
  const api: Record<string, unknown> = {
    select: () => api,
    eq: () => api,
    in: () => api,
    then: (resolve: (v: typeof res) => unknown) => resolve(res),
  };
  return api;
}

/** Build a chainable select->in->(thenable awaited) result (returns array). */
function selectInList(data: unknown, error: unknown = null) {
  const res = { data, error };
  const api: Record<string, unknown> = {
    select: () => api,
    eq: () => api,
    in: () => api,
    then: (resolve: (v: typeof res) => unknown) => resolve(res),
  };
  return api;
}

// ─── startOfUtcMonth ────────────────────────────────────────────────────────

describe('startOfUtcMonth', () => {
  it('returns the first day of the current UTC month at 00:00:00.000', () => {
    const fixedNow = new Date('2026-04-20T15:37:42.123Z');
    vi.useFakeTimers();
    vi.setSystemTime(fixedNow);

    const d = startOfUtcMonth();
    expect(d.getUTCFullYear()).toBe(2026);
    expect(d.getUTCMonth()).toBe(3); // April = 3
    expect(d.getUTCDate()).toBe(1);
    expect(d.getUTCHours()).toBe(0);
    expect(d.getUTCMinutes()).toBe(0);
    expect(d.getUTCSeconds()).toBe(0);
    expect(d.getUTCMilliseconds()).toBe(0);

    vi.useRealTimers();
  });
});

// ─── getEffectiveOwnerId ────────────────────────────────────────────────────

describe('getEffectiveOwnerId', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns self when own tier > 1 (AC-3a)', async () => {
    vi.mocked(supabase.from).mockImplementation(((table: string) => {
      if (table === 'profiles') {
        return selectEqMaybeSingle({
          subscription_tier: 3,
          is_trial: false,
          trial_ends_at: null,
        });
      }
      return selectEqList([]);
    }) as never);

    const result = await getEffectiveOwnerId('user-1');
    expect(result).toEqual({ tier: 3, ownerId: 'user-1' });
  });

  it('treats expired trial as tier 1 even if subscription_tier is higher', async () => {
    const past = new Date(Date.now() - 86_400_000).toISOString();
    vi.mocked(supabase.from).mockImplementation(((table: string) => {
      if (table === 'profiles') {
        return selectEqMaybeSingle({
          subscription_tier: 4,
          is_trial: true,
          trial_ends_at: past,
        });
      }
      // No memberships → self fallback
      return selectEqList([]);
    }) as never);

    const result = await getEffectiveOwnerId('user-1');
    expect(result.tier).toBe(1);
    expect(result.ownerId).toBe('user-1');
  });

  it('returns owner from membership project when self tier=1 and owner tier=4 (AC-3b)', async () => {
    let profilesCall = 0;
    vi.mocked(supabase.from).mockImplementation(((table: string) => {
      if (table === 'profiles') {
        profilesCall += 1;
        if (profilesCall === 1) {
          // Self profile — tier 1
          return selectEqMaybeSingle({
            subscription_tier: 1,
            is_trial: false,
            trial_ends_at: null,
          });
        }
        // Owner profiles .in([...])
        return selectInList([
          {
            id: 'owner-A',
            subscription_tier: 4,
            is_trial: false,
            trial_ends_at: null,
          },
        ]);
      }
      if (table === 'project_members') {
        return selectEqList([{ project_id: 'proj-1' }]);
      }
      if (table === 'projects') {
        return selectInList([{ id: 'proj-1', owner_id: 'owner-A' }]);
      }
      return selectEqList([]);
    }) as never);

    const result = await getEffectiveOwnerId('user-1');
    expect(result).toEqual({ tier: 4, ownerId: 'owner-A' });
  });

  it('returns self when no project memberships exist', async () => {
    vi.mocked(supabase.from).mockImplementation(((table: string) => {
      if (table === 'profiles') {
        return selectEqMaybeSingle({
          subscription_tier: 1,
          is_trial: false,
          trial_ends_at: null,
        });
      }
      if (table === 'project_members') {
        return selectEqList([]); // no memberships
      }
      return selectEqList([]);
    }) as never);

    const result = await getEffectiveOwnerId('user-1');
    expect(result).toEqual({ tier: 1, ownerId: 'user-1' });
  });
});

// ─── getSharedPoolUsage ─────────────────────────────────────────────────────

describe('getSharedPoolUsage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns the numeric usage from RPC', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({
      data: 150,
      error: null,
    } as never);
    const n = await getSharedPoolUsage('owner-A');
    expect(n).toBe(150);
  });

  it('sums owner + members pool total (AC-3 conceptual: 20+30 → 50)', async () => {
    // The actual summation happens in the RPC (SECURITY DEFINER). From the
    // client's perspective, we assert we surface the RPC result verbatim.
    vi.mocked(supabase.rpc).mockResolvedValue({
      data: 50,
      error: null,
    } as never);
    const n = await getSharedPoolUsage('owner-A');
    expect(n).toBe(50);
  });

  it('returns 0 when the RPC errors (AC-3c, fail-soft)', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({
      data: null,
      error: { message: 'permission denied' },
    } as never);
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const n = await getSharedPoolUsage('owner-A');
    expect(n).toBe(0);
    consoleSpy.mockRestore();
  });

  it('returns 0 immediately when ownerId is empty (no RPC call)', async () => {
    const n = await getSharedPoolUsage('');
    expect(n).toBe(0);
    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  it('coerces non-finite RPC response to 0', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({
      data: 'not-a-number',
      error: null,
    } as never);
    const n = await getSharedPoolUsage('owner-A');
    expect(n).toBe(0);
  });
});

// ─── getMySharedPoolUsage ───────────────────────────────────────────────────

describe('getMySharedPoolUsage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 0 when no authenticated user', async () => {
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: null },
    } as never);
    const n = await getMySharedPoolUsage();
    expect(n).toBe(0);
  });

  it('composes getEffectiveOwnerId + getSharedPoolUsage for signed-in user', async () => {
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: { id: 'user-1' } },
    } as never);
    vi.mocked(supabase.from).mockImplementation(((table: string) => {
      if (table === 'profiles') {
        return selectEqMaybeSingle({
          subscription_tier: 3,
          is_trial: false,
          trial_ends_at: null,
        });
      }
      return selectEqList([]);
    }) as never);
    vi.mocked(supabase.rpc).mockResolvedValue({
      data: 42,
      error: null,
    } as never);

    const n = await getMySharedPoolUsage();
    expect(n).toBe(42);
  });
});
