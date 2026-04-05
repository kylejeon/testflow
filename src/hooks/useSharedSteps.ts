/**
 * useSharedSteps
 * Shared/Reusable Test Steps CRUD + 버전 히스토리 훅
 *
 * 포함 기능:
 *  - 프로젝트별 Shared Steps 목록 조회 (검색, 카테고리 필터)
 *  - Shared Step 단건 조회
 *  - 생성 / 수정 / 삭제
 *  - 버전 히스토리 조회 (Enterprise)
 *  - Shared Steps 수 확인 (Tier Gating용)
 */
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SharedStepItem {
  step: string;
  expectedResult: string;
}

export interface SharedStep {
  id: string;
  project_id: string;
  custom_id: string;
  name: string;
  description?: string;
  category?: string;
  steps: SharedStepItem[];
  version: number;
  usage_count: number;
  created_by: string;
  updated_by?: string;
  created_at: string;
  updated_at: string;
}

export interface SharedStepVersion {
  id: string;
  shared_step_id: string;
  version: number;
  steps: SharedStepItem[];
  name: string;
  changed_by: string;
  change_summary?: string;
  created_at: string;
}

export interface SharedStepFilters {
  search?: string;
  category?: string;
}

export interface CreateSharedStepPayload {
  project_id: string;
  name: string;
  description?: string;
  category?: string;
  steps?: SharedStepItem[];
}

export interface UpdateSharedStepPayload {
  name?: string;
  description?: string;
  category?: string;
  steps?: SharedStepItem[];
}

// ─── useSharedSteps — 프로젝트별 목록 조회 ───────────────────────────────────

export function useSharedSteps(
  projectId: string,
  filters: SharedStepFilters = {},
) {
  const [sharedSteps, setSharedSteps] = useState<SharedStep[]>([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('shared_steps')
        .select('*')
        .eq('project_id', projectId)
        .order('custom_id', { ascending: true });

      if (filters.category) query = query.eq('category', filters.category);
      if (filters.search) {
        query = query.or(
          `name.ilike.%${filters.search}%,custom_id.ilike.%${filters.search}%,category.ilike.%${filters.search}%`,
        );
      }

      const { data, error: err } = await query;
      if (err) throw err;
      setSharedSteps((data || []) as SharedStep[]);
    } catch (err: any) {
      setError(err.message || 'Failed to load shared steps');
    } finally {
      setLoading(false);
    }
  }, [projectId, JSON.stringify(filters)]);

  useEffect(() => { fetch(); }, [fetch]);

  return { sharedSteps, loading, error, refetch: fetch };
}

// ─── useSharedStepDetail — 단건 조회 ─────────────────────────────────────────

export function useSharedStepDetail(sharedStepId: string | null) {
  const [sharedStep, setSharedStep] = useState<SharedStep | null>(null);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!sharedStepId) { setSharedStep(null); return; }
    setLoading(true);
    setError(null);

    try {
      const { data, error: err } = await supabase
        .from('shared_steps')
        .select('*')
        .eq('id', sharedStepId)
        .maybeSingle();

      if (err) throw err;
      setSharedStep((data as SharedStep) || null);
    } catch (err: any) {
      setError(err.message || 'Failed to load shared step');
    } finally {
      setLoading(false);
    }
  }, [sharedStepId]);

  useEffect(() => { fetch(); }, [fetch]);

  return { sharedStep, loading, error, refetch: fetch };
}

// ─── useCreateSharedStep ──────────────────────────────────────────────────────

export function useCreateSharedStep() {
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const create = useCallback(async (
    payload: CreateSharedStepPayload,
  ): Promise<SharedStep | null> => {
    setLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error: err } = await supabase
        .from('shared_steps')
        .insert({
          ...payload,
          steps:      payload.steps || [],
          created_by: user.id,
          updated_by: user.id,
        })
        .select()
        .single();

      if (err) throw err;
      return data as SharedStep;
    } catch (err: any) {
      setError(err.message || 'Failed to create shared step');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { create, loading, error };
}

// ─── useUpdateSharedStep ──────────────────────────────────────────────────────

export function useUpdateSharedStep() {
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const update = useCallback(async (
    sharedStepId: string,
    payload: UpdateSharedStepPayload,
  ): Promise<SharedStep | null> => {
    setLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error: err } = await supabase
        .from('shared_steps')
        .update({ ...payload, updated_by: user.id })
        .eq('id', sharedStepId)
        .select()
        .single();

      if (err) throw err;
      return data as SharedStep;
    } catch (err: any) {
      setError(err.message || 'Failed to update shared step');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { update, loading, error };
}

// ─── useDeleteSharedStep ──────────────────────────────────────────────────────

export function useDeleteSharedStep() {
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const remove = useCallback(async (sharedStepId: string): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const { error: err } = await supabase
        .from('shared_steps')
        .delete()
        .eq('id', sharedStepId);

      if (err) throw err;
      return true;
    } catch (err: any) {
      setError(err.message || 'Failed to delete shared step');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  return { remove, loading, error };
}

// ─── useSharedStepVersions — 버전 이력 조회 (Enterprise) ─────────────────────

export function useSharedStepVersions(sharedStepId: string | null) {
  const [versions, setVersions] = useState<SharedStepVersion[]>([]);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!sharedStepId) { setVersions([]); return; }
    setLoading(true);
    setError(null);

    try {
      const { data, error: err } = await supabase
        .from('shared_step_versions')
        .select('*, profiles:changed_by(full_name, email)')
        .eq('shared_step_id', sharedStepId)
        .order('version', { ascending: false })
        .limit(50);

      if (err) throw err;
      setVersions((data || []) as SharedStepVersion[]);
    } catch (err: any) {
      setError(err.message || 'Failed to load version history');
    } finally {
      setLoading(false);
    }
  }, [sharedStepId]);

  useEffect(() => { fetch(); }, [fetch]);

  return { versions, loading, error, refetch: fetch };
}

// ─── useSharedStepCount — Tier Gating용 수량 확인 ────────────────────────────

export function useSharedStepCount(projectId: string) {
  const [count, setCount]     = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);

    const { data } = await supabase
      .rpc('count_shared_steps', { p_project_id: projectId });

    setCount((data as number) ?? 0);
    setLoading(false);
  }, [projectId]);

  useEffect(() => { fetch(); }, [fetch]);

  return { count, loading, refetch: fetch };
}

// ─── useSharedStepCategories — 프로젝트 내 카테고리 목록 ─────────────────────

export function useSharedStepCategories(projectId: string) {
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading]       = useState(true);

  const fetch = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);

    try {
      const { data } = await supabase
        .from('shared_steps')
        .select('category')
        .eq('project_id', projectId)
        .not('category', 'is', null);

      const unique = [...new Set((data || []).map((r: any) => r.category).filter(Boolean))].sort();
      setCategories(unique as string[]);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => { fetch(); }, [fetch]);

  return { categories, loading, refetch: fetch };
}
