/**
 * Tests for src/lib/statusPill.ts
 *
 * Related spec: pm/specs/dev-spec-vitest-infra.md §AC-2 (AC-11 getProgressTone case)
 */
import { describe, it, expect } from 'vitest';
import {
  humanizeStatus,
  resolveStatus,
  getStatusVariant,
  getProgressTone,
} from './statusPill';

// ─── humanizeStatus ─────────────────────────────────────────────────────────

describe('humanizeStatus', () => {
  it('converts snake_case to Title Case', () => {
    expect(humanizeStatus('on_hold')).toBe('On Hold');
    expect(humanizeStatus('in_progress')).toBe('In Progress');
    expect(humanizeStatus('past_due')).toBe('Past Due');
  });

  it("returns 'Unknown' for empty input", () => {
    expect(humanizeStatus('')).toBe('Unknown');
  });

  it('handles single-word status', () => {
    expect(humanizeStatus('active')).toBe('Active');
  });
});

// ─── resolveStatus ──────────────────────────────────────────────────────────

describe('resolveStatus', () => {
  it("maps 'in_progress' → { variant: 'blue', label: 'In Progress' }", () => {
    expect(resolveStatus('in_progress')).toEqual({
      variant: 'blue',
      label: 'In Progress',
    });
  });

  it('maps unknown status to gray + humanized label', () => {
    expect(resolveStatus('xyz_state')).toEqual({
      variant: 'gray',
      label: 'Xyz State',
    });
  });
});

// ─── getStatusVariant ───────────────────────────────────────────────────────

describe('getStatusVariant', () => {
  it("maps 'in_progress' → 'blue'", () => {
    expect(getStatusVariant('in_progress')).toBe('blue');
  });

  it("maps 'past_due' → 'red'", () => {
    expect(getStatusVariant('past_due')).toBe('red');
  });

  it("maps 'completed' → 'green'", () => {
    expect(getStatusVariant('completed')).toBe('green');
  });

  it("maps 'on_hold' → 'amber'", () => {
    expect(getStatusVariant('on_hold')).toBe('amber');
  });

  it("maps 'draft' → 'gray'", () => {
    expect(getStatusVariant('draft')).toBe('gray');
  });

  it("maps unknown → 'gray'", () => {
    expect(getStatusVariant('totally-unknown-status')).toBe('gray');
  });
});

// ─── getProgressTone ────────────────────────────────────────────────────────

describe('getProgressTone', () => {
  it('progress=100 + overdue → green (AC-11: 100% wins over overdue)', () => {
    expect(getProgressTone('past_due', 100, true)).toBe('green');
  });

  it('progress < 100 + overdue → red', () => {
    expect(getProgressTone('in_progress', 50, true)).toBe('red');
  });

  it("'in_progress' + 50% (not overdue) → blue", () => {
    expect(getProgressTone('in_progress', 50, false)).toBe('blue');
  });

  it("'failed' + 0% → red", () => {
    expect(getProgressTone('failed', 0, false)).toBe('red');
  });

  it("'completed' + 100% → green", () => {
    expect(getProgressTone('completed', 100, false)).toBe('green');
  });

  it('NaN progress → treated as 0 (falsy fallback)', () => {
    // Non-finite progress → defaults to 0, so not >= 100 → falls through.
    expect(getProgressTone('in_progress', Number.NaN, false)).toBe('blue');
    expect(getProgressTone('draft', Number.NaN, false)).toBe('gray');
  });

  it("unknown status + 0% + not overdue → gray", () => {
    expect(getProgressTone('totally-unknown-status', 0, false)).toBe('gray');
  });
});
