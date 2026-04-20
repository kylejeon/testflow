import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { Environment, EnvironmentFormValues } from '../types/environment';

const ENVIRONMENTS_COLS = 'id, project_id, name, os_name, os_version, browser_name, browser_version, device_type, description, is_active, created_by, created_at, updated_at';

export function environmentsQueryKey(projectId: string | undefined) {
  return ['environments', projectId ?? 'none'] as const;
}

async function fetchEnvironments(projectId: string): Promise<Environment[]> {
  const { data, error } = await supabase
    .from('environments')
    .select(ENVIRONMENTS_COLS)
    .eq('project_id', projectId)
    .order('is_active', { ascending: false })
    .order('os_name', { ascending: true })
    .order('browser_name', { ascending: true });
  if (error) throw error;
  return (data ?? []) as Environment[];
}

/**
 * Load all environments for a project (both active + inactive).
 * Components filter `is_active` client-side as needed.
 */
export function useEnvironments(projectId: string | undefined) {
  return useQuery({
    queryKey: environmentsQueryKey(projectId),
    queryFn: () => fetchEnvironments(projectId as string),
    enabled: !!projectId,
    staleTime: 60_000,
  });
}

// ─── Mutations ─────────────────────────────────────────────────────────────

export function useCreateEnvironment(projectId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: EnvironmentFormValues): Promise<Environment> => {
      if (!projectId) throw new Error('projectId is required');
      const payload = {
        project_id: projectId,
        name: values.name.trim(),
        os_name: values.os_name.trim() || null,
        os_version: values.os_version.trim() || null,
        browser_name: values.browser_name.trim() || null,
        browser_version: values.browser_version.trim() || null,
        device_type: values.device_type,
        description: values.description.trim() || null,
      };
      const { data, error } = await supabase
        .from('environments')
        .insert(payload)
        .select(ENVIRONMENTS_COLS)
        .single();
      if (error) throw error;
      return data as Environment;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: environmentsQueryKey(projectId) });
    },
  });
}

export function useUpdateEnvironment(projectId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { id: string; values: Partial<EnvironmentFormValues> & { is_active?: boolean } }): Promise<Environment> => {
      const { id, values } = args;
      const payload: Record<string, unknown> = {};
      if (values.name !== undefined) payload.name = values.name.trim();
      if (values.os_name !== undefined) payload.os_name = values.os_name.trim() || null;
      if (values.os_version !== undefined) payload.os_version = values.os_version.trim() || null;
      if (values.browser_name !== undefined) payload.browser_name = values.browser_name.trim() || null;
      if (values.browser_version !== undefined) payload.browser_version = values.browser_version.trim() || null;
      if (values.device_type !== undefined) payload.device_type = values.device_type;
      if (values.description !== undefined) payload.description = values.description.trim() || null;
      if (values.is_active !== undefined) payload.is_active = values.is_active;

      const { data, error } = await supabase
        .from('environments')
        .update(payload)
        .eq('id', id)
        .select(ENVIRONMENTS_COLS)
        .single();
      if (error) throw error;
      return data as Environment;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: environmentsQueryKey(projectId) });
    },
  });
}

export function useDeleteEnvironment(projectId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabase
        .from('environments')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: environmentsQueryKey(projectId) });
    },
  });
}
