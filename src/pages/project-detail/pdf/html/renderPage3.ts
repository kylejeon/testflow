import { PdfData } from '../pdfTypes';
import { e, fmtDate } from './htmlUtils';
import { buildBarChartSvg } from './htmlUtils';

function buildCombinedPassExecSvg(
  passRates: number[], execCounts: number[], w: number, h: number
): { svg: string; yMin: number; execMax: number } {
  if (passRates.length < 2) return { svg: `<svg width="${w}" height="${h}"></svg>`, yMin: 0, execMax: 1 };
  const n = passRates.length - 1;
  const execMax = Math.max(...execCounts, 1);

  // Auto-scale Y-axis: start from just below the minimum non-zero pass rate
  const nonZeroRates = passRates.filter(v => v > 0);
  const dataMin = nonZeroRates.length > 0 ? Math.min(...nonZeroRates) : 0;
  const yMin = Math.max(0, Math.floor((dataMin - 10) / 10) * 10);
  const yRange = 100 - yMin || 1;

  const gridLines = [0, 0.25, 0.5, 0.75, 1.0].map(f => {
    const gy = (h - f * h).toFixed(1);
    return `<line x1="0" y1="${gy}" x2="${w}" y2="${gy}" stroke="rgb(226,232,240)" stroke-width="0.5" stroke-dasharray="3,2"/>`;
  }).join('');
  const passPts = passRates.map((v, i) => {
    const x = ((i / n) * w).toFixed(1);
    const clamped = Math.min(100, Math.max(yMin, v));
    const y = (h - ((clamped - yMin) / yRange) * h).toFixed(1);
    return `${x},${y}`;
  }).join(' ');
  const execPts = execCounts.map((v, i) => {
    const x = ((i / n) * w).toFixed(1);
    const y = (h - (v / execMax) * h).toFixed(1);
    return `${x},${y}`;
  }).join(' ');
  const circles = passRates.map((v, i) => {
    const cx = ((i / n) * w).toFixed(1);
    const clamped = Math.min(100, Math.max(yMin, v));
    const cy = (h - ((clamped - yMin) / yRange) * h).toFixed(1);
    return `<circle cx="${cx}" cy="${cy}" r="3" fill="rgb(99,102,241)"/>`;
  }).join('');
  const svg = `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" overflow="visible">
  ${gridLines}
  <polyline fill="none" stroke="rgb(245,158,11)" stroke-width="1.5" stroke-dasharray="4,2" points="${execPts}"/>
  <polyline fill="none" stroke="rgb(99,102,241)" stroke-width="2" points="${passPts}"/>
  ${circles}
</svg>`;
  return { svg, yMin, execMax };
}

export function renderPage3(data: PdfData, pageNum: number, totalPages: number): string {
  const today = fmtDate();
  const CW = 634; // content width px

  // Chart data
  const trends = data.dailyTrends.slice(-30);
  const passRateValues = trends.map(d => d.passRate);
  const execValues = trends.map(d => d.execCount);
  const dateLabels = trends.map(d => {
    const dt = new Date(d.date);
    return `${dt.getMonth() + 1}/${dt.getDate()}`;
  });

  // Build combined pass rate + exec count chart (60px reserved for Y-axis labels)
  const lineH = 140;
  const chartW = CW - 60;
  const { svg: lineSvg, yMin, execMax } = buildCombinedPassExecSvg(passRateValues, execValues, chartW, lineH);

  // Generate vertical Y-axis labels for pass rate (left) and exec count (right)
  const passAxisLabels = [0, 0.25, 0.5, 0.75, 1.0].map(f => {
    const pct = Math.round(100 - f * (100 - yMin));
    const top = Math.round(f * lineH);
    return `<span style="position:absolute;right:3px;top:${top}px;font-size:8px;color:rgb(100,116,139);line-height:1;transform:translateY(-50%);">${pct}%</span>`;
  }).join('');
  const execAxisLabels = [0, 0.5, 1.0].map(f => {
    const val = Math.round(execMax * (1 - f));
    const top = Math.round(f * lineH);
    return `<span style="position:absolute;left:3px;top:${top}px;font-size:8px;color:rgb(100,116,139);line-height:1;transform:translateY(-50%);">${val}</span>`;
  }).join('');

  // Build velocity chart
  const barH = 110;
  const barSvg = buildBarChartSvg(execValues, chartW, barH, 'rgb(99,102,241)', 'rgb(239,68,68)');

  // WoW table
  const hasLastWeekData = data.weekComparison.some(w => w.lastWeek > 0);
  const maxWoW = Math.max(...data.weekComparison.map(w => w.thisWeek), 1);

  return `
<div class="pdf-header">
  <span class="logo">Testably</span>
  <span class="page-title">Quality Trends</span>
</div>

<div class="pdf-content">
  <div class="sec-title" style="margin-top:0;">Pass Rate Trend (Last ${trends.length} Days)</div>
  <div style="position:relative;margin-bottom:4px;padding-left:32px;padding-right:28px;">
    <!-- Left Y-axis: pass rate % -->
    <div style="position:absolute;left:0;top:0;width:30px;height:${lineH}px;">
      ${passAxisLabels}
    </div>
    <!-- Right Y-axis: exec count -->
    <div style="position:absolute;right:0;top:0;width:26px;height:${lineH}px;">
      ${execAxisLabels}
    </div>
    <div class="chart-area" style="height:${lineH}px;background:#fff;padding:0;">
      ${lineSvg}
    </div>
    ${trends.length > 1 ? `
    <div style="display:flex;justify-content:space-between;font-size:8px;color:rgb(100,116,139);margin-top:2px;">
      ${dateLabels.filter((_, i) => i % Math.max(1, Math.floor(dateLabels.length / 6)) === 0 || i === dateLabels.length - 1)
        .map(l => `<span>${l}</span>`).join('')}
    </div>` : ''}
  </div>
  <div style="display:flex;align-items:center;justify-content:center;gap:16px;font-size:9px;color:rgb(100,116,139);margin-bottom:10px;">
    <div style="display:flex;align-items:center;gap:4px;">
      <span style="width:14px;height:2px;background:rgb(99,102,241);display:inline-block;"></span>
      Pass Rate (%)
    </div>
    <div style="display:flex;align-items:center;gap:4px;">
      <span style="width:7px;height:2px;background:rgb(245,158,11);display:inline-block;margin-right:2px;"></span><span style="width:4px;height:2px;background:rgb(245,158,11);display:inline-block;"></span>
      Execution Count
    </div>
  </div>

  <div class="sec-title">Week-over-Week Comparison</div>
  ${hasLastWeekData ? `
  <table class="pdf-table" style="margin-bottom:14px;">
    <thead><tr><th>Metric</th><th>This Week</th><th>Last Week</th><th>Change</th><th style="width:90px;">Bar</th></tr></thead>
    <tbody>
      ${data.weekComparison.map(w => {
        const isRate = w.metric.includes('%') || w.metric.includes('Rate');
        const decimals = isRate ? 1 : 0;
        const suffix = isRate ? '%' : '';
        const changeColor = w.change === 0 ? 'rgb(100,116,139)' : w.change > 0 ? 'rgb(16,163,127)' : 'rgb(239,68,68)';
        const changeSym = w.change === 0 ? '—' : w.change > 0 ? `▲ ${Math.abs(w.change).toFixed(1)}${suffix}` : `▼ ${Math.abs(w.change).toFixed(1)}${suffix}`;
        const barPct = (Math.max(w.thisWeek, 0) / maxWoW * 100).toFixed(0);
        return `<tr>
          <td>${e(w.metric)}</td>
          <td style="font-weight:600;">${w.thisWeek.toFixed(decimals)}${suffix}</td>
          <td>${w.lastWeek.toFixed(decimals)}${suffix}</td>
          <td style="color:${changeColor};font-weight:600;">${changeSym}</td>
          <td><div style="width:80px;height:10px;background:rgb(226,232,240);border-radius:2px;overflow:hidden;"><div style="width:${barPct}%;height:100%;background:rgb(99,102,241);border-radius:2px;"></div></div></td>
        </tr>`;
      }).join('')}
    </tbody>
  </table>` : `
  <div style="background:rgb(248,250,252);border:1px solid rgb(226,232,240);border-radius:6px;padding:10px 16px;margin-bottom:14px;font-size:10px;color:rgb(100,116,139);">
    No previous week data available for comparison.
  </div>`}

  <div class="sec-title">Execution Velocity (TC/Day)</div>
  <div style="padding-left:32px;">
    <div class="chart-area" style="height:${barH}px;background:#fff;padding:0;margin-bottom:6px;">
      ${barSvg}
    </div>
    ${trends.length > 1 ? `
    <div style="display:flex;justify-content:space-between;font-size:8px;color:rgb(100,116,139);margin-bottom:4px;">
      ${dateLabels.filter((_, i) => i % Math.max(1, Math.floor(dateLabels.length / 6)) === 0 || i === dateLabels.length - 1)
        .map(l => `<span>${l}</span>`).join('')}
    </div>
    <div style="display:flex;align-items:center;justify-content:center;gap:16px;font-size:9px;color:rgb(100,116,139);">
      <div style="display:flex;align-items:center;gap:4px;">
        <span style="width:14px;height:2px;background:rgb(239,68,68);display:inline-block;"></span>
        7-Day Moving Avg
      </div>
      <div style="display:flex;align-items:center;gap:4px;">
        <span style="width:10px;height:10px;background:rgb(99,102,241);border-radius:2px;display:inline-block;"></span>
        Daily Executions
      </div>
    </div>` : ''}
  </div>
</div>

<div class="pdf-footer">
  <span>${e(data.projectName)}</span>
  <span>Generated by Testably — ${today}</span>
  <span>Page ${pageNum} of ${totalPages}</span>
</div>`;
}
