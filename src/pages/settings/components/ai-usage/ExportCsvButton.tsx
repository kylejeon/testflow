/**
 * f011 — Export CSV button (Team View only, AC-18)
 * Design Spec §3 Toolbar + §14 (CSV spec)
 *
 * Generates a UTF-8 CSV (no BOM) with columns:
 *   date, user_name, user_email, feature, credits
 * Sorted by date ASC, user_email ASC. Filename: ai-usage-{YYYY-MM-DD}.csv
 *
 * `feature` is the human-readable translated mode label (matches on-screen
 * Breakdown by Feature table) instead of the raw DB mode slug.
 *
 * Data source: breakdown rows (RPC result) + profiles email/name maps
 * (passed in) + translation function for mode labels.
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { AiUsageBreakdownRow } from '../../../../types/aiUsage';
import { MODE_LABEL_KEYS, normalizeMode } from '../../../../lib/aiUsageMeta';

export interface ExportCsvButtonProps {
  rows: AiUsageBreakdownRow[];
  /** userId -> email mapping used to resolve user_email column */
  emails: Record<string, string>;
  /** userId -> display name mapping for the user_name column (falls back to email) */
  names: Record<string, string>;
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

/**
 * Build a CSV body from RPC rows.
 * `translateMode` resolves a raw `ai_generation_logs.mode` value to the same
 * human-readable label shown in the UI (e.g. 'run-summary' → 'Run Analysis').
 */
export function buildCsv(
  rows: AiUsageBreakdownRow[],
  emails: Record<string, string>,
  names: Record<string, string>,
  translateMode: (rawMode: string) => string,
): string {
  const header = 'date,user_name,user_email,feature,credits';
  const flat = rows.map((r) => {
    const email = emails[r.user_id] ?? r.user_id;
    return {
      date: r.day,
      name: names[r.user_id] ?? email,
      email,
      feature: translateMode(r.mode),
      credits: r.credits_sum,
    };
  });
  flat.sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? -1 : 1;
    if (a.email !== b.email) return a.email < b.email ? -1 : 1;
    return 0;
  });
  const lines = flat.map(
    (row) =>
      `${csvEscape(row.date)},${csvEscape(row.name)},${csvEscape(row.email)},${csvEscape(row.feature)},${row.credits}`,
  );
  return [header, ...lines].join('\n');
}

export default function ExportCsvButton({
  rows,
  emails,
  names,
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
      const translateMode = (raw: string) => t(MODE_LABEL_KEYS[normalizeMode(raw)]);
      const csv = buildCsv(rows, emails, names, translateMode);
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
