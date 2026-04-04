/**
 * useRequirementLinks
 * Requirement ↔ TestCase Many:Many 연결 관리 훅
 *
 * 포함 기능:
 *  - Requirement에 연결된 TC 목록 조회 (with 최신 실행 결과)
 *  - TC에 연결된 Requirement 목록 조회
 *  - TC 연결 / 연결 해제
 *  - RTM 매트릭스 데이터 생성 (Requirement × TC × 결과)
 *  - RTM CSV / 매트릭스 데이터 Export
 *  - AI TC 추천 (suggest-from-requirement)
 */
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

// ─── Types ────────────────────────────────────────────────────────────────────

export type TestResultStatus = 'passed' | 'failed' | 'blocked' | 'retest' | 'untested';

export interface LinkedTC {
  link_id: string;
  test_case_id: string;
  custom_id: string;
  title: string;
  priority: string;
  folder?: string;
  linked_by: string;
  linked_at: string;
  note?: string;
  // 최신 실행 결과 (없으면 undefined)
  latest_status?: TestResultStatus;
  latest_result_at?: string;
}

export interface LinkedRequirement {
  link_id: string;
  requirement_id: string;
  custom_id: string;
  title: string;
  priority: string;
  source: string;
  external_id?: string;
  external_url?: string;
  linked_at: string;
}

export interface MatrixCell {
  status: TestResultStatus | null; // null = not linked
  result_at?: string;
  note?: string;
}

export interface MatrixRow {
  requirement_id: string;
  custom_id: string;
  title: string;
  priority: string;
  coverage_pct: number;
  cells: Record<string, MatrixCell>; // key = test_case_id
}

export interface MatrixColumn {
  test_case_id: string;
  custom_id: string;
  title: string;
}

export interface RTMMatrix {
  rows: MatrixRow[];
  columns: MatrixColumn[];
}

// ─── useLinkedTCs — Requirement에 연결된 TC 목록 ─────────────────────────────

export function useLinkedTCs(requirementId: string | null) {
  const [tcs, setTcs]           = useState<LinkedTC[]>([]);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!requirementId) { setTcs([]); return; }
    setLoading(true);
    setError(null);

    try {
      // 연결 링크 + TC 기본 정보
      const { data: links, error: linkErr } = await supabase
        .from('requirement_tc_links')
        .select(`
          id,
          test_case_id,
          linked_by,
          linked_at,
          note,
          test_cases!inner(custom_id, title, priority, folder)
        `)
        .eq('requirement_id', requirementId)
        .order('linked_at', { ascending: true });

      if (linkErr) throw linkErr;

      if (!links || links.length === 0) {
        setTcs([]);
        return;
      }

      const tcIds = links.map((l: any) => l.test_case_id);

      // 각 TC의 최신 test_result 조회
      const { data: results } = await supabase
        .from('test_results')
        .select('test_case_id, status, created_at')
        .in('test_case_id', tcIds)
        .order('created_at', { ascending: false });

      // TC당 최신 결과만 유지
      const latestMap: Record<string, { status: TestResultStatus; created_at: string }> = {};
      (results || []).forEach((r: any) => {
        if (!latestMap[r.test_case_id]) {
          latestMap[r.test_case_id] = { status: r.status, created_at: r.created_at };
        }
      });

      const linkedTCs: LinkedTC[] = links.map((l: any) => {
        const tc = l.test_cases;
        const latest = latestMap[l.test_case_id];
        return {
          link_id:      l.id,
          test_case_id: l.test_case_id,
          custom_id:    tc?.custom_id || '',
          title:        tc?.title || '',
          priority:     tc?.priority || 'medium',
          folder:       tc?.folder,
          linked_by:    l.linked_by,
          linked_at:    l.linked_at,
          note:         l.note,
          latest_status:    latest?.status,
          latest_result_at: latest?.created_at,
        };
      });

      setTcs(linkedTCs);
    } catch (err: any) {
      setError(err.message || 'Failed to load linked test cases');
    } finally {
      setLoading(false);
    }
  }, [requirementId]);

  useEffect(() => { fetch(); }, [fetch]);

  return { tcs, loading, error, refetch: fetch };
}

// ─── useLinkedRequirements — TC에 연결된 Requirement 목록 ────────────────────

export function useLinkedRequirements(testCaseId: string | null) {
  const [requirements, setRequirements] = useState<LinkedRequirement[]>([]);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!testCaseId) { setRequirements([]); return; }
    setLoading(true);
    setError(null);

    try {
      const { data: links, error: linkErr } = await supabase
        .from('requirement_tc_links')
        .select(`
          id,
          requirement_id,
          linked_at,
          requirements!inner(custom_id, title, priority, source, external_id, external_url)
        `)
        .eq('test_case_id', testCaseId)
        .order('linked_at', { ascending: true });

      if (linkErr) throw linkErr;

      const linkedReqs: LinkedRequirement[] = (links || []).map((l: any) => {
        const r = l.requirements;
        return {
          link_id:        l.id,
          requirement_id: l.requirement_id,
          custom_id:      r?.custom_id || '',
          title:          r?.title || '',
          priority:       r?.priority || 'P3',
          source:         r?.source || 'manual',
          external_id:    r?.external_id,
          external_url:   r?.external_url,
          linked_at:      l.linked_at,
        };
      });

      setRequirements(linkedReqs);
    } catch (err: any) {
      setError(err.message || 'Failed to load linked requirements');
    } finally {
      setLoading(false);
    }
  }, [testCaseId]);

  useEffect(() => { fetch(); }, [fetch]);

  return { requirements, loading, error, refetch: fetch };
}

// ─── useLinkTC — TC 연결 ──────────────────────────────────────────────────────

export function useLinkTC() {
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const link = useCallback(async (
    requirementId: string,
    testCaseId: string,
    note?: string,
  ): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error: err } = await supabase
        .from('requirement_tc_links')
        .insert({
          requirement_id: requirementId,
          test_case_id:   testCaseId,
          linked_by:      user.id,
          note,
        });

      if (err) throw err;

      // History 기록
      await supabase.from('requirement_history').insert({
        requirement_id: requirementId,
        user_id:        user.id,
        action_type:    'tc_linked',
        related_tc_id:  testCaseId,
        change_summary: 'Test case linked',
      });

      return true;
    } catch (err: any) {
      // Unique constraint 위반 = 이미 연결됨
      if (err.code === '23505') {
        setError('This test case is already linked to this requirement');
      } else {
        setError(err.message || 'Failed to link test case');
      }
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  return { link, loading, error };
}

// ─── useUnlinkTC — TC 연결 해제 ──────────────────────────────────────────────

export function useUnlinkTC() {
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const unlink = useCallback(async (
    requirementId: string,
    testCaseId: string,
  ): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error: err } = await supabase
        .from('requirement_tc_links')
        .delete()
        .eq('requirement_id', requirementId)
        .eq('test_case_id', testCaseId);

      if (err) throw err;

      // History 기록
      await supabase.from('requirement_history').insert({
        requirement_id: requirementId,
        user_id:        user.id,
        action_type:    'tc_unlinked',
        related_tc_id:  testCaseId,
        change_summary: 'Test case unlinked',
      });

      return true;
    } catch (err: any) {
      setError(err.message || 'Failed to unlink test case');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  return { unlink, loading, error };
}

// ─── useRTMMatrix — 매트릭스 뷰 데이터 생성 ──────────────────────────────────
//  rows = active requirements, columns = 연결된 모든 TC, cells = 최신 결과

export function useRTMMatrix(projectId: string) {
  const [matrix, setMatrix]   = useState<RTMMatrix | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    setError(null);

    try {
      // 1. active requirements 조회
      const { data: reqs, error: reqErr } = await supabase
        .from('requirements')
        .select('id, custom_id, title, priority')
        .eq('project_id', projectId)
        .eq('status', 'active')
        .order('custom_id', { ascending: true });

      if (reqErr) throw reqErr;
      if (!reqs || reqs.length === 0) {
        setMatrix({ rows: [], columns: [] });
        return;
      }

      const reqIds = reqs.map((r: any) => r.id);

      // 2. 모든 requirement_tc_links (이 프로젝트)
      const { data: links, error: linkErr } = await supabase
        .from('requirement_tc_links')
        .select('requirement_id, test_case_id')
        .in('requirement_id', reqIds);

      if (linkErr) throw linkErr;

      const allTcIds = [...new Set((links || []).map((l: any) => l.test_case_id))];

      // 3. TC 기본 정보 조회
      const { data: tcs } = allTcIds.length > 0
        ? await supabase
          .from('test_cases')
          .select('id, custom_id, title')
          .in('id', allTcIds)
          .order('custom_id', { ascending: true })
        : { data: [] };

      const tcMap: Record<string, { custom_id: string; title: string }> = {};
      (tcs || []).forEach((tc: any) => { tcMap[tc.id] = { custom_id: tc.custom_id, title: tc.title }; });

      // 4. 각 TC의 최신 실행 결과 조회
      const { data: results } = allTcIds.length > 0
        ? await supabase
          .from('test_results')
          .select('test_case_id, status, created_at, note')
          .in('test_case_id', allTcIds)
          .order('created_at', { ascending: false })
        : { data: [] };

      const latestMap: Record<string, { status: TestResultStatus; created_at: string; note?: string }> = {};
      (results || []).forEach((r: any) => {
        if (!latestMap[r.test_case_id]) {
          latestMap[r.test_case_id] = { status: r.status, created_at: r.created_at, note: r.note };
        }
      });

      // 5. requirement → linked tc_ids 맵
      const reqTcMap: Record<string, Set<string>> = {};
      (links || []).forEach((l: any) => {
        if (!reqTcMap[l.requirement_id]) reqTcMap[l.requirement_id] = new Set();
        reqTcMap[l.requirement_id].add(l.test_case_id);
      });

      // 6. 매트릭스 조립
      const columns: MatrixColumn[] = allTcIds.map(tcId => ({
        test_case_id: tcId,
        custom_id:    tcMap[tcId]?.custom_id || tcId.slice(0, 8),
        title:        tcMap[tcId]?.title || '',
      }));

      const rows: MatrixRow[] = (reqs as any[]).map(req => {
        const linkedTcIds = reqTcMap[req.id] || new Set<string>();
        const cells: Record<string, MatrixCell> = {};

        for (const tcId of allTcIds) {
          if (linkedTcIds.has(tcId)) {
            const latest = latestMap[tcId];
            cells[tcId] = {
              status:    latest?.status ?? 'untested',
              result_at: latest?.created_at,
              note:      latest?.note,
            };
          } else {
            cells[tcId] = { status: null };
          }
        }

        // coverage_pct 계산
        const linkedCount  = linkedTcIds.size;
        const executedCount = [...linkedTcIds].filter(id => {
          const s = latestMap[id]?.status;
          return s && s !== 'untested';
        }).length;
        const coverage_pct = linkedCount > 0
          ? Math.round((executedCount / linkedCount) * 100)
          : 0;

        return {
          requirement_id: req.id,
          custom_id:      req.custom_id,
          title:          req.title,
          priority:       req.priority,
          coverage_pct,
          cells,
        };
      });

      setMatrix({ rows, columns });
    } catch (err: any) {
      setError(err.message || 'Failed to build RTM matrix');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => { fetch(); }, [fetch]);

  return { matrix, loading, error, refetch: fetch };
}

// ─── exportRTMCsv — RTM 매트릭스를 CSV 문자열로 내보내기 ─────────────────────

export function exportRTMCsv(matrix: RTMMatrix): string {
  if (!matrix.rows.length) return '';

  const header = [
    'Requirement ID',
    'Title',
    'Priority',
    'Coverage %',
    ...matrix.columns.map(c => c.custom_id),
  ].join(',');

  const dataRows = matrix.rows.map(row => {
    const cells = matrix.columns.map(col => {
      const cell = row.cells[col.test_case_id];
      if (!cell || cell.status === null) return '';
      const statusMap: Record<string, string> = {
        passed: 'Pass', failed: 'Fail', blocked: 'Blocked',
        retest: 'Retest', untested: 'Untested',
      };
      return statusMap[cell.status] || cell.status;
    });

    return [
      `"${row.custom_id}"`,
      `"${row.title.replace(/"/g, '""')}"`,
      row.priority,
      row.coverage_pct,
      ...cells,
    ].join(',');
  });

  return [header, ...dataRows].join('\n');
}

// ─── useAISuggestTCs — 요구사항 분석 → TC 자동 추천 ──────────────────────────

export function useAISuggestTCs() {
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<any[]>([]);

  const suggest = useCallback(async (params: {
    requirementId: string;
    requirementTitle: string;
    requirementDescription?: string;
    existingTCs?: { custom_id: string; title: string }[];
    projectId?: string;
  }): Promise<any[]> => {
    setLoading(true);
    setError(null);
    setSuggestions([]);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const supabaseUrl = (supabase as any).supabaseUrl || import.meta.env.VITE_SUPABASE_URL;
      const resp = await fetch(
        `${supabaseUrl}/functions/v1/generate-testcases`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action:                    'suggest-from-requirement',
            project_id:                params.projectId,
            requirement_id:            params.requirementId,
            requirement_title:         params.requirementTitle,
            requirement_description:   params.requirementDescription,
            existing_tcs:              params.existingTCs || [],
          }),
        },
      );

      const data = await resp.json();

      if (!resp.ok) {
        throw new Error(data.error || `AI suggestion failed (HTTP ${resp.status})`);
      }

      setSuggestions(data.suggestions || []);
      return data.suggestions || [];
    } catch (err: any) {
      setError(err.message || 'AI suggestion failed');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  return { suggest, suggestions, loading, error };
}
