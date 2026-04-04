/**
 * useRequirements
 * RTM Requirement CRUD + Coverage 집계 훅
 *
 * 포함 기능:
 *  - 프로젝트별 Requirement 목록 조회 (필터/정렬)
 *  - Requirement 단건 조회
 *  - 생성 / 수정 / 삭제 (status → 'deprecated')
 *  - Coverage Summary (MV 조회)
 *  - Requirement 수량 제한 확인 (Starter: 50개)
 *  - CSV import
 */
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

// ─── Types ────────────────────────────────────────────────────────────────────

export type RequirementPriority = 'P1' | 'P2' | 'P3' | 'P4';
export type RequirementStatus   = 'draft' | 'active' | 'deprecated';
export type RequirementSource   = 'manual' | 'jira' | 'csv';
export type GapType             = 'no_tc' | 'no_exec' | 'fail' | 'covered';

export interface Requirement {
  id: string;
  project_id: string;
  custom_id: string;
  title: string;
  description?: string;
  priority: RequirementPriority;
  category?: string;
  status: RequirementStatus;
  parent_id?: string;
  source: RequirementSource;
  external_id?: string;
  external_url?: string;
  external_status?: string;
  external_type?: string;
  last_synced_at?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface RequirementCoverage {
  requirement_id: string;
  project_id: string;
  custom_id: string;
  title: string;
  priority: RequirementPriority;
  status: RequirementStatus;
  source: RequirementSource;
  external_id?: string;
  total_linked_tcs: number;
  executed_tcs: number;
  passed_tcs: number;
  failed_tcs: number;
  blocked_tcs: number;
  coverage_pct: number;
  gap_type: GapType;
}

export interface ProjectCoverageStats {
  total: number;
  fully_covered: number;   // coverage_pct = 100
  partially_covered: number; // 0 < coverage_pct < 100
  no_coverage: number;     // coverage_pct = 0
  overall_pct: number;     // (total_linked > 0) / total * 100
  no_tc_count: number;
  no_exec_count: number;
  fail_count: number;
}

export interface RequirementFilters {
  status?: RequirementStatus;
  priority?: RequirementPriority;
  source?: RequirementSource;
  search?: string;
  category?: string;
}

export interface CreateRequirementPayload {
  project_id: string;
  title: string;
  description?: string;
  priority?: RequirementPriority;
  category?: string;
  status?: RequirementStatus;
  parent_id?: string;
  source?: RequirementSource;
  external_id?: string;
  external_url?: string;
  external_status?: string;
  external_type?: string;
  custom_id?: string;
}

export interface UpdateRequirementPayload {
  title?: string;
  description?: string;
  priority?: RequirementPriority;
  category?: string;
  status?: RequirementStatus;
  parent_id?: string;
}

export interface CsvRequirementRow {
  title: string;
  description?: string;
  priority?: RequirementPriority;
  category?: string;
  external_id?: string;   // Jira Key (optional)
  custom_id?: string;     // 지정 ID (optional)
}

// ─── useRequirements — 목록 조회 ─────────────────────────────────────────────

export function useRequirements(
  projectId: string,
  filters: RequirementFilters = {},
) {
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('requirements')
        .select('*')
        .eq('project_id', projectId)
        .order('custom_id', { ascending: true });

      if (filters.status)   query = query.eq('status', filters.status);
      if (filters.priority) query = query.eq('priority', filters.priority);
      if (filters.source)   query = query.eq('source', filters.source);
      if (filters.category) query = query.eq('category', filters.category);
      if (filters.search) {
        query = query.or(
          `title.ilike.%${filters.search}%,custom_id.ilike.%${filters.search}%,external_id.ilike.%${filters.search}%`,
        );
      }

      const { data, error: err } = await query;
      if (err) throw err;
      setRequirements(data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load requirements');
    } finally {
      setLoading(false);
    }
  }, [projectId, JSON.stringify(filters)]);

  useEffect(() => { fetch(); }, [fetch]);

  return { requirements, loading, error, refetch: fetch };
}

// ─── useRequirementDetail — 단건 조회 ────────────────────────────────────────

export function useRequirementDetail(requirementId: string | null) {
  const [requirement, setRequirement] = useState<Requirement | null>(null);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!requirementId) return;
    setLoading(true);
    setError(null);

    try {
      const { data, error: err } = await supabase
        .from('requirements')
        .select('*')
        .eq('id', requirementId)
        .maybeSingle();

      if (err) throw err;
      setRequirement(data || null);
    } catch (err: any) {
      setError(err.message || 'Failed to load requirement');
    } finally {
      setLoading(false);
    }
  }, [requirementId]);

  useEffect(() => { fetch(); }, [fetch]);

  return { requirement, loading, error, refetch: fetch };
}

// ─── useRequirementCoverage — MV 기반 커버리지 집계 ──────────────────────────

export function useRequirementCoverage(projectId: string) {
  const [coverage, setCoverage]   = useState<RequirementCoverage[]>([]);
  const [stats, setStats]         = useState<ProjectCoverageStats | null>(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    setError(null);

    try {
      const { data, error: err } = await supabase
        .from('requirement_coverage_summary')
        .select('*')
        .eq('project_id', projectId)
        .order('coverage_pct', { ascending: true });

      if (err) throw err;

      const rows = (data || []) as RequirementCoverage[];
      setCoverage(rows);

      // Project-level 통계 계산
      const total             = rows.length;
      const fully_covered     = rows.filter(r => r.coverage_pct === 100).length;
      const no_coverage       = rows.filter(r => r.total_linked_tcs === 0).length;
      const partially_covered = total - fully_covered - no_coverage;
      const with_tc           = rows.filter(r => r.total_linked_tcs > 0).length;
      const overall_pct       = total > 0 ? Math.round((with_tc / total) * 100) : 0;
      const no_tc_count       = rows.filter(r => r.gap_type === 'no_tc').length;
      const no_exec_count     = rows.filter(r => r.gap_type === 'no_exec').length;
      const fail_count        = rows.filter(r => r.gap_type === 'fail').length;

      setStats({ total, fully_covered, partially_covered, no_coverage, overall_pct, no_tc_count, no_exec_count, fail_count });
    } catch (err: any) {
      setError(err.message || 'Failed to load coverage');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => { fetch(); }, [fetch]);

  return { coverage, stats, loading, error, refetch: fetch };
}

// ─── useCreateRequirement ─────────────────────────────────────────────────────

export function useCreateRequirement() {
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const create = useCallback(async (payload: CreateRequirementPayload): Promise<Requirement | null> => {
    setLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error: err } = await supabase
        .from('requirements')
        .insert({ ...payload, created_by: user.id })
        .select()
        .single();

      if (err) throw err;
      return data as Requirement;
    } catch (err: any) {
      setError(err.message || 'Failed to create requirement');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { create, loading, error };
}

// ─── useUpdateRequirement ─────────────────────────────────────────────────────

export function useUpdateRequirement() {
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const update = useCallback(async (
    requirementId: string,
    payload: UpdateRequirementPayload,
  ): Promise<Requirement | null> => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: err } = await supabase
        .from('requirements')
        .update(payload)
        .eq('id', requirementId)
        .select()
        .single();

      if (err) throw err;
      return data as Requirement;
    } catch (err: any) {
      setError(err.message || 'Failed to update requirement');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { update, loading, error };
}

// ─── useDeleteRequirement — soft delete (status = 'deprecated') ───────────────

export function useDeleteRequirement() {
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const deprecate = useCallback(async (requirementId: string): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const { error: err } = await supabase
        .from('requirements')
        .update({ status: 'deprecated' })
        .eq('id', requirementId);

      if (err) throw err;
      return true;
    } catch (err: any) {
      setError(err.message || 'Failed to deprecate requirement');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  return { deprecate, loading, error };
}

// ─── useRequirementCount — Tier Gating용 수량 확인 ───────────────────────────

export function useRequirementCount(projectId: string) {
  const [count, setCount]   = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);

    const { data } = await supabase
      .rpc('count_active_requirements', { p_project_id: projectId });

    setCount((data as number) ?? 0);
    setLoading(false);
  }, [projectId]);

  useEffect(() => { fetch(); }, [fetch]);

  return { count, loading, refetch: fetch };
}

// ─── useImportCsvRequirements — CSV 일괄 import ───────────────────────────────

export function useImportCsvRequirements() {
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [importedCount, setImportedCount] = useState(0);

  /**
   * CSV 문자열을 파싱하여 requirements에 일괄 insert
   * 첫 행은 헤더 (ID, Title, Description, Priority, Category, Jira Key)
   */
  const importCsv = useCallback(async (
    projectId: string,
    csvText: string,
  ): Promise<{ success: boolean; imported: number; errors: string[] }> => {
    setLoading(true);
    setError(null);
    setImportedCount(0);

    const errors: string[] = [];

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const lines = csvText.trim().split('\n');
      if (lines.length < 2) throw new Error('CSV must have a header row and at least one data row');

      // 헤더 파싱 (소문자 + trim)
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/\s+/g, '_'));

      const rows: CreateRequirementPayload[] = [];

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // 간단한 CSV 파싱 (쌍따옴표 내 콤마 처리)
        const values = parseCsvLine(line);
        const row: Record<string, string> = {};
        headers.forEach((h, idx) => { row[h] = (values[idx] || '').trim(); });

        const title = row['title'] || row['name'] || '';
        if (!title) {
          errors.push(`Row ${i + 1}: missing title`);
          continue;
        }

        const rawPriority = (row['priority'] || 'P3').toUpperCase();
        const priority: RequirementPriority = (['P1', 'P2', 'P3', 'P4'].includes(rawPriority) ? rawPriority : 'P3') as RequirementPriority;

        const externalId = row['jira_key'] || row['jira key'] || row['external_id'] || undefined;

        rows.push({
          project_id: projectId,
          title,
          description: row['description'] || undefined,
          priority,
          category: row['category'] || undefined,
          source: externalId ? 'jira' : 'csv',
          external_id: externalId,
          custom_id: row['id'] || row['custom_id'] || undefined,
          created_by: user.id,
          status: 'active',
        } as CreateRequirementPayload);
      }

      if (rows.length === 0) throw new Error('No valid rows found in CSV');

      const { data, error: err } = await supabase
        .from('requirements')
        .insert(rows as any)
        .select('id');

      if (err) throw err;

      const imported = data?.length || 0;
      setImportedCount(imported);
      return { success: true, imported, errors };
    } catch (err: any) {
      const msg = err.message || 'CSV import failed';
      setError(msg);
      return { success: false, imported: 0, errors: [msg, ...errors] };
    } finally {
      setLoading(false);
    }
  }, []);

  return { importCsv, loading, error, importedCount };
}

// ─── useRequirementHistory — 변경 이력 (Enterprise) ──────────────────────────

export function useRequirementHistory(requirementId: string | null) {
  const [history, setHistory]   = useState<any[]>([]);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!requirementId) return;
    setLoading(true);
    setError(null);

    try {
      const { data, error: err } = await supabase
        .from('requirement_history')
        .select('*, profiles:user_id(full_name, email)')
        .eq('requirement_id', requirementId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (err) throw err;
      setHistory(data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load history');
    } finally {
      setLoading(false);
    }
  }, [requirementId]);

  useEffect(() => { fetch(); }, [fetch]);

  return { history, loading, error, refetch: fetch };
}

// ─── Helper: CSV 한 줄 파싱 (쌍따옴표 내 콤마 처리) ──────────────────────────

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}
