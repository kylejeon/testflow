export function e(val: any): string {
  return String(val ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function fmtNum(n: number): string {
  return n.toLocaleString('en-US');
}

export function priColor(priority: string): string {
  switch ((priority || '').toLowerCase()) {
    case 'critical': return 'rgb(239,68,68)';
    case 'high': return 'rgb(245,158,11)';
    case 'medium': return 'rgb(99,102,241)';
    default: return 'rgb(148,163,184)';
  }
}

export function priAbbr(priority: string): string {
  const p = (priority || '').toLowerCase();
  if (p === 'critical') return 'Crit';
  if (p === 'high') return 'High';
  if (p === 'medium') return 'Med';
  return 'Low';
}

export function statusClass(status: string): string {
  const s = (status || '').toLowerCase();
  if (s === 'passed') return 'c-pass';
  if (s === 'failed') return 'c-fail';
  if (s === 'blocked') return 'c-block';
  if (s === 'retest') return 'c-retest';
  return 'c-untested';
}

export function pctColor(pct: number): string {
  if (pct >= 90) return 'rgb(16,163,127)';
  if (pct >= 70) return 'rgb(249,115,22)';
  return 'rgb(239,68,68)';
}

/** Build an SVG line chart. Values are 0-100 (percentage). Returns full SVG element string. */
export function buildLineChartSvg(
  values: number[],
  w: number, h: number,
  lineColor: string,
  yMin = 0, yMax = 100,
): string {
  if (values.length < 2) return `<svg width="${w}" height="${h}"></svg>`;
  const range = yMax - yMin || 1;
  const gridLines = [0, 25, 50, 75, 100].map(pct => {
    const gy = h - ((pct - yMin) / range) * h;
    return `<line x1="0" y1="${gy.toFixed(1)}" x2="${w}" y2="${gy.toFixed(1)}" stroke="rgb(226,232,240)" stroke-width="0.5" stroke-dasharray="3,2"/>`;
  }).join('');
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * w;
    const y = h - ((Math.max(yMin, Math.min(yMax, v)) - yMin) / range) * h;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  const circles = values.map((v, i) => {
    const x = (i / (values.length - 1)) * w;
    const y = h - ((Math.max(yMin, Math.min(yMax, v)) - yMin) / range) * h;
    return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3" fill="${lineColor}"/>`;
  }).join('');
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" overflow="visible">
  ${gridLines}
  <polyline fill="none" stroke="${lineColor}" stroke-width="2" points="${pts}"/>
  ${circles}
</svg>`;
}

/** Build an SVG bar chart. Returns full SVG element string. */
export function buildBarChartSvg(
  values: number[],
  w: number, h: number,
  barColor: string,
  avgLineColor?: string,
): string {
  if (values.length === 0) return `<svg width="${w}" height="${h}"></svg>`;
  const maxV = Math.max(...values, 1);
  const barW = (w / values.length) * 0.65;
  const gap = (w / values.length) * 0.35 / 2;
  const bars = values.map((v, i) => {
    const barH = (v / maxV) * h;
    const x = (i / values.length) * w + gap;
    const y = h - barH;
    return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barW.toFixed(1)}" height="${barH.toFixed(1)}" fill="${barColor}" rx="2"/>`;
  }).join('');
  let avgLine = '';
  if (avgLineColor && values.length >= 7) {
    const mavg = values.map((_, i) => {
      const slice = values.slice(Math.max(0, i - 3), i + 4);
      return slice.reduce((a, b) => a + b, 0) / slice.length;
    });
    const mpts = mavg.map((v, i) => {
      const x = (i / values.length) * w + gap + barW / 2;
      const y = h - (v / maxV) * h;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
    avgLine = `<polyline fill="none" stroke="${avgLineColor}" stroke-width="1.5" stroke-dasharray="4,2" points="${mpts}"/>`;
  }
  const gridLines = [0.25, 0.5, 0.75, 1.0].map(f => {
    const gy = h - f * h;
    return `<line x1="0" y1="${gy.toFixed(1)}" x2="${w}" y2="${gy.toFixed(1)}" stroke="rgb(226,232,240)" stroke-width="0.5" stroke-dasharray="3,2"/>`;
  }).join('');
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" overflow="visible">
  ${gridLines}
  ${bars}
  ${avgLine}
</svg>`;
}
