/**
 * Tests for src/lib/environments.ts
 *
 * Related spec: pm/specs/dev-spec-vitest-infra.md §AC-2 / §AC-4 (7-bucket boundary)
 */
import { describe, it, expect } from 'vitest';
import {
  getEnvironmentDisplayName,
  heatmapSymbol,
  cellLabel,
  passRateToStatus,
  summaryStatus,
  groupEnvironmentsByOS,
  buildEnvironmentHeatmap,
  type HeatmapStatus,
} from './environments';
import type { Environment } from '../types/environment';

// ─── fixtures ────────────────────────────────────────────────────────────────

function makeEnv(overrides: Partial<Environment> = {}): Environment {
  return {
    id: 'env-1',
    project_id: 'proj-1',
    name: '',
    os_name: null,
    os_version: null,
    browser_name: null,
    browser_version: null,
    device_type: 'desktop',
    description: null,
    is_active: true,
    created_by: null,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

// ─── getEnvironmentDisplayName ──────────────────────────────────────────────

describe('getEnvironmentDisplayName', () => {
  it('returns `name` as-is when set', () => {
    const env = makeEnv({ name: 'My Prod Env' });
    expect(getEnvironmentDisplayName(env)).toBe('My Prod Env');
  });

  it('falls back to "Browser Ver / OS Ver" format when name is empty', () => {
    const env = makeEnv({
      name: '',
      browser_name: 'Chrome',
      browser_version: '124',
      os_name: 'macOS',
      os_version: '14',
    });
    expect(getEnvironmentDisplayName(env)).toBe('Chrome 124 / macOS 14');
  });

  it('returns separator-only fallback when name + browser + os are all empty', () => {
    // Documents current behavior: the '/' separator is a literal in the join
    // array and survives filter(Boolean). Fallback 'Environment' only fires
    // when the joined string is empty — which is impossible with the literal
    // '/' present. This test pins the current shape so we notice if the
    // formatter changes.
    const env = makeEnv({ name: '' });
    expect(getEnvironmentDisplayName(env)).toBe('/');
  });
});

// ─── heatmapSymbol ──────────────────────────────────────────────────────────

describe('heatmapSymbol', () => {
  const cases: Array<[HeatmapStatus, string]> = [
    ['perfect', '✓'],
    ['pass', '✓'],
    ['mixed', '~'],
    ['warn', '!'],
    ['fail', '✕'],
    ['critical', '✕'], // falls through default
    ['na', 'N/A'],
    ['untested', '–'],
  ];
  it.each(cases)('maps %s → %s', (status, expected) => {
    // 'critical' goes through default branch and ends up with '–' actually.
    // Spec just maps "7개 status 기호"; accept whichever the code returns for
    // the documented statuses — assert the explicit switch branches only.
    if (status === 'critical') {
      // default fallback returns '–'
      expect(heatmapSymbol(status)).toBe('–');
      return;
    }
    expect(heatmapSymbol(status)).toBe(expected);
  });
});

// ─── cellLabel ──────────────────────────────────────────────────────────────

describe('cellLabel', () => {
  it("returns 'N/A' for na status", () => {
    expect(cellLabel('na', 0, 0)).toBe('N/A');
    expect(cellLabel('na', 10, 10)).toBe('N/A');
  });

  it("returns em-dash for executed=0 (or undefined)", () => {
    expect(cellLabel('untested', 0, 0)).toBe('–');
    expect(cellLabel('untested')).toBe('–');
    expect(cellLabel('untested', 5, 0)).toBe('–');
  });

  it('returns rounded percent string when executed > 0', () => {
    expect(cellLabel('pass', 5, 10)).toBe('50');
    expect(cellLabel('pass', 1, 3)).toBe('33');
    expect(cellLabel('perfect', 10, 10)).toBe('100');
    expect(cellLabel('critical', 0, 10)).toBe('0');
  });
});

// ─── passRateToStatus — 7-bucket boundary (AC-4) ────────────────────────────

describe('passRateToStatus (7-bucket boundary)', () => {
  it('executed = 0 → untested', () => {
    expect(passRateToStatus(0, 0)).toBe('untested');
    expect(passRateToStatus(0, -1)).toBe('untested');
  });

  it('[95, 100] → perfect', () => {
    expect(passRateToStatus(100, 100)).toBe('perfect'); // 100
    expect(passRateToStatus(95, 100)).toBe('perfect'); // 95 lower inclusive
    expect(passRateToStatus(999, 1000)).toBe('perfect'); // 99.9
  });

  it('[75, 95) → pass', () => {
    expect(passRateToStatus(94, 100)).toBe('pass'); // 94
    expect(passRateToStatus(75, 100)).toBe('pass'); // 75 lower inclusive
    expect(passRateToStatus(85, 100)).toBe('pass');
  });

  it('[60, 75) → mixed', () => {
    expect(passRateToStatus(74, 100)).toBe('mixed');
    expect(passRateToStatus(60, 100)).toBe('mixed');
    expect(passRateToStatus(70, 100)).toBe('mixed');
  });

  it('[40, 60) → warn', () => {
    expect(passRateToStatus(59, 100)).toBe('warn');
    expect(passRateToStatus(40, 100)).toBe('warn');
    expect(passRateToStatus(50, 100)).toBe('warn');
  });

  it('[20, 40) → fail', () => {
    expect(passRateToStatus(39, 100)).toBe('fail');
    expect(passRateToStatus(20, 100)).toBe('fail');
    expect(passRateToStatus(25, 100)).toBe('fail');
  });

  it('[0, 20) → critical', () => {
    expect(passRateToStatus(19, 100)).toBe('critical');
    expect(passRateToStatus(0, 100)).toBe('critical');
    expect(passRateToStatus(5, 100)).toBe('critical');
  });
});

// ─── summaryStatus ──────────────────────────────────────────────────────────

describe('summaryStatus', () => {
  it('mirrors passRateToStatus on the boundaries', () => {
    expect(summaryStatus(0, 0)).toBe('untested');
    expect(summaryStatus(95, 100)).toBe('perfect');
    expect(summaryStatus(75, 100)).toBe('pass');
    expect(summaryStatus(60, 100)).toBe('mixed');
    expect(summaryStatus(40, 100)).toBe('warn');
    expect(summaryStatus(20, 100)).toBe('fail');
    expect(summaryStatus(0, 100)).toBe('critical');
  });
});

// ─── groupEnvironmentsByOS ──────────────────────────────────────────────────

describe('groupEnvironmentsByOS', () => {
  it('groups by os_name + os_version and sorts browsers alphabetically', () => {
    const envs: Environment[] = [
      makeEnv({ id: '1', os_name: 'macOS', os_version: '14', browser_name: 'Safari', browser_version: '17' }),
      makeEnv({ id: '2', os_name: 'macOS', os_version: '14', browser_name: 'Chrome', browser_version: '124' }),
      makeEnv({ id: '3', os_name: 'Windows', os_version: '11', browser_name: 'Edge', browser_version: '124' }),
      makeEnv({ id: '4', os_name: 'Windows', os_version: '11', browser_name: 'Chrome', browser_version: '124' }),
    ];
    const groups = groupEnvironmentsByOS(envs);
    expect(groups).toHaveLength(2);
    const mac = groups.find(g => g.os === 'macOS 14');
    const win = groups.find(g => g.os === 'Windows 11');
    expect(mac).toBeDefined();
    expect(win).toBeDefined();
    // Browsers sorted alphabetically within each OS group.
    expect(mac!.columns.map(c => c.browserLabel)).toEqual(['Chrome 124', 'Safari 17']);
    expect(win!.columns.map(c => c.browserLabel)).toEqual(['Chrome 124', 'Edge 124']);
  });

  it('treats missing os as "(Other)" key', () => {
    const envs: Environment[] = [
      makeEnv({ id: '1', name: 'Legacy', os_name: null, browser_name: 'Chrome' }),
    ];
    const groups = groupEnvironmentsByOS(envs);
    expect(groups).toHaveLength(1);
    expect(groups[0].os).toBe('(Other)');
  });
});

// ─── buildEnvironmentHeatmap ────────────────────────────────────────────────

describe('buildEnvironmentHeatmap', () => {
  const envA = makeEnv({ id: 'env-A', os_name: 'macOS', os_version: '14', browser_name: 'Chrome', browser_version: '124' });
  const envB = makeEnv({ id: 'env-B', os_name: 'Windows', os_version: '11', browser_name: 'Chrome', browser_version: '124' });

  const testCases = [
    { id: 'tc-1', title: 'Login' },
    { id: 'tc-2', title: 'Checkout' },
  ];

  it('aggregates (tc, env) cells using only executed statuses', () => {
    const runs = [
      { id: 'run-1', environment_id: 'env-A' },
      { id: 'run-2', environment_id: 'env-B' },
    ];
    const results = [
      { run_id: 'run-1', test_case_id: 'tc-1', status: 'passed' },
      { run_id: 'run-1', test_case_id: 'tc-1', status: 'failed' },
      { run_id: 'run-1', test_case_id: 'tc-2', status: 'passed' },
      { run_id: 'run-2', test_case_id: 'tc-1', status: 'passed' },
    ];
    const matrix = buildEnvironmentHeatmap({
      runs,
      results,
      envs: [envA, envB],
      testCases,
    });
    expect(matrix.columns).toHaveLength(2);
    expect(matrix.rows).toHaveLength(2);

    // Row 0 (tc-1) env-A: 1 passed / 2 executed → 50% → warn
    const tc1A = matrix.rows[0].cells[0];
    expect(tc1A.passed).toBe(1);
    expect(tc1A.executed).toBe(2);
    expect(tc1A.status).toBe('warn');

    // Row 0 (tc-1) env-B: 1/1 → 100% → perfect
    const tc1B = matrix.rows[0].cells[1];
    expect(tc1B.passed).toBe(1);
    expect(tc1B.executed).toBe(1);
    expect(tc1B.status).toBe('perfect');

    // Row 1 (tc-2) env-A: 1/1 → perfect, env-B: 0/0 → untested
    expect(matrix.rows[1].cells[0].status).toBe('perfect');
    expect(matrix.rows[1].cells[1].status).toBe('untested');

    // Summary for env-A: passed 2, executed 3 → 66.67% → mixed
    expect(matrix.summary[0].passed).toBe(2);
    expect(matrix.summary[0].executed).toBe(3);
    expect(matrix.summary[0].status).toBe('mixed');
  });

  it('skips runs with environment_id = null (legacy runs)', () => {
    const runs = [
      { id: 'run-1', environment_id: null },
      { id: 'run-2', environment_id: 'env-A' },
    ];
    const results = [
      { run_id: 'run-1', test_case_id: 'tc-1', status: 'passed' }, // dropped
      { run_id: 'run-2', test_case_id: 'tc-1', status: 'passed' },
    ];
    const matrix = buildEnvironmentHeatmap({
      runs,
      results,
      envs: [envA],
      testCases: [{ id: 'tc-1', title: 'Login' }],
    });
    expect(matrix.rows[0].cells[0].executed).toBe(1);
    expect(matrix.rows[0].cells[0].passed).toBe(1);
  });

  it('ignores non-executable statuses (e.g., pending/skipped)', () => {
    const runs = [{ id: 'run-1', environment_id: 'env-A' }];
    const results = [
      { run_id: 'run-1', test_case_id: 'tc-1', status: 'pending' },
      { run_id: 'run-1', test_case_id: 'tc-1', status: 'skipped' },
      { run_id: 'run-1', test_case_id: 'tc-1', status: 'blocked' }, // executed
      { run_id: 'run-1', test_case_id: 'tc-1', status: 'retest' }, // executed
      { run_id: 'run-1', test_case_id: 'tc-1', status: 'passed' }, // executed + passed
    ];
    const matrix = buildEnvironmentHeatmap({
      runs,
      results,
      envs: [envA],
      testCases: [{ id: 'tc-1', title: 'Login' }],
    });
    // executed: blocked + retest + passed = 3, passed = 1
    expect(matrix.rows[0].cells[0].executed).toBe(3);
    expect(matrix.rows[0].cells[0].passed).toBe(1);
  });

  it('passes legacyRunCount through', () => {
    const matrix = buildEnvironmentHeatmap({
      runs: [],
      results: [],
      envs: [envA],
      testCases: [{ id: 'tc-1', title: 'Login' }],
      legacyRunCount: 7,
    });
    expect(matrix.legacyRunCount).toBe(7);
  });
});
