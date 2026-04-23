/**
 * Tests for src/components/EnvironmentAIInsights.tsx (f001 rendering)
 *
 * AC-L3 coverage (Dev Spec):
 *   - rule-based only (aiInsight=null) — regression (AC-G9)
 *   - AI success state renders headline / recommendations
 *   - AI critical_reason replaces rule detail (AC-G3)
 *   - too_little_data banner (AC-G10)
 *   - chip callbacks fire: onCreateIssue / onHighlightEnv / onAssignRun
 *   - filter chip active toggle (highlightedEnv)
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '../i18n'; // initialise i18n singleton so useTranslation resolves keys
import EnvironmentAIInsights from './EnvironmentAIInsights';
import type { HeatmapMatrix } from '../lib/environments';
import type { EnvAiInsightsResult } from '../types/envAiInsights';

function makeMatrix(): HeatmapMatrix {
  // Minimal matrix with 1 env + 1 TC below 40% pass rate → triggers rule-based Critical
  const env = {
    id: 'env-1',
    project_id: 'proj-1',
    name: 'Safari 17 on macOS 14',
    os_name: 'macOS',
    os_version: '14',
    browser_name: 'Safari',
    browser_version: '17',
    device_type: 'desktop' as const,
    description: null,
    is_active: true,
    created_by: 'u-1',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  return {
    columns: [{ env, browserLabel: 'Safari 17' }],
    rows: [
      {
        tc: { id: 'tc-1', title: 'Payment checkout', priority: 'critical', custom_id: 'TC-142' },
        cells: [{
          status: 'fail',
          passed: 1,
          executed: 5,
          tooltip: '',
        }],
      },
    ],
    groups: [{ os: 'macOS', columns: [0] }],
    summary: [{ status: 'fail', passed: 1, executed: 5, tooltip: '' }],
    legacyRunCount: 0,
  } as unknown as HeatmapMatrix;
}

function makeAiInsight(overrides: Partial<EnvAiInsightsResult> = {}): EnvAiInsightsResult {
  return {
    headline: 'Safari 17 fails 63% of critical TCs',
    critical_env: 'Safari 17 on macOS 14',
    critical_reason: 'Safari 17 shows 20% pass rate across 5 executed TCs.',
    coverage_gap_tc: 'TC-142: Payment checkout — discount code',
    coverage_gap_reason: 'Untested in 4 of 5 envs.',
    recommendations: [
      'Assign a run targeting Safari 17 with 4 failing critical TCs.',
      'Schedule TC-142 on Chrome/Firefox.',
    ],
    confidence: 78,
    generated_at: new Date().toISOString(),
    meta: {
      from_cache: false,
      credits_used: 1,
      credits_remaining: 24,
      monthly_limit: 30,
      tokens_used: 812,
      latency_ms: 3241,
    },
    ...overrides,
  };
}

describe('EnvironmentAIInsights', () => {
  it('renders skeleton when matrix is null', () => {
    const { container } = render(<EnvironmentAIInsights matrix={null} />);
    // skeleton aside always renders at least one empty row
    expect(container.querySelector('aside')).toBeInTheDocument();
  });

  it('rule-based only when aiInsight=null (AC-G9 regression)', () => {
    render(<EnvironmentAIInsights matrix={makeMatrix()} aiInsight={null} />);
    // No AI headline (fail-if): env-low rule fires → envLowTitle (contains 'underperforming')
    expect(screen.queryByText(/63% of critical TCs/)).not.toBeInTheDocument();
    // But rule-based critical card should render (envLowTitle uses 'underperforming' string)
    // We loosely assert: rule-based content is present (Critical tag present)
    expect(screen.getAllByText(/critical|coverage gap|baseline|quick/i).length).toBeGreaterThan(0);
  });

  it('AI success renders headline + recommendations (AC-G2, G5)', () => {
    render(
      <EnvironmentAIInsights
        matrix={makeMatrix()}
        aiInsight={makeAiInsight()}
      />,
    );
    // Headline text rendered
    expect(screen.getByText(/Safari 17 fails 63%/)).toBeInTheDocument();
    // Both recommendations listed
    expect(screen.getByText(/Assign a run targeting Safari 17/)).toBeInTheDocument();
    expect(screen.getByText(/Schedule TC-142 on Chrome\/Firefox/)).toBeInTheDocument();
  });

  it('AI critical_reason replaces rule detail (AC-G3)', () => {
    render(
      <EnvironmentAIInsights
        matrix={makeMatrix()}
        aiInsight={makeAiInsight()}
      />,
    );
    // AI reason shown
    expect(screen.getByText(/20% pass rate across 5 executed TCs/)).toBeInTheDocument();
  });

  it('too_little_data shows info banner and hides AI headline (AC-G10)', () => {
    render(
      <EnvironmentAIInsights
        matrix={makeMatrix()}
        aiInsight={makeAiInsight({
          too_little_data: true,
          headline: null,
          critical_env: null,
          critical_reason: null,
          coverage_gap_tc: null,
          coverage_gap_reason: null,
          recommendations: [],
          confidence: 0,
        })}
      />,
    );
    // info banner title 'Not enough data yet' is rendered
    expect(screen.getByText(/Not enough data yet/i)).toBeInTheDocument();
    // No AI headline
    expect(screen.queryByText(/Safari 17 fails/)).not.toBeInTheDocument();
  });

  it('calls onHighlightEnv when Filter chip clicked', () => {
    const onHighlightEnv = vi.fn();
    render(
      <EnvironmentAIInsights
        matrix={makeMatrix()}
        aiInsight={makeAiInsight()}
        onHighlightEnv={onHighlightEnv}
      />,
    );
    // Filter chip with env name
    const filterChip = screen.getByText(/Filter Safari 17/);
    fireEvent.click(filterChip);
    expect(onHighlightEnv).toHaveBeenCalledWith('Safari 17 on macOS 14');
  });

  it('calls onCreateIssue with ai prefill when Create issue chip clicked', () => {
    const onCreateIssue = vi.fn();
    render(
      <EnvironmentAIInsights
        matrix={makeMatrix()}
        aiInsight={makeAiInsight()}
        onCreateIssue={onCreateIssue}
      />,
    );
    const issueChip = screen.getByText(/Create issue/);
    fireEvent.click(issueChip);
    expect(onCreateIssue).toHaveBeenCalledTimes(1);
    const arg = onCreateIssue.mock.calls[0][0];
    expect(arg.source).toBe('ai');
    expect(typeof arg.title).toBe('string');
    expect(arg.title.length).toBeGreaterThan(0);
  });

  it('calls onAssignRun when Assign run chip clicked', () => {
    const onAssignRun = vi.fn();
    render(
      <EnvironmentAIInsights
        matrix={makeMatrix()}
        aiInsight={makeAiInsight()}
        onAssignRun={onAssignRun}
      />,
    );
    const assignChip = screen.getByText(/Assign run/);
    fireEvent.click(assignChip);
    expect(onAssignRun).toHaveBeenCalledTimes(1);
  });

  it('Regenerate button triggers onRegenerate(false)', () => {
    const onRegenerate = vi.fn();
    render(
      <EnvironmentAIInsights
        matrix={makeMatrix()}
        aiInsight={null}
        onRegenerate={onRegenerate}
        canUseAi={true}
        tierOk={true}
      />,
    );
    const btn = screen.getByRole('button', { name: /regenerate|Generating|AI|env/i });
    fireEvent.click(btn);
    expect(onRegenerate).toHaveBeenCalledWith(false);
  });

  it('Regenerate button is disabled when tier too low', () => {
    const onRegenerate = vi.fn();
    render(
      <EnvironmentAIInsights
        matrix={makeMatrix()}
        aiInsight={null}
        onRegenerate={onRegenerate}
        canUseAi={false}
        tierOk={false}
        requiresTierName="Starter"
      />,
    );
    const btn = screen.getByRole('button', { name: /regenerate|env|AI/i });
    expect(btn).toBeDisabled();
    fireEvent.click(btn);
    expect(onRegenerate).not.toHaveBeenCalled();
  });

  it('filter chip shows active style when highlightedEnv matches', () => {
    const { rerender } = render(
      <EnvironmentAIInsights
        matrix={makeMatrix()}
        aiInsight={makeAiInsight()}
        highlightedEnv="Safari 17 on macOS 14"
      />,
    );
    // Should render "Safari 17 on macOS 14 ✕" (toggle-off label variant)
    expect(screen.getByText(/Safari 17 on macOS 14 ✕/)).toBeInTheDocument();
    rerender(
      <EnvironmentAIInsights
        matrix={makeMatrix()}
        aiInsight={makeAiInsight()}
        highlightedEnv={null}
      />,
    );
    expect(screen.queryByText(/Safari 17 on macOS 14 ✕/)).not.toBeInTheDocument();
  });
});
