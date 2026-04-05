/**
 * useSharedStepUsages
 * TC ↔ Shared Step 참조 관계 관리 훅
 *
 * 포함 기능:
 *  - TC에서 Shared Step 참조 등록 / 해제
 *  - 특정 Shared Step을 사용하는 TC 목록 조회 (역방향)
 *  - 특정 TC에서 참조하는 Shared Step 목록 조회
 *  - TC steps JSON과 shared_step_usage 테이블 동기화 헬퍼
 */
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { SharedStep, SharedStepItem } from './useSharedSteps';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SharedStepRef {
  id: string;
  type: 'shared_step_ref';
  shared_step_id: string;
  shared_step_custom_id: string;
  shared_step_name: string;
  shared_step_version: number;
}

export type TestCaseStep = SharedStepItem & { id?: string } | SharedStepRef;

export interface SharedStepUsage {
  id: string;
  shared_step_id: string;
  test_case_id: string;
  position: number;
  linked_version: number;
  linked_by: string;
  linked_at: string;
}

export interface UsageTCInfo {
  usage_id: string;
  test_case_id: string;
  custom_id: string;
  title: string;
  priority: string;
  folder?: string;
  position: number;
  linked_version: number;
  linked_at: string;
}

export interface UsageSharedStepInfo {
  usage_id: string;
  shared_step_id: string;
  custom_id: string;
  name: string;
  category?: string;
  version: number;
  steps_count: number;
  position: number;
  linked_version: number;
  linked_at: string;
}

// ─── useSharedStepUsedByTCs — Shared Step을 사용하는 TC 목록 (역방향) ─────────

export function useSharedStepUsedByTCs(sharedStepId: string | null) {
  const [tcs, setTcs]           = useState<UsageTCInfo[]>([]);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!sharedStepId) { setTcs([]); return; }
    setLoading(true);
    setError(null);

    try {
      const { data, error: err } = await supabase
        .from('shared_step_usage')
        .select(`
          id,
          test_case_id,
          position,
          linked_version,
          linked_at,
          test_cases!inner(custom_id, title, priority, folder)
        `)
        .eq('shared_step_id', sharedStepId)
        .order('linked_at', { ascending: false });

      if (err) throw err;

      const result: UsageTCInfo[] = (data || []).map((row: any) => ({
        usage_id:       row.id,
        test_case_id:   row.test_case_id,
        custom_id:      row.test_cases?.custom_id || '',
        title:          row.test_cases?.title || '',
        priority:       row.test_cases?.priority || 'medium',
        folder:         row.test_cases?.folder,
        position:       row.position,
        linked_version: row.linked_version,
        linked_at:      row.linked_at,
      }));

      setTcs(result);
    } catch (err: any) {
      setError(err.message || 'Failed to load usage list');
    } finally {
      setLoading(false);
    }
  }, [sharedStepId]);

  useEffect(() => { fetch(); }, [fetch]);

  return { tcs, loading, error, refetch: fetch };
}

// ─── useTCSharedSteps — TC에서 참조하는 Shared Step 목록 ─────────────────────

export function useTCSharedSteps(testCaseId: string | null) {
  const [sharedSteps, setSharedSteps] = useState<UsageSharedStepInfo[]>([]);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!testCaseId) { setSharedSteps([]); return; }
    setLoading(true);
    setError(null);

    try {
      const { data, error: err } = await supabase
        .from('shared_step_usage')
        .select(`
          id,
          shared_step_id,
          position,
          linked_version,
          linked_at,
          shared_steps!inner(custom_id, name, category, version, steps)
        `)
        .eq('test_case_id', testCaseId)
        .order('position', { ascending: true });

      if (err) throw err;

      const result: UsageSharedStepInfo[] = (data || []).map((row: any) => ({
        usage_id:       row.id,
        shared_step_id: row.shared_step_id,
        custom_id:      row.shared_steps?.custom_id || '',
        name:           row.shared_steps?.name || '',
        category:       row.shared_steps?.category,
        version:        row.shared_steps?.version || 1,
        steps_count:    (row.shared_steps?.steps || []).length,
        position:       row.position,
        linked_version: row.linked_version,
        linked_at:      row.linked_at,
      }));

      setSharedSteps(result);
    } catch (err: any) {
      setError(err.message || 'Failed to load TC shared steps');
    } finally {
      setLoading(false);
    }
  }, [testCaseId]);

  useEffect(() => { fetch(); }, [fetch]);

  return { sharedSteps, loading, error, refetch: fetch };
}

// ─── useLinkSharedStep — TC에 Shared Step 참조 등록 ──────────────────────────

export function useLinkSharedStep() {
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  /**
   * TC의 steps JSON에 shared_step_ref를 추가하고, shared_step_usage에 기록
   *
   * @param testCaseId  대상 TC id
   * @param sharedStep  삽입할 Shared Step 객체
   * @param position    steps 배열 내 삽입 위치 (0-based)
   * @param currentSteps 현재 TC steps 배열 (갱신 후 반환)
   */
  const link = useCallback(async (
    testCaseId: string,
    sharedStep: SharedStep,
    position: number,
    currentSteps: any[],
  ): Promise<any[] | null> => {
    setLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // shared_step_ref 오브젝트 생성
      const ref: SharedStepRef = {
        id:                    crypto.randomUUID(),
        type:                  'shared_step_ref',
        shared_step_id:        sharedStep.id,
        shared_step_custom_id: sharedStep.custom_id,
        shared_step_name:      sharedStep.name,
        shared_step_version:   sharedStep.version,
      };

      // steps 배열에 삽입
      const updatedSteps = [
        ...currentSteps.slice(0, position),
        ref,
        ...currentSteps.slice(position),
      ];

      // TC 업데이트
      const { error: updateErr } = await supabase
        .from('test_cases')
        .update({ steps: JSON.stringify(updatedSteps) })
        .eq('id', testCaseId);

      if (updateErr) throw updateErr;

      // shared_step_usage 기록 (중복 시 upsert)
      const { error: usageErr } = await supabase
        .from('shared_step_usage')
        .upsert({
          shared_step_id: sharedStep.id,
          test_case_id:   testCaseId,
          position,
          linked_version: sharedStep.version,
          linked_by:      user.id,
        }, { onConflict: 'shared_step_id,test_case_id,position' });

      if (usageErr) throw usageErr;

      return updatedSteps;
    } catch (err: any) {
      setError(err.message || 'Failed to link shared step');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { link, loading, error };
}

// ─── useUnlinkSharedStep — TC에서 Shared Step 참조 해제 ──────────────────────

export function useUnlinkSharedStep() {
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  /**
   * TC의 steps JSON에서 shared_step_ref를 제거하고, shared_step_usage에서도 삭제
   *
   * @param testCaseId    대상 TC id
   * @param sharedStepId  제거할 Shared Step id
   * @param position      steps 배열 내 위치 (0-based)
   * @param currentSteps  현재 TC steps 배열
   */
  const unlink = useCallback(async (
    testCaseId: string,
    sharedStepId: string,
    position: number,
    currentSteps: any[],
  ): Promise<any[] | null> => {
    setLoading(true);
    setError(null);

    try {
      // steps 배열에서 해당 위치의 ref 제거
      const updatedSteps = currentSteps.filter((_, idx) => idx !== position);

      // TC 업데이트
      const { error: updateErr } = await supabase
        .from('test_cases')
        .update({ steps: JSON.stringify(updatedSteps) })
        .eq('id', testCaseId);

      if (updateErr) throw updateErr;

      // shared_step_usage 레코드 삭제
      const { error: usageErr } = await supabase
        .from('shared_step_usage')
        .delete()
        .eq('shared_step_id', sharedStepId)
        .eq('test_case_id', testCaseId)
        .eq('position', position);

      if (usageErr) throw usageErr;

      return updatedSteps;
    } catch (err: any) {
      setError(err.message || 'Failed to unlink shared step');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { unlink, loading, error };
}

// ─── useSyncSharedStepUsages — TC steps 변경 후 usage 테이블 전체 동기화 ──────
//  TC steps JSON이 외부에서 통째로 교체될 때 사용
//  (예: "인라인으로 변환 후 Shared Step 삭제" 시나리오)

export function useSyncSharedStepUsages() {
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  /**
   * TC의 steps JSON을 파싱해서 shared_step_usage 테이블을 전량 재동기화
   *
   * 1. 기존 usage 레코드 전체 삭제
   * 2. steps 배열에서 shared_step_ref만 추출해 재삽입
   */
  const sync = useCallback(async (
    testCaseId: string,
    steps: any[],
  ): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // 기존 usage 전체 삭제
      const { error: deleteErr } = await supabase
        .from('shared_step_usage')
        .delete()
        .eq('test_case_id', testCaseId);

      if (deleteErr) throw deleteErr;

      // steps에서 shared_step_ref 추출
      const refs = steps
        .map((s, idx) => ({ step: s, idx }))
        .filter(({ step }) => step?.type === 'shared_step_ref');

      if (refs.length === 0) return true;

      const usageRows = refs.map(({ step, idx }) => ({
        shared_step_id: step.shared_step_id,
        test_case_id:   testCaseId,
        position:       idx,
        linked_version: step.shared_step_version,
        linked_by:      user.id,
      }));

      const { error: insertErr } = await supabase
        .from('shared_step_usage')
        .insert(usageRows);

      if (insertErr) throw insertErr;

      return true;
    } catch (err: any) {
      setError(err.message || 'Failed to sync shared step usages');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  return { sync, loading, error };
}

// ─── useInlineConvertAndDelete — "인라인으로 변환 후 Shared Step 삭제" ─────────
//  참조하는 모든 TC의 shared_step_ref를 일반 스텝으로 교체 후 Shared Step 삭제

export function useInlineConvertAndDelete() {
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [convertedCount, setConvertedCount] = useState(0);

  const convertAndDelete = useCallback(async (
    sharedStep: SharedStep,
  ): Promise<boolean> => {
    setLoading(true);
    setError(null);
    setConvertedCount(0);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // 1. 이 Shared Step을 참조하는 모든 TC 조회
      const { data: usages, error: usageErr } = await supabase
        .from('shared_step_usage')
        .select('test_case_id, position')
        .eq('shared_step_id', sharedStep.id);

      if (usageErr) throw usageErr;

      if (usages && usages.length > 0) {
        // 고유 TC id 목록
        const tcIds = [...new Set(usages.map((u: any) => u.test_case_id))];

        // 2. 각 TC의 현재 steps 조회
        const { data: tcs, error: tcErr } = await supabase
          .from('test_cases')
          .select('id, steps')
          .in('id', tcIds);

        if (tcErr) throw tcErr;

        // 3. 각 TC의 steps에서 shared_step_ref → 일반 스텝으로 교체
        for (const tc of (tcs || [])) {
          let rawSteps: any[];
          try {
            rawSteps = typeof tc.steps === 'string'
              ? JSON.parse(tc.steps)
              : (tc.steps || []);
          } catch {
            rawSteps = [];
          }

          const updatedSteps = rawSteps.flatMap((s: any) => {
            if (s?.type === 'shared_step_ref' && s.shared_step_id === sharedStep.id) {
              // Shared Step의 현재 steps를 인라인으로 전개
              return sharedStep.steps.map((item, i) => ({
                id:             crypto.randomUUID(),
                step:           item.step,
                expectedResult: item.expectedResult,
              }));
            }
            return [s];
          });

          await supabase
            .from('test_cases')
            .update({ steps: JSON.stringify(updatedSteps) })
            .eq('id', tc.id);
        }

        setConvertedCount(tcIds.length);
      }

      // 4. Shared Step 삭제 (CASCADE로 shared_step_usage, shared_step_versions도 삭제)
      const { error: deleteErr } = await supabase
        .from('shared_steps')
        .delete()
        .eq('id', sharedStep.id);

      if (deleteErr) throw deleteErr;

      return true;
    } catch (err: any) {
      setError(err.message || 'Failed to convert and delete shared step');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  return { convertAndDelete, convertedCount, loading, error };
}
