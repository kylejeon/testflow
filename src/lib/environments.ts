import type { Environment, EnvironmentPreset } from '../types/environment';

// ─── Preset catalog ────────────────────────────────────────────────────────

export const ENVIRONMENT_PRESETS: EnvironmentPreset[] = [
  {
    key: 'chrome_macos',
    icon: 'ri-apple-line',
    labelKey: 'environments.preset.chromeMacos',
    values: {
      name: 'Chrome / macOS',
      os_name: 'macOS',
      os_version: '14',
      browser_name: 'Chrome',
      browser_version: '124',
      device_type: 'desktop',
      description: '',
    },
  },
  {
    key: 'chrome_windows',
    icon: 'ri-windows-line',
    labelKey: 'environments.preset.chromeWindows',
    values: {
      name: 'Chrome / Windows',
      os_name: 'Windows',
      os_version: '11',
      browser_name: 'Chrome',
      browser_version: '124',
      device_type: 'desktop',
      description: '',
    },
  },
  {
    key: 'firefox_ubuntu',
    icon: 'ri-ubuntu-line',
    labelKey: 'environments.preset.firefoxUbuntu',
    values: {
      name: 'Firefox / Ubuntu',
      os_name: 'Ubuntu',
      os_version: '22.04',
      browser_name: 'Firefox',
      browser_version: '125',
      device_type: 'desktop',
      description: '',
    },
  },
  {
    key: 'safari_ios',
    icon: 'ri-smartphone-line',
    labelKey: 'environments.preset.safariIos',
    values: {
      name: 'Safari / iOS',
      os_name: 'iOS',
      os_version: '17',
      browser_name: 'Safari',
      browser_version: '17',
      device_type: 'mobile',
      description: '',
    },
  },
];

// ─── Display helpers ───────────────────────────────────────────────────────

/** Trigger display formatter per Design Spec §3-3. */
export function getEnvironmentDisplayName(env: Environment): string {
  if (env.name && env.name.trim().length > 0) return env.name;
  const fallback = [
    env.browser_name,
    env.browser_version,
    '/',
    env.os_name,
    env.os_version,
  ]
    .filter(Boolean)
    .join(' ')
    .trim();
  return fallback || 'Environment';
}

// ─── Heatmap helpers ───────────────────────────────────────────────────────

export const HEATMAP_COLORS: Record<string, { bg: string; color: string; label: string }> = {
  perfect:  { bg: '#dcfce7', color: '#14532d', label: '100%' },
  pass:     { bg: '#86efac', color: '#14532d', label: 'Pass' },
  mixed:    { bg: '#fde68a', color: '#78350f', label: 'Mixed' },
  warn:     { bg: '#fca5a5', color: '#7f1d1d', label: 'Warn' },
  fail:     { bg: '#ef4444', color: '#ffffff', label: 'Fail' },
  na:       { bg: '#f3f4f6', color: '#9ca3af', label: 'N/A' },
  untested: { bg: '#fafafa', color: '#9ca3af', label: '—' },
};

export type HeatmapStatus = keyof typeof HEATMAP_COLORS;

/**
 * @deprecated v2부터 cell은 숫자로 표시합니다. `cellLabel(cell)` 을 사용하세요.
 * 호환성 유지 목적으로 남겨두며 다음 PR에서 제거됩니다.
 */
export function heatmapSymbol(status: HeatmapStatus): string {
  switch (status) {
    case 'perfect': return '✓';
    case 'pass':    return '✓';
    case 'mixed':   return '~';
    case 'warn':    return '!';
    case 'fail':    return '✕';
    case 'na':      return 'N/A';
    case 'untested':
    default:        return '–';
  }
}

/**
 * v2 cell label — pass-rate 정수 표시.
 * - executed > 0 → Math.round(passed/executed * 100) 정수 (단위 기호 없음)
 * - executed === 0 → '–' (em-dash U+2013)
 * - status === 'na' → 'N/A'
 */
export function cellLabel(
  status: HeatmapStatus,
  passed?: number,
  executed?: number,
): string {
  if (status === 'na') return 'N/A';
  const exec = executed ?? 0;
  const pass = passed ?? 0;
  if (exec <= 0) return '–';
  return String(Math.round((pass / exec) * 100));
}

/** Pass rate → cell status per AC-6. */
export function passRateToStatus(passed: number, executed: number): HeatmapStatus {
  if (executed <= 0) return 'untested';
  const pct = (passed / executed) * 100;
  if (pct >= 100) return 'perfect';
  if (pct >= 75)  return 'pass';
  if (pct >= 50)  return 'mixed';
  if (pct >= 20)  return 'warn';
  return 'fail';
}

/**
 * Summary row status — v2 누적 합산 기반 (AC-V17).
 * cell-array proxy 평균 방식은 제거 — 실제 pass/executed 합산값으로 정확한 pct 계산.
 */
export function summaryStatus(passed: number, executed: number): HeatmapStatus {
  if (executed <= 0) return 'untested';
  const pct = (passed / executed) * 100;
  if (pct >= 100) return 'perfect';
  if (pct >= 75)  return 'pass';
  if (pct >= 50)  return 'mixed';
  if (pct >= 20)  return 'warn';
  return 'fail';
}

// ─── Environment grouping for heatmap columns ──────────────────────────────

export interface EnvColumn {
  env: Environment;
  // sub-col label within OS group
  browserLabel: string;
}

export interface EnvGroup {
  os: string; // 'macOS' | 'Windows' | '(Other)'
  columns: EnvColumn[];
}

export function groupEnvironmentsByOS(envs: Environment[]): EnvGroup[] {
  const map = new Map<string, EnvColumn[]>();
  for (const env of envs) {
    // OS 그룹 키 = os_name + os_version 조합 (version 없으면 name만)
    const osName = env.os_name?.trim() || '(Other)';
    const osVersion = env.os_version?.trim() || '';
    const osKey = osVersion ? `${osName} ${osVersion}` : osName;
    const browserLabel = [env.browser_name, env.browser_version]
      .filter(Boolean)
      .join(' ')
      .trim() || env.name;
    const arr = map.get(osKey) ?? [];
    arr.push({ env, browserLabel });
    map.set(osKey, arr);
  }
  // sort by os, then by browser alphabetically
  return Array.from(map.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([os, columns]) => ({
      os,
      columns: columns.sort((a, b) => a.browserLabel.localeCompare(b.browserLabel)),
    }));
}

// ─── Heatmap matrix builder ────────────────────────────────────────────────

export interface HeatmapRunResult {
  run_id: string;
  test_case_id: string;
  status: string;
}

export interface HeatmapRun {
  id: string;
  environment_id: string | null;
}

export interface HeatmapTestCase {
  id: string;
  title: string;
  priority?: string | null;
  /** Optional custom TC identifier */
  custom_id?: string | null;
}

export interface HeatmapCellData {
  status: HeatmapStatus;
  passed: number;
  executed: number;
  tooltip: string;
}

export interface HeatmapMatrix {
  groups: EnvGroup[];
  /** flat ordered list of columns (matches tbody cell order) */
  columns: EnvColumn[];
  rows: Array<{
    tc: HeatmapTestCase;
    cells: HeatmapCellData[];
  }>;
  summary: HeatmapCellData[];
  legacyRunCount: number;
}

const EXECUTED_STATUSES = new Set(['passed', 'failed', 'blocked', 'retest']);

/**
 * Aggregate (tc, env) cells: executed = passed+failed+blocked+retest. passed = passed.
 * Untested → executed=0.
 */
export function buildEnvironmentHeatmap(params: {
  runs: HeatmapRun[];
  results: HeatmapRunResult[];
  envs: Environment[];
  testCases: HeatmapTestCase[];
  legacyRunCount?: number;
}): HeatmapMatrix {
  const { runs, results, envs, testCases, legacyRunCount = 0 } = params;

  // Map run_id → env_id
  const runToEnv = new Map<string, string>();
  for (const r of runs) {
    if (r.environment_id) runToEnv.set(r.id, r.environment_id);
  }

  // Accumulator: key = `${envId}|${tcId}` → {passed, executed}
  const acc = new Map<string, { passed: number; executed: number }>();
  for (const res of results) {
    const envId = runToEnv.get(res.run_id);
    if (!envId) continue;
    const key = `${envId}|${res.test_case_id}`;
    const bucket = acc.get(key) ?? { passed: 0, executed: 0 };
    if (EXECUTED_STATUSES.has(res.status)) {
      bucket.executed += 1;
      if (res.status === 'passed') bucket.passed += 1;
    }
    acc.set(key, bucket);
  }

  const groups = groupEnvironmentsByOS(envs);
  const columns = groups.flatMap(g => g.columns);

  const rows = testCases.map(tc => ({
    tc,
    cells: columns.map(col => {
      const bucket = acc.get(`${col.env.id}|${tc.id}`) ?? { passed: 0, executed: 0 };
      const status = passRateToStatus(bucket.passed, bucket.executed);
      const tooltip = bucket.executed > 0
        ? `${bucket.passed}/${bucket.executed} passed`
        : 'Untested';
      return { status, passed: bucket.passed, executed: bucket.executed, tooltip };
    }),
  }));

  // Column summary — v2 누적 합산 기반 (AC-V17)
  const summary: HeatmapCellData[] = columns.map((_, colIdx) => {
    let passed = 0;
    let executed = 0;
    for (const r of rows) {
      passed += r.cells[colIdx].passed;
      executed += r.cells[colIdx].executed;
    }
    const status = summaryStatus(passed, executed);
    const tooltip = executed > 0
      ? `Env avg: ${passed}/${executed} passed`
      : 'No executions';
    return { status, passed, executed, tooltip };
  });

  return { groups, columns, rows, summary, legacyRunCount };
}
