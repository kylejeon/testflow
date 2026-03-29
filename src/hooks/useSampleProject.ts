import { useCallback } from 'react';
import { supabase } from '../lib/supabase';

interface SampleTestCase {
  title: string;
  module: string;
  priority: string;
  status: string;
  steps: string;
  expected_result: string;
}

export function useSampleProject() {
  const createSampleProject = useCallback(async (): Promise<string> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const projectId = crypto.randomUUID();
    const now = new Date();

    // 1. Create project
    const { error: projError } = await supabase.from('projects').insert([{
      id: projectId,
      name: 'Sample E-commerce App',
      description: 'A sample project demonstrating Testably features with realistic QA test data for an e-commerce application.',
      status: 'active',
      prefix: 'SAM',
      owner_id: user.id,
    }]);
    if (projError) throw projError;

    // 2. Add creator as admin member (upsert to avoid duplicate key if already exists)
    const { error: memberError } = await supabase.from('project_members').upsert([{
      project_id: projectId,
      user_id: user.id,
      role: 'owner',
      invited_by: user.id,
    }], { onConflict: 'project_id,user_id' });
    if (memberError) throw memberError;

    // 3. Fetch template
    const { data: template, error: tmplError } = await supabase
      .from('sample_project_templates')
      .select('*')
      .eq('template_key', 'ecommerce_app')
      .single();
    if (tmplError) throw tmplError;

    const testCasesTemplate: SampleTestCase[] = template.test_cases as SampleTestCase[];

    // 4. Insert test cases
    const VALID_TC_STATUSES = new Set(['untested', 'passed', 'failed', 'blocked', 'retest']);
    const normalizeStatus = (s: string) => VALID_TC_STATUSES.has(s) ? s : 'untested';

    const testCaseRows = testCasesTemplate.map((tc, idx) => ({
      id: crypto.randomUUID(),
      project_id: projectId,
      title: tc.title,
      description: null,
      precondition: null,
      folder: tc.module,
      priority: tc.priority,
      status: normalizeStatus(tc.status),
      is_automated: false,
      steps: tc.steps,
      expected_result: tc.expected_result,
      assignee: null,
      created_by: user.id,
      custom_id: `SAM-${idx + 1}`,
    }));

    const { data: insertedCases, error: tcError } = await supabase
      .from('test_cases')
      .insert(testCaseRows)
      .select('id');
    if (tcError) throw tcError;

    const testCaseIds = (insertedCases ?? []).map((r: { id: string }) => r.id);

    // 5. Create milestone
    const milestoneId = crypto.randomUUID();
    const targetDate = new Date(now);
    targetDate.setDate(targetDate.getDate() + 14);

    const { error: msError } = await supabase.from('milestones').insert([{
      id: milestoneId,
      project_id: projectId,
      name: 'MVP Testing Complete',
      status: 'started',
      progress: 0,
      start_date: now.toISOString().slice(0, 10),
      end_date: targetDate.toISOString().slice(0, 10),
    }]);
    if (msError) throw msError;

    // 6. Create test run
    const runId = crypto.randomUUID();
    const { error: runError } = await supabase.from('test_runs').insert([{
      id: runId,
      project_id: projectId,
      milestone_id: milestoneId,
      name: 'Sprint 1 Regression',
      status: 'in_progress',
      progress: 0,
      passed: 10,
      failed: 2,
      blocked: 0,
      retest: 0,
      untested: 3,
      tags: [],
      assignees: [],
      test_case_ids: testCaseIds,
      executed_at: now.toISOString(),
      is_automated: false,
    }]);
    if (runError) throw runError;

    // 7. Create session
    const { error: sessError } = await supabase.from('sessions').insert([{
      id: crypto.randomUUID(),
      project_id: projectId,
      name: 'Checkout Flow Exploration',
      milestone_id: milestoneId,
      charter: 'Explored checkout flow, found cart persistence issue when switching browsers.',
      tags: ['checkout', 'cart'],
      assignees: [user.id],
      status: 'active',
    }]);
    if (sessError) throw sessError;

    return projectId;
  }, []);

  return { createSampleProject };
}

export default useSampleProject;
