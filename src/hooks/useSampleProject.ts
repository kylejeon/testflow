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

// Hardcoded fallback — mirrors the seed in supabase/migrations/20260323001_onboarding.sql
// Used when the sample_project_templates table is unavailable or empty.
const FALLBACK_TEST_CASES: SampleTestCase[] = [
  { title: 'User registration with valid email', module: 'Authentication', priority: 'high', status: 'passed', steps: '1. Navigate to /register\n2. Enter valid email and password\n3. Click Register', expected_result: 'User account created, verification email sent' },
  { title: 'Login with correct credentials', module: 'Authentication', priority: 'high', status: 'passed', steps: '1. Navigate to /login\n2. Enter valid credentials\n3. Click Login', expected_result: 'User logged in, redirected to dashboard' },
  { title: 'Password reset flow', module: 'Authentication', priority: 'medium', status: 'passed', steps: '1. Click Forgot Password\n2. Enter email\n3. Check email and click reset link\n4. Set new password', expected_result: 'Password updated successfully' },
  { title: 'Social login (Google OAuth)', module: 'Authentication', priority: 'low', status: 'not_run', steps: '1. Click Sign in with Google\n2. Authorize in Google popup', expected_result: 'User logged in via Google account' },
  { title: 'Search products by keyword', module: 'Product Catalog', priority: 'high', status: 'passed', steps: '1. Enter keyword in search bar\n2. Click Search', expected_result: 'Relevant products displayed' },
  { title: 'Filter products by category', module: 'Product Catalog', priority: 'medium', status: 'passed', steps: '1. Select category from filter panel\n2. View results', expected_result: 'Only products in selected category shown' },
  { title: 'Sort products by price', module: 'Product Catalog', priority: 'medium', status: 'passed', steps: '1. Click Sort dropdown\n2. Select Price: Low to High', expected_result: 'Products sorted by ascending price' },
  { title: 'Product detail page loads correctly', module: 'Product Catalog', priority: 'high', status: 'passed', steps: '1. Click on any product\n2. Verify detail page loads', expected_result: 'Product image, name, price, description visible' },
  { title: 'Add item to cart', module: 'Shopping Cart', priority: 'critical', status: 'passed', steps: '1. Open product detail\n2. Click Add to Cart', expected_result: 'Item added to cart, cart count increments' },
  { title: 'Update item quantity', module: 'Shopping Cart', priority: 'high', status: 'passed', steps: '1. Open cart\n2. Change quantity using +/- buttons', expected_result: 'Quantity and total price updated' },
  { title: 'Remove item from cart', module: 'Shopping Cart', priority: 'high', status: 'failed', steps: '1. Open cart\n2. Click Remove on item', expected_result: 'Item removed, cart total recalculated' },
  { title: 'Cart persists after logout/login', module: 'Shopping Cart', priority: 'medium', status: 'failed', steps: '1. Add items to cart\n2. Logout\n3. Login again', expected_result: 'Cart items still present after re-login' },
  { title: 'Complete checkout with credit card', module: 'Checkout', priority: 'critical', status: 'passed', steps: '1. Proceed to checkout\n2. Enter shipping info\n3. Enter card details\n4. Place order', expected_result: 'Order placed, confirmation page shown' },
  { title: 'Apply discount coupon', module: 'Checkout', priority: 'medium', status: 'passed', steps: '1. Enter coupon code in checkout\n2. Click Apply', expected_result: 'Discount applied, total price reduced' },
  { title: 'Order confirmation email sent', module: 'Checkout', priority: 'high', status: 'skipped', steps: '1. Complete checkout\n2. Check email inbox', expected_result: 'Confirmation email received within 2 minutes' },
];

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

    // 3. Fetch template (fall back to hardcoded data if table is unavailable)
    let testCasesTemplate: SampleTestCase[] = FALLBACK_TEST_CASES;
    try {
      const { data: template, error: tmplError } = await supabase
        .from('sample_project_templates')
        .select('test_cases')
        .eq('template_key', 'ecommerce_app')
        .maybeSingle();
      if (!tmplError && template?.test_cases) {
        testCasesTemplate = template.test_cases as SampleTestCase[];
      }
    } catch {
      // DB table unavailable — use FALLBACK_TEST_CASES
    }

    // 4. Insert test cases
    const VALID_TC_STATUSES = new Set(['untested', 'passed', 'failed', 'blocked', 'retest', 'skipped', 'not_run']);
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
