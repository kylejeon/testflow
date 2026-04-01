import { PdfData } from '../pdfTypes';
import { e, fmtDate } from './htmlUtils';
import { buildBarChartSvg } from './htmlUtils';

function buildCombinedPassExecSvg(passRates: number[], execCounts: number[], w: number, h: number): string {
  if (passRates.length < 2) return `<svg width="${w}" height="${h}"></svg>`;
  const n = passRates.length - 1;
  const execMax = Math.max(...execCounts, 1);
  const gridLines = [0, 25, 50, 75, 100].map(pct => {
    const gy = (h - (pct / 100) * h).toFixed(1);
    return `<line x1="0" y1="${gy}" x2="${w}" y2="${gy}" stroke="rgb(226,232,240)" stroke-width="0.5" stroke-dasharray="3,2"/>`;
  }).join('');
  const passPts = passRates.map((v, i) => {
    const x = ((i / n) * w).toFixed(1);
    const y = (h - (Math.min(100, Math.max(0, v)) / 100) * h).toFixed(1);
    return `${x},${y}`;
  }).join(' ');
  const execPts = execCounts.map((v, i) => {
    const x = ((i / n) * w).toFixed(1);
    const y = (h - (v / execMax) * h).toFixed(1);
    return `${x},${y}`;
  }).join(' ');
  const circles = passRates.map((v, i) => {
    const cx = ((i / n) * w).toFixed(1);
    const cy = (h - (Math.min(100, Math.max(0, v)) / 100) * h).toFixed(1);
    return `<circle cx="${cx}" cy="${cy}" r="3" fill="rgb(99,102,241)"/>`;
  }).join('');
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" overflow="visible">
  ${gridLines}
  <polyline fill="none" stroke="rgb(245,158,11)" stroke-width="1.5" stroke-dasharray="4,2" points="${execPts}"/>
  <polyline fill="none" stroke="rgb(99,102,241)" stroke-width="2" points="${passPts}"/>
  ${circles}
</svg>`;
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

  // Build combined pass rate + exec count chart
  const lineH = 140;
  const lineSvg = buildCombinedPassExecSvg(passRateValues, execValues, CW, lineH);

  // Build velocity chart
  const barH = 110;
  const barSvg = buildBarChartSvg(execValues, CW, barH, 'rgb(99,102,241)', 'rgb(245,158,11)');

  // WoW table
  const hasLastWeekData = data.weekComparison.some(w => w.lastWeek > 0);
  const maxWoW = Math.max(...data.weekComparison.map(w => w.thisWeek), 1);

  // Filtered date labels for display
  const filteredDateLabels = dateLabels.filter((_, i) => i % Math.max(1, Math.floor(dateLabels.length / 6)) === 0 || i === dateLabels.length - 1);

  return `
<div class="pdf-header">
  <span class="logo">Testably</span>
  <span class="page-title">Quality Trends</span>
</div>

<div class="pdf-content">
  <div class="sec-title" style="margin-top:0;">Pass Rate Trend (Last ${trends.length} Days)</div>
  <div style="position:relative;margin-bottom:4px;">
    <table style="width:100%;table-layout:fixed;border-collapse:collapse;margin-bottom:2px;">
      <tr>
        <td style="font-size:9px;color:rgb(100,116,139);text-align:left;">100%</td>
        <td style="font-size:9px;color:rgb(100,116,139);text-align:center;">75%</td>
        <td style="font-size:9px;color:rgb(100,116,139);text-align:center;">50%</td>
        <td style="font-size:9px;color:rgb(100,116,139);text-align:center;">25%</td>
        <td style="font-size:9px;color:rgb(100,116,139);text-align:right;">0%</td>
      </tr>
    </table>
    <div class="chart-area" style="height:${lineH}px;background:#fff;padding:0;">
      ${lineSvg}
    </div>
    ${trends.length > 1 ? `
    <table style="width:100%;table-layout:fixed;border-collapse:collapse;margin-top:2px;">
      <tr>
        ${filteredDateLabels.map((l, i) => `<td style="font-size:8px;color:rgb(100,116,139);${i === 0 ? 'text-align:left;' : i === filteredDateLabels.length - 1 ? 'text-align:right;' : 'text-align:center;'}">${l}</td>`).join('')}
      </tr>
    </table>` : ''}
  </div>
  <div style="text-align:center;margin-bottom:10px;">
    <span style="display:inline-block;vertical-align:middle;margin-right:16px;">
      <span style="width:14px;height:2px;background:rgb(99,102,241);display:inline-block;vertical-align:middle;margin-right:4px;"></span>
      <span style="font-size:9px;color:rgb(100,116,139);vertical-align:middle;">Pass Rate (%)</span>
    </span>
    <span style="display:inline-block;vertical-align:middle;">
      <span style="width:7px;height:2px;background:rgb(245,158,11);display:inline-block;vertical-align:middle;margin-right:2px;"></span>
      <span style="width:4px;height:2px;background:rgb(245,158,11);display:inline-block;vertical-align:middle;margin-right:4px;"></span>
      <span style="font-size:9px;color:rgb(100,116,139);vertical-align:middle;">Execution Count</span>
    </span>
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
        const changeSym = w.change === 0 ? '—' : w.change > 0 ? `▲ ${Math.abs(w.change).toFixed(1)}` : `▼ ${Math.abs(w.change).toFixed(1)}`;
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
  <div class="chart-area" style="height:${barH}px;background:#fff;padding:0;margin-bottom:6px;">
    ${barSvg}
  </div>
  ${trends.length > 1 ? `
  <table style="width:100%;table-layout:fixed;border-collapse:collapse;margin-bottom:4px;">
    <tr>
      ${filteredDateLabels.map((l, i) => `<td style="font-size:8px;color:rgb(100,116,139);${i === 0 ? 'text-align:left;' : i === filteredDateLabels.length - 1 ? 'text-align:right;' : 'text-align:center;'}">${l}</td>`).join('')}
    </tr>
  </table>
  <div style="text-align:center;">
    <span style="display:inline-block;vertical-align:middle;margin-right:16px;">
      <span style="width:7px;height:2px;background:rgb(245,158,11);display:inline-block;vertical-align:middle;margin-right:2px;"></span>
      <span style="width:4px;height:2px;background:rgb(245,158,11);display:inline-block;vertical-align:middle;margin-right:4px;"></span>
      <span style="font-size:9px;color:rgb(100,116,139);vertical-align:middle;">7-day moving avg</span>
    </span>
    <span style="display:inline-block;vertical-align:middle;">
      <span style="width:10px;height:10px;background:rgb(99,102,241);border-radius:2px;display:inline-block;vertical-align:middle;margin-right:4px;"></span>
      <span style="font-size:9px;color:rgb(100,116,139);vertical-align:middle;">Daily executions</span>
    </span>
  </div>` : ''}
</div>

<div class="pdf-footer">
  <span style="position:absolute;left:80px;top:0;height:48px;line-height:48px;">${e(data.projectName)}</span>
  <span style="position:absolute;left:0;right:0;top:0;height:48px;line-height:48px;text-align:center;">Generated by Testably — ${today}</span>
  <span style="position:absolute;right:80px;top:0;height:48px;line-height:48px;">Page ${pageNum} of ${totalPages}</span>
</div>`;
}
