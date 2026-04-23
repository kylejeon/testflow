/**
 * Tests for src/hooks/useEnvAiInsights.ts
 *
 * f001 — env-ai-insights mutation hook.
 *
 * Coverage (Dev Spec AC-L2):
 *   - regenerate(false) success → data update
 *   - too_little_data response → passthrough
 *   - tier_too_low error mapping
 *   - monthly_limit_reached error mapping (race-lost with AI payload)
 *   - network error mapping
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mocks — must be hoisted before module imports that reference them.
vi.mock('../lib/aiFetch', () => ({
  aiFetch: vi.fn(),
  invokeEdge: vi.fn(),
}));

vi.mock('../components/Toast', () => ({
  useToast: () => ({ showToast: vi.fn() }),
}));

vi.mock('../lib/aiCreditToast', () => ({
  showAiCreditToast: vi.fn(),
}));

import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

import { aiFetch } from '../lib/aiFetch';
import { useEnvAiInsights } from './useEnvAiInsights';

function wrapperWith(qc: QueryClient) {
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children);
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('useEnvAiInsights', () => {
  let qc: QueryClient;
  beforeEach(() => {
    qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    vi.clearAllMocks();
  });

  it('regenerate success → returns parsed payload', async () => {
    const payload = {
      headline: 'Safari 17 fails 63% of critical TCs',
      critical_env: 'Safari 17',
      critical_reason: '37% pass rate over 11 TCs',
      coverage_gap_tc: 'TC-142',
      coverage_gap_reason: 'Untested in 4/5 envs',
      recommendations: ['Run Safari 17', 'Schedule TC-142'],
      confidence: 78,
      generated_at: new Date().toISOString(),
      meta: {
        from_cache: false,
        credits_used: 1,
        credits_remaining: 24,
        monthly_limit: 30,
        tokens_used: 812,
        latency_ms: 3241,
        log_id: 'log-abc',
      },
    };
    (aiFetch as any).mockResolvedValueOnce(jsonResponse(payload, 200));

    const { result } = renderHook(() => useEnvAiInsights('plan-1'), { wrapper: wrapperWith(qc) });
    result.current.mutate({ force: false });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toMatchObject({
      headline: payload.headline,
      critical_env: payload.critical_env,
      recommendations: payload.recommendations,
      confidence: 78,
    });
  });

  it('too_little_data response is returned as data (no error)', async () => {
    const payload = {
      headline: null,
      critical_env: null,
      critical_reason: null,
      coverage_gap_tc: null,
      coverage_gap_reason: null,
      recommendations: [],
      confidence: 0,
      too_little_data: true,
      generated_at: new Date().toISOString(),
      meta: {
        from_cache: false,
        credits_used: 0,
        credits_remaining: 30,
        monthly_limit: 30,
        tokens_used: 0,
        latency_ms: 12,
        too_little_data: true,
      },
    };
    (aiFetch as any).mockResolvedValueOnce(jsonResponse(payload, 200));
    const { result } = renderHook(() => useEnvAiInsights('plan-1'), { wrapper: wrapperWith(qc) });
    result.current.mutate({ force: false });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.too_little_data).toBe(true);
    expect(result.current.data?.meta.credits_used).toBe(0);
  });

  it('tier_too_low 403 → mutation error', async () => {
    (aiFetch as any).mockResolvedValueOnce(
      jsonResponse({ error: 'tier_too_low', requiredTier: 3 }, 403),
    );
    const { result } = renderHook(() => useEnvAiInsights('plan-1'), { wrapper: wrapperWith(qc) });
    result.current.mutate({ force: false });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as any)?.error).toBe('tier_too_low');
  });

  it('race-lost monthly_limit_reached 429 with payload → error carries AI fields', async () => {
    const racePayload = {
      error: 'monthly_limit_reached',
      headline: 'Safari 17 fails 63% of critical TCs',
      critical_env: 'Safari 17',
      critical_reason: 'reason',
      coverage_gap_tc: null,
      coverage_gap_reason: null,
      recommendations: [],
      confidence: 70,
      generated_at: new Date().toISOString(),
      meta: {
        from_cache: false,
        credits_used: 0,
        credits_remaining: 0,
        credits_logged: false,
        rate_limited_post_check: true,
        monthly_limit: 30,
        tokens_used: 500,
        latency_ms: 2000,
      },
    };
    (aiFetch as any).mockResolvedValueOnce(jsonResponse(racePayload, 429));
    const { result } = renderHook(() => useEnvAiInsights('plan-1'), { wrapper: wrapperWith(qc) });
    result.current.mutate({ force: false });

    await waitFor(() => expect(result.current.isError).toBe(true));
    const err = result.current.error as any;
    expect(err?.error).toBe('monthly_limit_reached');
    // AI payload 보존 확인
    expect(err?.headline).toBe('Safari 17 fails 63% of critical TCs');
  });

  it('network fetch failure → error.error === "network"', async () => {
    (aiFetch as any).mockRejectedValueOnce(new Error('Failed to fetch'));
    const { result } = renderHook(() => useEnvAiInsights('plan-1'), { wrapper: wrapperWith(qc) });
    result.current.mutate({ force: false });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as any)?.error).toBe('network');
  });

  it('missing plan_id → bad_request error before network call', async () => {
    const { result } = renderHook(() => useEnvAiInsights(null), { wrapper: wrapperWith(qc) });
    result.current.mutate({ force: false });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as any)?.error).toBe('bad_request');
    expect(aiFetch).not.toHaveBeenCalled();
  });
});
