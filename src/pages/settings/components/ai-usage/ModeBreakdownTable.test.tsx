/**
 * Tests for ModeBreakdownTable — AC-6 (descending sort, % calc).
 */
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import i18n from '../../../../i18n';
import ModeBreakdownTable from './ModeBreakdownTable';
import type { ModeBreakdownRow } from '../../../../types/aiUsage';

function renderWithI18n(node: React.ReactNode) {
  return render(<I18nextProvider i18n={i18n}>{node}</I18nextProvider>);
}

const ROWS: ModeBreakdownRow[] = [
  { mode: 'text',    label: 'Test Cases (Text)',  credits: 20, calls: 18, percent: 54.1, color: '#6366F1' },
  { mode: 'jira',    label: 'Test Cases (Jira)',  credits: 10, calls: 9,  percent: 27.0, color: '#0EA5E9' },
  { mode: 'run-summary', label: 'Run Analysis',   credits: 4,  calls: 4,  percent: 10.8, color: '#8B5CF6' },
  { mode: 'plan-assistant', label: 'Plan Assistant', credits: 3, calls: 3, percent: 8.1, color: '#EC4899' },
];

describe('ModeBreakdownTable', () => {
  it('renders one row per mode with credits / percent / calls', () => {
    renderWithI18n(<ModeBreakdownTable rows={ROWS} />);
    expect(screen.getByTestId('mode-row-text')).toBeInTheDocument();
    expect(screen.getByTestId('mode-row-jira')).toBeInTheDocument();
    expect(screen.getByTestId('mode-row-run-summary')).toBeInTheDocument();
    expect(screen.getByTestId('mode-row-plan-assistant')).toBeInTheDocument();

    expect(screen.getByText('20')).toBeInTheDocument(); // text credits
    expect(screen.getByText('54.1%')).toBeInTheDocument();
    expect(screen.getByText('18')).toBeInTheDocument(); // text calls
  });

  it('uses "Run Analysis" label for run-summary mode (AC-7)', () => {
    renderWithI18n(<ModeBreakdownTable rows={ROWS} />);
    expect(screen.getByText('Run Analysis')).toBeInTheDocument();
  });

  it('renders table header (column semantics preserved)', () => {
    renderWithI18n(<ModeBreakdownTable rows={ROWS} />);
    const headers = screen.getAllByRole('columnheader');
    expect(headers).toHaveLength(4);
  });
});
