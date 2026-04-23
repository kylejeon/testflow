/**
 * Tests for src/hooks/useAiUsageBreakdown.ts
 *
 * f011 — AI Usage Dashboard
 *
 * Scope:
 *   - RPC wrapper fetchAiUsageBreakdown (AC-10 contract)
 *   - Self View direct query fetchMyAiUsage (AC-22)
 *   - Query key shape (used for cache invalidation)
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
    auth: { getUser: vi.fn() },
  },
}));

import { supabase } from '../lib/supabase';
import {
  aiUsageBreakdownQueryKey,
  fetchAiUsageBreakdown,
  fetchMyAiUsage,
  myAiUsageQueryKey,
} from './useAiUsageBreakdown';

// ─── Query key tests ─────────────────────────────────────────────────────────

describe('aiUsageBreakdownQueryKey', () => {
  it('includes ownerId and ISO boundaries', () => {
    const from = new Date('2026-04-01T00:00:00Z');
    const to = new Date('2026-04-23T00:00:00Z');
    const key = aiUsageBreakdownQueryKey('owner-A', from, to);
    expect(key).toEqual([
      'aiUsageBreakdown',
      'owner-A',
      '2026-04-01T00:00:00.000Z',
      '2026-04-23T00:00:00.000Z',
    ]);
  });

  it('falls back to "none" when ownerId is null/undefined', () => {
    const from = new Date('2026-04-01T00:00:00Z');
    const to = new Date('2026-04-23T00:00:00Z');
    expect(aiUsageBreakdownQueryKey(null, from, to)[1]).toBe('none');
    expect(aiUsageBreakdownQueryKey(undefined, from, to)[1]).toBe('none');
  });
});

describe('myAiUsageQueryKey', () => {
  it('uses separate namespace from team key', () => {
    const from = new Date('2026-04-01T00:00:00Z');
    const to = new Date('2026-04-23T00:00:00Z');
    const key = myAiUsageQueryKey('user-1', from, to);
    expect(key[0]).toBe('myAiUsage');
    expect(key[1]).toBe('user-1');
  });
});

// ─── fetchAiUsageBreakdown (RPC) ─────────────────────────────────────────────

describe('fetchAiUsageBreakdown', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns RPC rows verbatim on success', async () => {
    const rows = [
      {
        day: '2026-04-01',
        mode: 'text',
        user_id: 'u1',
        credits_sum: 5,
        call_count: 3,
        tokens_sum: 0,
      },
    ];
    vi.mocked(supabase.rpc).mockResolvedValue({ data: rows, error: null } as never);

    const result = await fetchAiUsageBreakdown(
      'owner-A',
      new Date('2026-04-01T00:00:00Z'),
      new Date('2026-04-23T00:00:00Z'),
    );
    expect(result).toEqual(rows);
    expect(supabase.rpc).toHaveBeenCalledWith('get_ai_usage_breakdown', {
      p_owner_id: 'owner-A',
      p_from: '2026-04-01T00:00:00.000Z',
      p_to: '2026-04-23T00:00:00.000Z',
    });
  });

  it('returns [] when RPC data is null (empty usage set)', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({ data: null, error: null } as never);
    const result = await fetchAiUsageBreakdown(
      'owner-A',
      new Date('2026-04-01T00:00:00Z'),
      new Date('2026-04-23T00:00:00Z'),
    );
    expect(result).toEqual([]);
  });

  it('throws when RPC returns an error (AC-14 contract — panel surfaces retry)', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({
      data: null,
      error: { message: 'permission denied', code: '42501' },
    } as never);

    await expect(
      fetchAiUsageBreakdown(
        'owner-A',
        new Date('2026-04-01T00:00:00Z'),
        new Date('2026-04-23T00:00:00Z'),
      ),
    ).rejects.toBeTruthy();
  });
});

// ─── fetchMyAiUsage (Self View direct query, AC-22) ──────────────────────────

describe('fetchMyAiUsage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does NOT call the breakdown RPC (AC-22)', async () => {
    const rows = [
      {
        created_at: '2026-04-12T10:00:00Z',
        mode: 'text',
        credits_used: 1,
        tokens_used: null,
      },
    ];
    const api: Record<string, unknown> = {};
    api.select = () => api;
    api.eq = () => api;
    api.gte = () => api;
    api.lt = () => api;
    api.order = () => Promise.resolve({ data: rows, error: null });
    vi.mocked(supabase.from).mockReturnValue(api as never);

    const result = await fetchMyAiUsage(
      'user-1',
      new Date('2026-04-01T00:00:00Z'),
      new Date('2026-04-23T00:00:00Z'),
    );
    expect(result).toEqual(rows);
    expect(supabase.rpc).not.toHaveBeenCalled();
    expect(supabase.from).toHaveBeenCalledWith('ai_generation_logs');
  });

  it('throws on query error', async () => {
    const api: Record<string, unknown> = {};
    api.select = () => api;
    api.eq = () => api;
    api.gte = () => api;
    api.lt = () => api;
    api.order = () => Promise.resolve({ data: null, error: { message: 'bad' } });
    vi.mocked(supabase.from).mockReturnValue(api as never);

    await expect(
      fetchMyAiUsage(
        'user-1',
        new Date('2026-04-01T00:00:00Z'),
        new Date('2026-04-23T00:00:00Z'),
      ),
    ).rejects.toBeTruthy();
  });

  it('returns [] when data is null (fresh account)', async () => {
    const api: Record<string, unknown> = {};
    api.select = () => api;
    api.eq = () => api;
    api.gte = () => api;
    api.lt = () => api;
    api.order = () => Promise.resolve({ data: null, error: null });
    vi.mocked(supabase.from).mockReturnValue(api as never);

    const result = await fetchMyAiUsage(
      'user-1',
      new Date('2026-04-01T00:00:00Z'),
      new Date('2026-04-23T00:00:00Z'),
    );
    expect(result).toEqual([]);
  });
});
