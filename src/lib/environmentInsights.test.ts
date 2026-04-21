/**
 * Tests for src/lib/environmentInsights.ts
 *
 * Related spec: pm/specs/dev-spec-vitest-infra.md §AC-2 (deriveInsights coverage)
 */
import { describe, it, expect } from 'vitest';
import { deriveInsights } from './environmentInsights';
import {
  buildEnvironmentHeatmap,
  type HeatmapMatrix,
  type HeatmapRun,
  type HeatmapRunResult,
  type HeatmapTestCase,
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

function build(
  envs: Environment[],
  testCases: HeatmapTestCase[],
  runs: HeatmapRun[],
  results: HeatmapRunResult[],
): HeatmapMatrix {
  return buildEnvironmentHeatmap({ envs, testCases, runs, results });
}

// ─── tests ──────────────────────────────────────────────────────────────────

describe('deriveInsights', () => {
  it('empty matrix (no envs, no tcs) → all insights null, patternCount=0', () => {
    // Truly empty — no columns, no rows. No gap since no TCs.
    const matrix = build([], [], [], []);
    const insights = deriveInsights(matrix);
    expect(insights.critical).toBeNull();
    expect(insights.coverageGap).toBeNull();
    expect(insights.stableBaseline).toBeNull();
    expect(insights.patternCount).toBe(0);
    expect(insights.quickStats.bestEnv).toBeNull();
    expect(insights.quickStats.worstEnv).toBeNull();
    expect(insights.quickStats.bestTc).toBeNull();
    expect(insights.quickStats.worstTc).toBeNull();
  });

  it("critical.kind = 'env_low' when one env column pass rate < 40%", () => {
    const envA = makeEnv({
      id: 'env-A', name: 'Prod Chrome',
      os_name: 'macOS', os_version: '14',
      browser_name: 'Chrome', browser_version: '124',
    });
    // 2 TCs × 10 runs each on env-A → 3 passed / 10 executed = 30%
    const tcs: HeatmapTestCase[] = [{ id: 'tc-1', title: 'Login' }];
    const runs: HeatmapRun[] = Array.from({ length: 10 }, (_, i) => ({
      id: `run-${i}`,
      environment_id: 'env-A',
    }));
    const results: HeatmapRunResult[] = runs.map((r, i) => ({
      run_id: r.id,
      test_case_id: 'tc-1',
      status: i < 3 ? 'passed' : 'failed',
    }));
    const matrix = build([envA], tcs, runs, results);
    const insights = deriveInsights(matrix);

    expect(insights.critical).not.toBeNull();
    expect(insights.critical?.kind).toBe('env_low');
    expect(insights.critical?.label).toBe('Prod Chrome');
    expect(insights.critical?.passRate).toBe(30);
  });

  it("critical.kind = 'browser_cross_os_low' when browser avg across 2+ OS < 60%", () => {
    // Chrome on macOS: 5/10 = 50%, Chrome on Windows: 5/10 = 50%. Avg 50%.
    const envMac = makeEnv({
      id: 'env-mac', name: 'Chrome macOS',
      os_name: 'macOS', os_version: '14',
      browser_name: 'Chrome', browser_version: '124',
    });
    const envWin = makeEnv({
      id: 'env-win', name: 'Chrome Windows',
      os_name: 'Windows', os_version: '11',
      browser_name: 'Chrome', browser_version: '124',
    });

    const tcs: HeatmapTestCase[] = [{ id: 'tc-1', title: 'Login' }];
    const runs: HeatmapRun[] = [
      ...Array.from({ length: 10 }, (_, i) => ({ id: `mac-${i}`, environment_id: 'env-mac' })),
      ...Array.from({ length: 10 }, (_, i) => ({ id: `win-${i}`, environment_id: 'env-win' })),
    ];
    const results: HeatmapRunResult[] = runs.map((r, i) => {
      // Within each group (0..9), half passed / half failed to get 50%.
      const indexInGroup = i % 10;
      return {
        run_id: r.id,
        test_case_id: 'tc-1',
        status: indexInGroup < 5 ? 'passed' : 'failed',
      };
    });

    const matrix = build([envMac, envWin], tcs, runs, results);
    const insights = deriveInsights(matrix);
    // Both env columns are at 50% which is also below env_low 40%? No, 50 > 40
    // so env_low should be null; browser_cross_os_low should trigger.
    expect(insights.critical).not.toBeNull();
    expect(insights.critical?.kind).toBe('browser_cross_os_low');
    expect(insights.critical?.label).toBe('Chrome');
    expect(insights.critical?.osCount).toBe(2);
    expect(insights.critical?.passRate).toBe(50);
  });

  it('env_low (severe) wins over browser_cross_os_low when both apply', () => {
    // env-A 20% (severe), env-B 50%, both Chrome on different OS → browser avg 35%.
    // env_low rate = 20, browser avg = 35 → env_low wins (rate <= browser.rate).
    const envA = makeEnv({
      id: 'env-A', name: 'Chrome macOS',
      os_name: 'macOS', os_version: '14',
      browser_name: 'Chrome', browser_version: '124',
    });
    const envB = makeEnv({
      id: 'env-B', name: 'Chrome Windows',
      os_name: 'Windows', os_version: '11',
      browser_name: 'Chrome', browser_version: '124',
    });

    const tcs: HeatmapTestCase[] = [{ id: 'tc-1', title: 'Login' }];
    // env-A: 2 passed / 10 executed = 20%
    // env-B: 5 passed / 10 executed = 50%
    const runs: HeatmapRun[] = [
      ...Array.from({ length: 10 }, (_, i) => ({ id: `a-${i}`, environment_id: 'env-A' })),
      ...Array.from({ length: 10 }, (_, i) => ({ id: `b-${i}`, environment_id: 'env-B' })),
    ];
    const results: HeatmapRunResult[] = runs.map((r, i) => {
      const idx = i % 10;
      if (r.environment_id === 'env-A') {
        return { run_id: r.id, test_case_id: 'tc-1', status: idx < 2 ? 'passed' : 'failed' };
      }
      return { run_id: r.id, test_case_id: 'tc-1', status: idx < 5 ? 'passed' : 'failed' };
    });

    const matrix = build([envA, envB], tcs, runs, results);
    const insights = deriveInsights(matrix);
    expect(insights.critical?.kind).toBe('env_low');
    expect(insights.critical?.label).toBe('Chrome macOS');
    expect(insights.critical?.passRate).toBe(20);
  });

  it('coverageGap.untestedCount reflects TC untested/total ratio ≥ 0.5', () => {
    // 4 envs, 1 TC executed only on env-A. 3/4 = 75% untested → gap.
    const envs: Environment[] = Array.from({ length: 4 }, (_, i) =>
      makeEnv({
        id: `env-${i}`,
        name: `Env ${i}`,
        os_name: `OS-${i}`,
        os_version: '1',
        browser_name: `Browser-${i}`,
        browser_version: '1',
      }),
    );
    const tcs: HeatmapTestCase[] = [
      { id: 'tc-1', title: 'Gap TC', custom_id: 'TC-001' },
    ];
    const runs: HeatmapRun[] = [{ id: 'run-1', environment_id: 'env-0' }];
    const results: HeatmapRunResult[] = [
      { run_id: 'run-1', test_case_id: 'tc-1', status: 'passed' },
    ];
    const matrix = build(envs, tcs, runs, results);
    const insights = deriveInsights(matrix);
    expect(insights.coverageGap).not.toBeNull();
    expect(insights.coverageGap?.tcTitle).toBe('Gap TC');
    expect(insights.coverageGap?.customId).toBe('TC-001');
    expect(insights.coverageGap?.untestedCount).toBe(3);
    expect(insights.coverageGap?.totalEnvs).toBe(4);
  });

  it('stableBaseline picks env with pass rate ≥ 95%, highest first', () => {
    const envA = makeEnv({
      id: 'env-A', name: 'Stable Env',
      os_name: 'macOS', os_version: '14',
      browser_name: 'Chrome', browser_version: '124',
    });
    const envB = makeEnv({
      id: 'env-B', name: 'Great Env',
      os_name: 'macOS', os_version: '14',
      browser_name: 'Safari', browser_version: '17',
    });
    const tcs: HeatmapTestCase[] = [{ id: 'tc-1', title: 'Login' }];
    // env-A: 98/100 → 98%
    // env-B: 96/100 → 96%
    const runsA: HeatmapRun[] = Array.from({ length: 100 }, (_, i) => ({ id: `a-${i}`, environment_id: 'env-A' }));
    const runsB: HeatmapRun[] = Array.from({ length: 100 }, (_, i) => ({ id: `b-${i}`, environment_id: 'env-B' }));
    const results: HeatmapRunResult[] = [
      ...runsA.map((r, i) => ({
        run_id: r.id,
        test_case_id: 'tc-1',
        status: i < 98 ? 'passed' : 'failed',
      })),
      ...runsB.map((r, i) => ({
        run_id: r.id,
        test_case_id: 'tc-1',
        status: i < 96 ? 'passed' : 'failed',
      })),
    ];
    const matrix = build([envA, envB], tcs, [...runsA, ...runsB], results);
    const insights = deriveInsights(matrix);
    expect(insights.stableBaseline).not.toBeNull();
    expect(insights.stableBaseline?.envName).toBe('Stable Env');
    expect(insights.stableBaseline?.passRate).toBe(98);
  });

  it('quickStats surfaces best/worst env + TC', () => {
    // Separate envs so best=100%, worst=0%.
    // envBest only has TC-best run on it (passed).
    // envWorst only has TC-worst run on it (failed).
    const envBest = makeEnv({
      id: 'env-best', name: 'Best Env',
      os_name: 'macOS', os_version: '14',
      browser_name: 'Chrome', browser_version: '124',
    });
    const envWorst = makeEnv({
      id: 'env-worst', name: 'Worst Env',
      os_name: 'Windows', os_version: '11',
      browser_name: 'IE', browser_version: '11',
    });
    const tcs: HeatmapTestCase[] = [
      { id: 'tc-best', title: 'Best TC', custom_id: 'TC-B' },
      { id: 'tc-worst', title: 'Worst TC', custom_id: 'TC-W' },
    ];
    const runs: HeatmapRun[] = [
      { id: 'r1', environment_id: 'env-best' },
      { id: 'r2', environment_id: 'env-worst' },
    ];
    // TC-best: r1 pass on env-best only. TC-worst: r2 fail on env-worst only.
    // envBest: 1/1 = 100%. envWorst: 0/1 = 0%.
    // TC-best: 1/1 = 100% (only executed on envBest). TC-worst: 0/1 = 0%.
    const results: HeatmapRunResult[] = [
      { run_id: 'r1', test_case_id: 'tc-best', status: 'passed' },
      { run_id: 'r2', test_case_id: 'tc-worst', status: 'failed' },
    ];
    const matrix = build([envBest, envWorst], tcs, runs, results);
    const insights = deriveInsights(matrix);
    expect(insights.quickStats.bestEnv?.name).toBe('Best Env');
    expect(insights.quickStats.bestEnv?.rate).toBe(100);
    expect(insights.quickStats.worstEnv?.name).toBe('Worst Env');
    expect(insights.quickStats.worstEnv?.rate).toBe(0);
    expect(insights.quickStats.bestTc?.name).toBe('TC-B');
    expect(insights.quickStats.bestTc?.rate).toBe(100);
    expect(insights.quickStats.worstTc?.name).toBe('TC-W');
    expect(insights.quickStats.worstTc?.rate).toBe(0);
  });
});
