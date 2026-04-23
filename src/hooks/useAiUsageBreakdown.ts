/**
 * f011 — AI Usage Dashboard
 *
 * Two hooks:
 *   1. useAiUsageBreakdown(ownerId, from, to)   — Team View (Owner/Admin)
 *      Calls SECURITY DEFINER RPC `get_ai_usage_breakdown`.
 *   2. useMyAiUsage(userId, from, to)           — Self View (Member, AC-22)
 *      Direct query against `ai_generation_logs` via RLS.
 *
 * Related spec: docs/specs/dev-spec-f011-ai-token-budget-dashboard.md §6, §AC-10, §AC-22
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type {
  AiUsageBreakdownRow,
  AiGenerationLogRow,
} from '../types/aiUsage';

// ─── Team View (RPC) ─────────────────────────────────────────────────────────

export function aiUsageBreakdownQueryKey(
  ownerId: string | null | undefined,
  from: Date,
  to: Date,
) {
  return [
    'aiUsageBreakdown',
    ownerId ?? 'none',
    from.toISOString(),
    to.toISOString(),
  ] as const;
}

export async function fetchAiUsageBreakdown(
  ownerId: string,
  from: Date,
  to: Date,
): Promise<AiUsageBreakdownRow[]> {
  const { data, error } = await supabase.rpc('get_ai_usage_breakdown', {
    p_owner_id: ownerId,
    p_from: from.toISOString(),
    p_to: to.toISOString(),
  });
  if (error) throw error;
  return (data ?? []) as AiUsageBreakdownRow[];
}

/**
 * Team View — all team members' AI usage for the billing owner.
 *
 * Enabled only when ownerId is truthy. RPC is SECURITY DEFINER; unauthorized
 * callers receive an empty array (not an error) per the RPC contract.
 */
export function useAiUsageBreakdown(
  ownerId: string | null | undefined,
  from: Date,
  to: Date,
) {
  return useQuery<AiUsageBreakdownRow[]>({
    queryKey: aiUsageBreakdownQueryKey(ownerId, from, to),
    queryFn: () => fetchAiUsageBreakdown(ownerId as string, from, to),
    enabled: !!ownerId,
    staleTime: 60_000, // 1 minute (AI calls happen on the order of minutes)
    gcTime: 5 * 60_000,
  });
}

// ─── Self View (RLS direct query, AC-22) ─────────────────────────────────────

export function myAiUsageQueryKey(
  userId: string | null | undefined,
  from: Date,
  to: Date,
) {
  return [
    'myAiUsage',
    userId ?? 'none',
    from.toISOString(),
    to.toISOString(),
  ] as const;
}

export async function fetchMyAiUsage(
  userId: string,
  from: Date,
  to: Date,
): Promise<AiGenerationLogRow[]> {
  const { data, error } = await supabase
    .from('ai_generation_logs')
    .select('created_at, mode, credits_used, tokens_used')
    .eq('user_id', userId)
    .eq('step', 1)
    .gte('created_at', from.toISOString())
    .lt('created_at', to.toISOString())
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as AiGenerationLogRow[];
}

/**
 * Self View — only the signed-in user's AI usage. Uses RLS-governed direct
 * query (no RPC) so the request cost stays minimal and does not hit the
 * SECURITY DEFINER path.
 */
export function useMyAiUsage(
  userId: string | null | undefined,
  from: Date,
  to: Date,
) {
  return useQuery<AiGenerationLogRow[]>({
    queryKey: myAiUsageQueryKey(userId, from, to),
    queryFn: () => fetchMyAiUsage(userId as string, from, to),
    enabled: !!userId,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
  });
}
