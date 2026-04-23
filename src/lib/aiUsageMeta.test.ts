/**
 * Tests for src/lib/aiUsageMeta.ts
 *
 * f011 — AI Usage Dashboard mode taxonomy + plan limits.
 *
 * Validates AC-5 (plan period limits), AC-7 (run-summary = Run Analysis single
 * bucket), AC-17 (brand palette: all hex codes present).
 */
import { describe, expect, it } from 'vitest';
import {
  MODE_COLORS,
  MODE_LABEL_KEYS,
  MODE_ORDER,
  isPeriodAllowed,
  normalizeMode,
  orderDisplayedModes,
  planHistoryLimit,
  requiredTierLabelFor,
  resolvePeriodRange,
} from './aiUsageMeta';

describe('MODE_COLORS / MODE_LABEL_KEYS / MODE_ORDER parity', () => {
  it('has a color + label for every DisplayMode in MODE_ORDER', () => {
    for (const mode of MODE_ORDER) {
      expect(MODE_COLORS[mode]).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(MODE_LABEL_KEYS[mode]).toMatch(/^settings\.aiUsage\.mode\./);
    }
  });

  it('includes run-summary with "Run Analysis" i18n key (AC-7)', () => {
    expect(MODE_LABEL_KEYS['run-summary']).toBe('settings.aiUsage.mode.runAnalysis');
    // color = violet-500 for Run Analysis per Design Spec §3-3
    expect(MODE_COLORS['run-summary']).toBe('#8B5CF6');
  });
});

describe('normalizeMode', () => {
  it('preserves known modes', () => {
    expect(normalizeMode('text')).toBe('text');
    expect(normalizeMode('run-summary')).toBe('run-summary');
    expect(normalizeMode('plan-assistant')).toBe('plan-assistant');
  });

  it('lowercases + trims', () => {
    expect(normalizeMode(' TEXT ')).toBe('text');
    expect(normalizeMode('Run-Summary')).toBe('run-summary');
  });

  it('folds unknown + null/empty to "other"', () => {
    expect(normalizeMode(null)).toBe('other');
    expect(normalizeMode(undefined)).toBe('other');
    expect(normalizeMode('')).toBe('other');
    expect(normalizeMode('something-new')).toBe('other');
  });
});

describe('orderDisplayedModes', () => {
  it('returns modes in canonical order regardless of input order', () => {
    const result = orderDisplayedModes(['jira', 'text', 'plan-assistant']);
    expect(result).toEqual(['text', 'jira', 'plan-assistant']);
  });

  it('deduplicates input', () => {
    const result = orderDisplayedModes(['text', 'text', 'jira']);
    expect(result).toEqual(['text', 'jira']);
  });

  it('folds unknowns into "other" and includes it last', () => {
    const result = orderDisplayedModes(['mystery', 'text']);
    expect(result).toEqual(['text', 'other']);
  });
});

// ─── Plan history limits (AC-5 + §BR-6) ──────────────────────────────────────

describe('planHistoryLimit', () => {
  it('Free tier = 30d', () => {
    expect(planHistoryLimit(1)).toBe('30d');
  });
  it('Hobby = 90d', () => {
    expect(planHistoryLimit(2)).toBe('90d');
  });
  it('Starter = 6m', () => {
    expect(planHistoryLimit(3)).toBe('6m');
  });
  it('Professional = 12m', () => {
    expect(planHistoryLimit(4)).toBe('12m');
  });
  it('Enterprise S/M/L = 12m (v1 cap)', () => {
    expect(planHistoryLimit(5)).toBe('12m');
    expect(planHistoryLimit(6)).toBe('12m');
    expect(planHistoryLimit(7)).toBe('12m');
  });
  it('unknown tier falls back to 30d', () => {
    expect(planHistoryLimit(99)).toBe('30d');
  });
});

describe('isPeriodAllowed', () => {
  it('Free: only 30d allowed', () => {
    expect(isPeriodAllowed('30d', 1)).toBe(true);
    expect(isPeriodAllowed('90d', 1)).toBe(false);
    expect(isPeriodAllowed('6m', 1)).toBe(false);
    expect(isPeriodAllowed('12m', 1)).toBe(false);
  });
  it('Hobby: up to 90d', () => {
    expect(isPeriodAllowed('30d', 2)).toBe(true);
    expect(isPeriodAllowed('90d', 2)).toBe(true);
    expect(isPeriodAllowed('6m', 2)).toBe(false);
  });
  it('Starter: up to 6m', () => {
    expect(isPeriodAllowed('6m', 3)).toBe(true);
    expect(isPeriodAllowed('12m', 3)).toBe(false);
  });
  it('Professional+: all allowed', () => {
    expect(isPeriodAllowed('12m', 4)).toBe(true);
    expect(isPeriodAllowed('12m', 5)).toBe(true);
  });
});

describe('requiredTierLabelFor', () => {
  it('matches Design Spec §3-1 upgrade tooltip copy', () => {
    expect(requiredTierLabelFor('30d')).toBe('Hobby');
    expect(requiredTierLabelFor('90d')).toBe('Starter');
    expect(requiredTierLabelFor('6m')).toBe('Professional');
    expect(requiredTierLabelFor('12m')).toBe('Professional');
  });
});

// ─── resolvePeriodRange ──────────────────────────────────────────────────────

describe('resolvePeriodRange', () => {
  it('30d produces a 30-day window anchored at UTC 00:00', () => {
    const now = new Date('2026-04-23T15:37:00Z');
    const { from, to } = resolvePeriodRange('30d', now);
    expect(to.toISOString()).toBe('2026-04-23T15:37:00.000Z');
    // from anchored at UTC 00:00 (30 days earlier from `now`)
    expect(from.getUTCHours()).toBe(0);
    expect(from.getUTCMinutes()).toBe(0);
    expect(from.getUTCSeconds()).toBe(0);
    const diffDays = Math.round(
      (to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000),
    );
    // 30 days + partial day due to hour normalization — between 30 and 31
    expect(diffDays).toBeGreaterThanOrEqual(30);
    expect(diffDays).toBeLessThanOrEqual(31);
  });

  it('6m subtracts 6 months', () => {
    const now = new Date('2026-04-23T00:00:00Z');
    const { from } = resolvePeriodRange('6m', now);
    expect(from.getUTCMonth()).toBe(9); // October (10 - 1)
    expect(from.getUTCFullYear()).toBe(2025);
  });

  it('12m subtracts 12 months', () => {
    const now = new Date('2026-04-23T00:00:00Z');
    const { from } = resolvePeriodRange('12m', now);
    expect(from.getUTCFullYear()).toBe(2025);
    expect(from.getUTCMonth()).toBe(3); // April
  });
});
