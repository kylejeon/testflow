import { PdfData } from '../pdfTypes';
import { e, pctColor, fmtDate } from './htmlUtils';

export function renderPage2(data: PdfData, pageNum: number, totalPages: number): string {
  const today = fmtDate();
  const total = data.statusCounts.passed + data.statusCounts.failed + data.statusCounts.blocked
    + data.statusCounts.retest + data.statusCounts.untested || 1;

  const segments = [
    { count: data.statusCounts.passed, color: 'rgb(16,163,127)', label: 'Passed' },
    { count: data.statusCounts.failed, color: 'rgb(239,68,68)', label: 'Failed' },
    { count: data.statusCounts.blocked, color: 'rgb(249,115,22)', label: 'Blocked' },
    { count: data.statusCounts.retest, color: 'rgb(234,179,8)', label: 'Retest' },
    { count: data.statusCounts.untested, color: 'rgb(203,213,225)', label: 'Untested' },
  ];

  const defectRate = data.totalExecuted > 0
    ? ((data.failedCount / data.totalExecuted) * 100).toFixed(1) + '%' : '0%';

  const kpis = [
    { label: 'Overall Pass Rate', val: `${data.passRate.toFixed(1)}%`, sub: `Target: 90% ${data.passRate >= 90 ? '✅' : '⚠️'}`, color: pctColor(data.passRate) },
    { label: 'Execution Completion', val: `${data.executionComplete.toFixed(1)}%`, sub: `Target: 95% ${data.executionComplete >= 95 ? '✅' : '⚠️'}`, color: pctColor(data.executionComplete) },
    { label: 'Defect Discovery Rate', val: defectRate, sub: 'Industry: ~5-10%' },
    { label: 'Automation Rate', val: data.automationRate < 0 ? 'N/A' : `${data.automationRate.toFixed(1)}%`, sub: data.automationRate < 0 ? 'No data' : `${data.totalTCs > 0 ? Math.round(data.automationRate / 100 * data.totalTCs) : 0} / ${data.totalTCs} TCs` },
    { label: 'Avg Run Pass Rate', val: `${data.avgRunPassRate.toFixed(1)}%`, sub: `across ${data.totalRuns} runs`, color: pctColor(data.avgRunPassRate) },
    { label: 'Open Blockers', val: `${data.openBlockers}`, sub: data.openBlockers > 0 ? '🔴 Needs attention' : '✅ All clear', color: data.openBlockers > 0 ? 'rgb(239,68,68)' : 'rgb(16,163,127)' },
  ];

  const priorities = [
    { label: 'Critical', color: 'rgb(239,68,68)', count: data.priorityCounts.critical },
    { label: 'High', color: 'rgb(245,158,11)', count: data.priorityCounts.high },
    { label: 'Medium', color: 'rgb(99,102,241)', count: data.priorityCounts.medium },
    { label: 'Low', color: 'rgb(148,163,184)', count: data.priorityCounts.low },
  ];
  const infoItems = [
    { label: 'PROJECT', val: data.projectName },
    { label: 'TOTAL RUNS', val: data.totalRuns },
    { label: 'TOTAL TCS', val: data.totalTCs },
    { label: 'ACTIVE MILESTONES', val: data.activeMilestones },
    { label: 'TOTAL EXECUTED', val: data.totalExecuted },
    { label: 'REPORT DATE', val: data.dateStr },
  ];

  // Pair infoItems into rows of 2
  const infoRows: typeof infoItems[] = [];
  for (let i = 0; i < infoItems.length; i += 2) {
    infoRows.push(infoItems.slice(i, i + 2));
  }

  return `
<div class="pdf-header">
  <span class="logo">Testably</span>
  <span class="page-title">Quality Scorecard</span>
</div>

<div class="pdf-content">
  <div class="sec-title" style="margin-top:0;">Status Distribution</div>
  <div class="stack-bar" style="margin-bottom:8px;">
    ${segments.filter(s => s.count > 0).map(s =>
      `<div class="stack-seg" style="width:${(s.count/total*100).toFixed(2)}%;background:${s.color};"></div>`
    ).join('')}
  </div>
  <div style="margin-bottom:14px;">
    ${segments.map(s => `
    <span style="display:inline-block;vertical-align:middle;margin-right:12px;margin-bottom:4px;">
      <span style="width:10px;height:10px;border-radius:2px;background:${s.color};display:inline-block;vertical-align:middle;margin-right:5px;"></span>
      <span style="font-size:9px;color:rgb(100,116,139);vertical-align:middle;">${s.label} (${s.count})</span>
    </span>`).join('')}
  </div>

  <div class="sec-title">Key Performance Indicators</div>
  <table style="width:100%;table-layout:fixed;border-collapse:collapse;margin-bottom:14px;">
    <tr>
      ${kpis.slice(0, 3).map((k, i) => `
      <td style="width:33.33%;vertical-align:top;${i < 2 ? 'padding-right:5px;' : ''}${i > 0 ? 'padding-left:5px;' : ''}">
        <div class="kpi-card">
          <div class="kpi-label">${e(k.label)}</div>
          <div class="kpi-val" style="${k.color ? `color:${k.color};` : ''}">${e(k.val)}</div>
          <div class="kpi-target">${e(k.sub)}</div>
        </div>
      </td>`).join('')}
    </tr>
    <tr>
      ${kpis.slice(3, 6).map((k, i) => `
      <td style="width:33.33%;vertical-align:top;padding-top:5px;${i < 2 ? 'padding-right:5px;' : ''}${i > 0 ? 'padding-left:5px;' : ''}">
        <div class="kpi-card">
          <div class="kpi-label">${e(k.label)}</div>
          <div class="kpi-val" style="${k.color ? `color:${k.color};` : ''}">${e(k.val)}</div>
          <div class="kpi-target">${e(k.sub)}</div>
        </div>
      </td>`).join('')}
    </tr>
  </table>

  <div class="sec-title">Priority Distribution</div>
  <div style="margin-bottom:14px;">
    ${priorities.map(p => {
      const pct = data.totalTCs > 0 ? ((p.count / data.totalTCs) * 100).toFixed(1) : '0.0';
      return `
    <div style="margin-bottom:10px;">
      <div style="font-size:9px;font-weight:700;color:${p.color};margin-bottom:3px;">${p.label}</div>
      <div style="display:table;width:100%;">
        <div style="display:table-cell;vertical-align:middle;">
          <div style="height:15px;background:rgb(241,245,249);border-radius:3px;overflow:hidden;">
            <div style="width:${pct}%;height:100%;background:${p.color};border-radius:3px;"></div>
          </div>
        </div>
        <div style="display:table-cell;vertical-align:middle;white-space:nowrap;width:80px;font-size:9px;color:rgb(100,116,139);text-align:right;padding-left:8px;">${p.count} (${pct}%)</div>
      </div>
    </div>`;
    }).join('')}
  </div>

  <div class="sec-title">Project Information</div>
  <table style="width:100%;border-collapse:collapse;font-size:9px;">
    ${infoRows.map((row, ri) => `
    <tr>
      ${row.map((item, ci) => `
      <td style="width:50%;padding:5px 0;${ri < infoRows.length - 1 ? 'border-bottom:1px solid rgb(241,245,249);' : ''}${ci === 0 ? 'padding-right:10px;' : 'padding-left:10px;'}">
        <span style="color:rgb(100,116,139);font-size:8px;display:inline-block;width:90px;vertical-align:top;">${item.label}:</span>
        <span style="color:rgb(15,23,42);font-size:9px;font-weight:500;">${e(String(item.val || '-'))}</span>
      </td>`).join('')}
    </tr>`).join('')}
  </table>
</div>

<div class="pdf-footer">
  <span style="position:absolute;left:80px;top:0;height:48px;line-height:48px;">${e(data.projectName)}</span>
  <span style="position:absolute;left:0;right:0;top:0;height:48px;line-height:48px;text-align:center;">Generated by Testably — ${today}</span>
  <span style="position:absolute;right:80px;top:0;height:48px;line-height:48px;">Page ${pageNum} of ${totalPages}</span>
</div>`;
}
