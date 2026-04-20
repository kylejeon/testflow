import type { HeatmapMatrix } from './environments';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface InsightCritical {
  kind: 'env_low' | 'browser_cross_os_low';
  /** env 이름 (env_low) 또는 browser 이름 (browser_cross_os_low) */
  label: string;
  /** 0–100 정수 pass rate */
  passRate: number;
  /** browser_cross_os_low 일 때 집계에 포함된 OS 수 */
  osCount?: number;
}

export interface InsightCoverageGap {
  tcTitle: string;
  customId: string | null;
  untestedCount: number;
  totalEnvs: number;
}

export interface InsightBaseline {
  envName: string;
  passRate: number;
}

export interface InsightQuickStat {
  name: string;
  rate: number;
}

export interface InsightsDerived {
  critical: InsightCritical | null;
  coverageGap: InsightCoverageGap | null;
  stableBaseline: InsightBaseline | null;
  quickStats: {
    bestEnv: InsightQuickStat | null;
    worstEnv: InsightQuickStat | null;
    bestTc: InsightQuickStat | null;
    worstTc: InsightQuickStat | null;
  };
  /** empty slot 제외 표시된 패턴(Critical/Gap/Baseline) 수 — sidebar head의 count badge에 사용 */
  patternCount: number;
}

// ─── Internals ────────────────────────────────────────────────────────────────

interface ColRate {
  envName: string;
  browserName: string; // '' if null
  rate: number | null; // null = all untested
  executed: number;
}

interface RowRate {
  title: string;
  customId: string | null;
  rate: number | null;
  untested: number;
  total: number;
}

function envDisplay(envName: string): string {
  return envName && envName.trim() ? envName.trim() : 'Environment';
}

// ─── Main ────────────────────────────────────────────────────────────────────

/**
 * Rule-based insights computed on the client — no API / LLM calls.
 * Dev Spec §6-2 참조.
 */
export function deriveInsights(matrix: HeatmapMatrix): InsightsDerived {
  const { columns, rows } = matrix;

  // Per-column (env) rate
  const colRates: ColRate[] = columns.map((col, i) => {
    const sum = matrix.summary[i];
    const rate = sum.executed > 0 ? (sum.passed / sum.executed) * 100 : null;
    return {
      envName: envDisplay(col.env.name),
      browserName: col.env.browser_name ?? '',
      rate,
      executed: sum.executed,
    };
  });

  // Per-row (TC) rate
  const rowRates: RowRate[] = rows.map(r => {
    let p = 0;
    let e = 0;
    let untested = 0;
    for (const c of r.cells) {
      p += c.passed;
      e += c.executed;
      if (c.executed === 0) untested += 1;
    }
    return {
      title: r.tc.title,
      customId: r.tc.custom_id ?? null,
      rate: e > 0 ? (p / e) * 100 : null,
      untested,
      total: r.cells.length,
    };
  });

  // ── Critical (a): env column rate < 40%
  const envLow = colRates
    .filter(x => x.rate !== null && x.rate < 40)
    .sort((a, b) => (a.rate as number) - (b.rate as number))[0];

  // ── Critical (b): browser across all OS avg rate < 60%
  // Group by browser_name (skip empty string)
  const byBrowser = new Map<string, ColRate[]>();
  for (const c of colRates) {
    if (!c.browserName) continue;
    const arr = byBrowser.get(c.browserName) ?? [];
    arr.push(c);
    byBrowser.set(c.browserName, arr);
  }
  let browserLow: { browser: string; rate: number; osCount: number } | null = null;
  for (const [browser, arr] of byBrowser.entries()) {
    const valid = arr.filter(x => x.rate !== null);
    if (valid.length < 2) continue; // need >= 2 OS to call "across all OS"
    const avg =
      valid.reduce((s, x) => s + (x.rate as number), 0) / valid.length;
    if (avg < 60) {
      if (!browserLow || avg < browserLow.rate) {
        browserLow = { browser, rate: avg, osCount: valid.length };
      }
    }
  }

  // Pick the more severe one (lower rate wins)
  let critical: InsightCritical | null = null;
  if (envLow && browserLow) {
    if ((envLow.rate as number) <= browserLow.rate) {
      critical = {
        kind: 'env_low',
        label: envLow.envName,
        passRate: Math.round(envLow.rate as number),
      };
    } else {
      critical = {
        kind: 'browser_cross_os_low',
        label: browserLow.browser,
        passRate: Math.round(browserLow.rate),
        osCount: browserLow.osCount,
      };
    }
  } else if (envLow) {
    critical = {
      kind: 'env_low',
      label: envLow.envName,
      passRate: Math.round(envLow.rate as number),
    };
  } else if (browserLow) {
    critical = {
      kind: 'browser_cross_os_low',
      label: browserLow.browser,
      passRate: Math.round(browserLow.rate),
      osCount: browserLow.osCount,
    };
  }

  // ── Coverage gap: TC with untested/total >= 0.5
  const gapCandidates = rowRates.filter(
    r => r.total > 0 && r.untested / r.total >= 0.5,
  );
  gapCandidates.sort((a, b) => b.untested - a.untested);
  const coverageGap: InsightCoverageGap | null = gapCandidates[0]
    ? {
        tcTitle: gapCandidates[0].title,
        customId: gapCandidates[0].customId,
        untestedCount: gapCandidates[0].untested,
        totalEnvs: gapCandidates[0].total,
      }
    : null;

  // ── Stable baseline: rate >= 95%, highest
  const baselineCandidates = colRates
    .filter(x => x.rate !== null && (x.rate as number) >= 95)
    .sort((a, b) => (b.rate as number) - (a.rate as number));
  const stableBaseline: InsightBaseline | null = baselineCandidates[0]
    ? {
        envName: baselineCandidates[0].envName,
        passRate: Math.round(baselineCandidates[0].rate as number),
      }
    : null;

  // ── Quick Stats
  const envsWithRate = colRates.filter(x => x.rate !== null) as Array<
    ColRate & { rate: number }
  >;
  const tcsWithRate = rowRates.filter(x => x.rate !== null) as Array<
    RowRate & { rate: number }
  >;

  const bestEnv = envsWithRate.length
    ? envsWithRate.reduce((a, b) => (b.rate > a.rate ? b : a))
    : null;
  const worstEnv = envsWithRate.length
    ? envsWithRate.reduce((a, b) => (b.rate < a.rate ? b : a))
    : null;
  const bestTc = tcsWithRate.length
    ? tcsWithRate.reduce((a, b) => (b.rate > a.rate ? b : a))
    : null;
  const worstTc = tcsWithRate.length
    ? tcsWithRate.reduce((a, b) => (b.rate < a.rate ? b : a))
    : null;

  // Count non-null patterns (Critical / Gap / Baseline)
  let patternCount = 0;
  if (critical) patternCount += 1;
  if (coverageGap) patternCount += 1;
  if (stableBaseline) patternCount += 1;

  return {
    critical,
    coverageGap,
    stableBaseline,
    quickStats: {
      bestEnv: bestEnv
        ? { name: bestEnv.envName, rate: Math.round(bestEnv.rate) }
        : null,
      worstEnv: worstEnv
        ? { name: worstEnv.envName, rate: Math.round(worstEnv.rate) }
        : null,
      bestTc: bestTc
        ? { name: bestTc.customId || bestTc.title, rate: Math.round(bestTc.rate) }
        : null,
      worstTc: worstTc
        ? { name: worstTc.customId || worstTc.title, rate: Math.round(worstTc.rate) }
        : null,
    },
    patternCount,
  };
}
