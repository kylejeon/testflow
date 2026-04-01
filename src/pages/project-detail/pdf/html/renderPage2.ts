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
    { label: 'Overall Pass Rate', val: `${data.passRate.toFixed(1)}%`, sub: 'Target: 90%', color: pctColor(data.passRate) },
    { label: 'Execution Completion', val: `${data.executionComplete.toFixed(1)}%`, sub: 'Target: 95%', color: pctColor(data.executionComplete) },
    { label: 'Defect Discovery Rate', val: defectRate, sub: 'Industry: 5-10%' },
    { label: 'Automation Rate', val: data.automationRate < 0 ? 'N/A' : `${data.automationRate.toFixed(1)}%`, sub: data.automationRate < 0 ? 'No data' : 'Automated TCs' },
    { label: 'Avg Run Pass Rate', val: `${data.avgRunPassRate.toFixed(1)}%`, sub: 'Across all runs', color: pctColor(data.avgRunPassRate) },
    { label: 'Open Blockers', val: `${data.openBlockers}`, sub: data.openBlockers > 0 ? 'Needs attention' : 'All clear', color: data.openBlockers > 0 ? 'rgb(239,68,68)' : 'rgb(16,163,127)' },
  ];

  const priorities = [
    { label: 'Critical', color: 'rgb(239,68,68)', count: data.priorityCounts.critical },
    { label: 'High', color: 'rgb(245,158,11)', count: data.priorityCounts.high },
    { label: 'Medium', color: 'rgb(99,102,241)', count: data.priorityCounts.medium },
    { label: 'Low', color: 'rgb(148,163,184)', count: data.priorityCounts.low },
  ];
  const maxCount = Math.max(...priorities.map(p => p.count), 1);
  const BAR_MAX_W = 380;

  const infoItems = [
    { label: 'PROJECT', val: data.projectName },
    { label: 'TOTAL RUNS', val: data.totalRuns },
    { label: 'TOTAL TCS', val: data.totalTCs },
    { label: 'ACTIVE MILESTONES', val: data.activeMilestones },
    { label: 'TOTAL EXECUTED', val: data.totalExecuted },
    { label: 'REPORT DATE', val: data.dateStr },
  ];

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
  <div style="display:flex;flex-wrap:wrap;gap:12px;margin-bottom:14px;">
    ${segments.map(s => `
    <div style="display:flex;align-items:center;gap:5px;">
      <span style="width:10px;height:10px;border-radius:2px;background:${s.color};display:inline-block;"></span>
      <span style="font-size:9px;color:rgb(100,116,139);">${s.label} (${s.count})</span>
    </div>`).join('')}
  </div>

  <div class="sec-title">Key Performance Indicators</div>
  <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:14px;">
    ${kpis.map(k => `
    <div class="kpi-card">
      <div class="kpi-label">${e(k.label)}</div>
      <div class="kpi-val" style="${k.color ? `color:${k.color};` : ''}">${e(k.val)}</div>
      <div class="kpi-target">${e(k.sub)}</div>
    </div>`).join('')}
  </div>

  <div class="sec-title">Priority Distribution</div>
  <div style="margin-bottom:14px;">
    ${priorities.map(p => {
      const barW = (p.count / maxCount) * BAR_MAX_W;
      const pct = data.totalTCs > 0 ? ((p.count / data.totalTCs) * 100).toFixed(1) : '0.0';
      return `
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
      <span style="width:60px;font-size:10px;font-weight:700;color:${p.color};">${p.label}</span>
      <div style="flex:1;height:14px;background:rgb(241,245,249);border-radius:4px;overflow:hidden;max-width:${BAR_MAX_W}px;">
        <div style="width:${barW.toFixed(1)}px;height:100%;background:${p.color};border-radius:4px;"></div>
      </div>
      <span style="width:80px;font-size:10px;color:rgb(100,116,139);">${p.count} (${pct}%)</span>
    </div>`;
    }).join('')}
  </div>

  <div class="sec-title">Project Information</div>
  <div style="background:rgb(248,250,252);border:1px solid rgb(226,232,240);border-radius:8px;padding:14px 18px;">
    <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:12px;">
      ${infoItems.map(item => `
      <div>
        <div style="font-size:9px;color:rgb(100,116,139);margin-bottom:2px;">${item.label}</div>
        <div style="font-size:11px;font-weight:700;color:rgb(15,23,42);">${e(String(item.val || '-'))}</div>
      </div>`).join('')}
    </div>
  </div>
</div>

<div class="pdf-footer">
  <span>${e(data.projectName)}</span>
  <span>Generated by Testably — ${today}</span>
  <span>Page ${pageNum} of ${totalPages}</span>
</div>`;
}
