/**
 * f011 — Period filter dropdown (30d / 90d / 6m / 12m)
 * Design Spec §3-1 (PeriodFilter), AC-5 (plan limits + upgrade tooltip)
 */

import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { PeriodKey } from '../../../../types/aiUsage';
import { isPeriodAllowed, requiredTierLabelFor } from '../../../../lib/aiUsageMeta';

const ORDERED_PERIODS: PeriodKey[] = ['thisMonth', '30d', '90d', '6m', '12m'];

export interface PeriodFilterProps {
  value: PeriodKey;
  onChange: (next: PeriodKey) => void;
  /** subscription tier (1-7) — gates available options */
  tier: number;
  /** optional className for outer wrapper */
  className?: string;
}

export default function PeriodFilter({ value, onChange, tier, className = '' }: PeriodFilterProps) {
  const { t } = useTranslation('settings');
  const [open, setOpen] = useState(false);
  const [focusIdx, setFocusIdx] = useState<number>(-1);
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  // Reset focus index when opening
  useEffect(() => {
    if (open) {
      const idx = ORDERED_PERIODS.indexOf(value);
      setFocusIdx(idx >= 0 ? idx : 0);
    } else {
      setFocusIdx(-1);
    }
  }, [open, value]);

  const handleSelect = (next: PeriodKey) => {
    if (!isPeriodAllowed(next, tier)) return;
    if (next !== value) onChange(next);
    setOpen(false);
  };

  const onTriggerKey = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setOpen(true);
    }
  };

  const onListKey = (e: React.KeyboardEvent<HTMLUListElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusIdx((i) => Math.min(ORDERED_PERIODS.length - 1, i + 1));
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusIdx((i) => Math.max(0, i - 1));
      return;
    }
    if (e.key === 'Home') {
      e.preventDefault();
      setFocusIdx(0);
      return;
    }
    if (e.key === 'End') {
      e.preventDefault();
      setFocusIdx(ORDERED_PERIODS.length - 1);
      return;
    }
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      const next = ORDERED_PERIODS[focusIdx];
      if (next) handleSelect(next);
    }
  };

  const triggerClasses = open
    ? 'border-indigo-500 bg-indigo-50 text-indigo-600'
    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300';

  return (
    <div ref={rootRef} className={`relative inline-block ${className}`}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t('aiUsage.period.triggerAria')}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={onTriggerKey}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[0.8125rem] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 cursor-pointer ${triggerClasses}`}
      >
        <i className="ri-calendar-line text-slate-400 text-[0.875rem]" aria-hidden="true" />
        <span>{t(`aiUsage.period.${value}`)}</span>
        <i
          className={`ri-arrow-down-s-line text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>

      {open && (
        <ul
          ref={listRef}
          role="listbox"
          aria-label={t('aiUsage.period.label')}
          tabIndex={-1}
          onKeyDown={onListKey}
          className="absolute right-0 top-[calc(100%+4px)] z-50 min-w-[220px] bg-white border border-slate-200 rounded-lg shadow-[0_4px_12px_rgba(0,0,0,0.08)] py-1"
          style={{ outline: 'none' }}
        >
          {ORDERED_PERIODS.map((p, idx) => {
            const allowed = isPeriodAllowed(p, tier);
            const isActive = p === value;
            const isFocused = idx === focusIdx;
            const tierLabel = requiredTierLabelFor(p);
            return (
              <li
                key={p}
                role="option"
                aria-selected={isActive}
                aria-disabled={!allowed}
                data-testid={`period-option-${p}`}
                onMouseEnter={() => setFocusIdx(idx)}
                onClick={() => handleSelect(p)}
                className={`group relative flex items-center justify-between px-3 py-2 text-[0.8125rem] ${
                  allowed ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'
                } ${isFocused && allowed ? 'bg-slate-50' : ''} ${
                  isActive ? 'text-indigo-600 font-semibold' : 'text-slate-700'
                }`}
                title={!allowed ? t('aiUsage.period.upgradeTooltip', { tier: tierLabel }) : undefined}
              >
                <span>{t(`aiUsage.period.${p}`)}</span>
                {isActive && allowed && <i className="ri-check-line text-indigo-600" aria-hidden="true" />}
                {!allowed && (
                  <span className="inline-flex items-center gap-1 text-[0.6875rem] text-slate-400">
                    <i className="ri-lock-2-line" aria-hidden="true" />
                  </span>
                )}
                {!allowed && (
                  <span
                    role="tooltip"
                    className="pointer-events-none absolute right-full top-1/2 -translate-y-1/2 mr-2 bg-slate-900 text-white text-[0.6875rem] font-medium rounded px-2 py-1 whitespace-nowrap shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    {t('aiUsage.period.upgradeTooltip', { tier: tierLabel })}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
