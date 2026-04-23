/**
 * f011 — Export CSV button (Team View only, AC-18)
 * Design Spec §3 Toolbar + §14 (CSV spec)
 *
 * Generates a UTF-8 CSV (no BOM) with columns: date,user_email,mode,credits
 * Sorted by date ASC, user_email ASC. Filename: ai-usage-{YYYY-MM-DD}.csv
 *
 * Data source: breakdown rows (RPC result) + profiles email map (passed in).
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { AiUsageBreakdownRow } from '../../../../types/aiUsage';

export interface ExportCsvButtonProps {
  rows: AiUsageBreakdownRow[];
  /** userId -> email mapping used to resolve user_email column */
  emails: Record<string, string>;
  /** date string (YYYY-MM-DD) used in filename */
  today: string;
  disabled?: boolean;
  onSuccess?: () => void;
  onError?: (err: unknown) => void;
  className?: string;
}

function csvEscape(value: string): string {
  if (value == null) return '';
  const s = String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function buildCsv(rows: AiUsageBreakdownRow[], emails: Record<string, string>): string {
  const header = 'date,user_email,mode,credits';
  // Flatten rows (already grouped by day × mode × user) then sort date ASC, email ASC
  const flat = rows.map((r) => ({
    date: r.day,
    email: emails[r.user_id] ?? r.user_id,
    mode: r.mode,
    credits: r.credits_sum,
  }));
  flat.sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? -1 : 1;
    if (a.email !== b.email) return a.email < b.email ? -1 : 1;
    return 0;
  });
  const lines = flat.map(
    (row) =>
      `${csvEscape(row.date)},${csvEscape(row.email)},${csvEscape(row.mode)},${row.credits}`,
  );
  return [header, ...lines].join('\n');
}

export default function ExportCsvButton({
  rows,
  emails,
  today,
  disabled = false,
  onSuccess,
  onError,
  className = '',
}: ExportCsvButtonProps) {
  const { t } = useTranslation('settings');
  const [busy, setBusy] = useState(false);

  const handleClick = async () => {
    if (busy || disabled) return;
    setBusy(true);
    try {
      const csv = buildCsv(rows, emails);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = t('aiUsage.export.filename', { date: today });
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      // Defer revoke to next tick so browser has time to start the download.
      setTimeout(() => URL.revokeObjectURL(url), 0);
      onSuccess?.();
    } catch (e) {
      onError?.(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || busy}
      aria-label={t('aiUsage.export.aria')}
      data-testid="ai-usage-export-csv"
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-slate-200 bg-white text-[0.8125rem] font-medium text-slate-700 hover:border-slate-300 hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:bg-slate-800 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/5 ${className}`}
    >
      {busy ? (
        <i className="ri-loader-4-line animate-spin text-slate-500" aria-hidden="true" />
      ) : (
        <i className="ri-download-2-line text-slate-500" aria-hidden="true" />
      )}
      {t('aiUsage.export.button')}
    </button>
  );
}
