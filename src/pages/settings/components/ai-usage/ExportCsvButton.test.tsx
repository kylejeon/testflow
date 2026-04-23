/**
 * Tests for ExportCsvButton — CSV builder + download trigger.
 *
 * f011 AC-18: "Export CSV" button downloads ai-usage-{YYYY-MM-DD}.csv with
 * columns (date, user_name, user_email, feature, credits). Team View only.
 */
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import i18n from '../../../../i18n';
import ExportCsvButton, { buildCsv } from './ExportCsvButton';
import type { AiUsageBreakdownRow } from '../../../../types/aiUsage';

function renderWithI18n(node: React.ReactNode) {
  return render(<I18nextProvider i18n={i18n}>{node}</I18nextProvider>);
}

const SAMPLE_ROWS: AiUsageBreakdownRow[] = [
  {
    day: '2026-04-02',
    mode: 'text',
    user_id: 'u2',
    credits_sum: 3,
    call_count: 3,
    tokens_sum: 0,
  },
  {
    day: '2026-04-01',
    mode: 'jira',
    user_id: 'u1',
    credits_sum: 2,
    call_count: 2,
    tokens_sum: 0,
  },
  {
    day: '2026-04-01',
    mode: 'text',
    user_id: 'u1',
    credits_sum: 4,
    call_count: 2,
    tokens_sum: 0,
  },
];

const EMAILS = { u1: 'alice@example.com', u2: 'bob@example.com' };
const NAMES = { u1: 'Alice Kim', u2: 'Bob Park' };

// Identity translator — keeps tests independent of i18n state.
const identityTranslate = (raw: string) => raw;

describe('buildCsv', () => {
  it('emits header + rows in date ASC, email ASC order', () => {
    const csv = buildCsv(SAMPLE_ROWS, EMAILS, NAMES, identityTranslate);
    const lines = csv.split('\n');
    expect(lines[0]).toBe('date,user_name,user_email,feature,credits');
    expect(lines[1]).toBe('2026-04-01,Alice Kim,alice@example.com,jira,2');
    expect(lines[2]).toBe('2026-04-01,Alice Kim,alice@example.com,text,4');
    expect(lines[3]).toBe('2026-04-02,Bob Park,bob@example.com,text,3');
  });

  it('escapes email containing comma', () => {
    const csv = buildCsv(
      SAMPLE_ROWS,
      {
        u1: 'Alice, Doe <alice@example.com>',
        u2: 'bob@example.com',
      },
      NAMES,
      identityTranslate,
    );
    expect(csv).toContain('"Alice, Doe <alice@example.com>"');
  });

  it('falls back to user_id when email is missing', () => {
    const csv = buildCsv(SAMPLE_ROWS, {}, {}, identityTranslate);
    // both emails map and names map empty → both fall back to user_id
    expect(csv).toContain('u1,u1,');
    expect(csv).toContain('u2,u2,');
  });

  it('falls back to email when name is missing', () => {
    const csv = buildCsv(SAMPLE_ROWS, EMAILS, {}, identityTranslate);
    expect(csv).toContain('alice@example.com,alice@example.com,');
    expect(csv).toContain('bob@example.com,bob@example.com,');
  });

  it('uses translated mode label in feature column', () => {
    const translate = (raw: string) => {
      if (raw === 'text') return 'Test Cases (Text)';
      if (raw === 'jira') return 'Test Cases (Jira)';
      return raw;
    };
    const csv = buildCsv(SAMPLE_ROWS, EMAILS, NAMES, translate);
    expect(csv).toContain('Test Cases (Text)');
    expect(csv).toContain('Test Cases (Jira)');
    expect(csv).not.toMatch(/,text,/);
    expect(csv).not.toMatch(/,jira,/);
  });
});

describe('ExportCsvButton — render + click', () => {
  it('triggers a blob download when clicked', () => {
    // Mock URL.createObjectURL / revokeObjectURL
    const createSpy = vi
      .spyOn(URL, 'createObjectURL')
      .mockReturnValue('blob:fake');
    const revokeSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const onSuccess = vi.fn();

    renderWithI18n(
      <ExportCsvButton
        rows={SAMPLE_ROWS}
        emails={EMAILS}
        names={NAMES}
        today="2026-04-23"
        onSuccess={onSuccess}
      />,
    );

    const btn = screen.getByTestId('ai-usage-export-csv');
    fireEvent.click(btn);

    expect(createSpy).toHaveBeenCalledTimes(1);
    expect(clickSpy).toHaveBeenCalled();
    expect(onSuccess).toHaveBeenCalled();

    createSpy.mockRestore();
    revokeSpy.mockRestore();
    clickSpy.mockRestore();
  });

  it('renders disabled when passed disabled', () => {
    renderWithI18n(
      <ExportCsvButton
        rows={SAMPLE_ROWS}
        emails={EMAILS}
        names={NAMES}
        today="2026-04-23"
        disabled
      />,
    );
    expect(screen.getByTestId('ai-usage-export-csv')).toBeDisabled();
  });
});
