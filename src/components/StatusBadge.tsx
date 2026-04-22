import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

export type TestStatus = 'passed' | 'failed' | 'blocked' | 'retest' | 'untested';

interface StatusConfig {
  dot: string;
  border: string;
  bg: string;
  text: string;
  label: string;
}

interface StatusBadgeProps {
  status: TestStatus;
  size?: 'sm' | 'md';
  className?: string;
}

/**
 * Outlined status badge with colored dot.
 * Use for test run results and test case run status everywhere in the app.
 *
 * Phase 3 (AC-8): `label` values are reused from `common.passed|failed|...` —
 * NO new i18n keys. The STATUS_CONFIG constant moved inside the component as
 * a `useMemo` so it can consume the `t` function.
 */
export function StatusBadge({ status, size = 'md', className = '' }: StatusBadgeProps) {
  const { t } = useTranslation('common');
  const STATUS_CONFIG = useMemo<Record<TestStatus, StatusConfig>>(() => ({
    passed:   { dot: 'bg-emerald-500', border: 'border-emerald-300', bg: 'bg-emerald-50',  text: 'text-emerald-800', label: t('passed')   },
    failed:   { dot: 'bg-red-500',     border: 'border-red-300',     bg: 'bg-red-50',      text: 'text-red-800',     label: t('failed')   },
    blocked:  { dot: 'bg-amber-500',   border: 'border-amber-300',   bg: 'bg-amber-50',    text: 'text-amber-800',   label: t('blocked')  },
    retest:   { dot: 'bg-violet-500',  border: 'border-violet-300',  bg: 'bg-violet-50',   text: 'text-violet-800',  label: t('retest')   },
    untested: { dot: 'bg-slate-400',   border: 'border-slate-200',   bg: 'bg-slate-50',    text: 'text-slate-600',   label: t('untested') },
  }), [t]);

  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.untested;
  const sizeClasses = size === 'sm'
    ? 'px-2 py-0.5 text-xs gap-1'
    : 'px-2.5 py-1 text-xs gap-1.5';

  return (
    <span
      className={`inline-flex items-center rounded-full border font-medium ${sizeClasses} ${cfg.border} ${cfg.bg} ${cfg.text} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}
