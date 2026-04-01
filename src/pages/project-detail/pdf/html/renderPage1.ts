import { PdfData } from '../pdfTypes';
import { e, pctColor, fmtDate, deltaHtml } from './htmlUtils';

export function renderPage1(data: PdfData, pageNum: number, totalPages: number, tierLevel: number): string {
  const today = fmtDate();

  const releaseColor =
    data.releaseStatus === 'RELEASE_READY' ? 'rgb(16,163,127)' :
    data.releaseStatus === 'CONDITIONAL' ? 'rgb(249,115,22)' : 'rgb(239,68,68)';
  const releaseBg =
    data.releaseStatus === 'RELEASE_READY' ? 'rgb(236,253,245)' :
    data.releaseStatus === 'CONDITIONAL' ? 'rgb(255,251,235)' : 'rgb(254,242,242)';
  const releaseBorder =
    data.releaseStatus === 'RELEASE_READY' ? 'rgb(16,163,127)' :
    data.releaseStatus === 'CONDITIONAL' ? 'rgb(245,158,11)' : 'rgb(239,68,68)';
  const releaseLabel =
    data.releaseStatus === 'RELEASE_READY' ? 'RELEASE READY' :
    data.releaseStatus === 'CONDITIONAL' ? 'CONDITIONAL' : 'NOT READY';
  const releaseIcon =
    data.releaseStatus === 'RELEASE_READY' ? '✓' :
    data.releaseStatus === 'CONDITIONAL' ? '!' : '✕';

  const scoreBreak = data.releaseReadiness.scoreBreakdown;

  const kpiItems = [
    { label: 'Pass Rate', val: `${data.passRate.toFixed(1)}%`, delta: data.passRateDelta, positive: data.passRateDelta >= 0 },
    { label: 'Total Executed', val: data.totalExecuted.toLocaleString(), delta: data.executedDelta, positive: data.executedDelta >= 0 },
    { label: 'Active Runs', val: `${data.activeRuns}`, sub: `of ${data.totalRuns}` },
    { label: 'Failed TCs', val: `${data.failedCount}`, delta: data.failedDelta, positive: data.failedDelta >= 0 },
    { label: 'Blocked', val: `${data.blockedCount}`, delta: data.blockedDelta, positive: data.blockedDelta >= 0 },
    { label: 'Test Cases', val: `${data.totalTCs}`, sub: 'total' },
  ];

  const riskColorMap: Record<string, string> = {
    critical: 'rgb(239,68,68)',
    high: 'rgb(249,115,22)',
    medium: 'rgb(234,179,8)',
  };

  const tocPages = [
    { n: 2, label: 'Quality Scorecard' },
    { n: 3, label: 'Quality Trends' },
    { n: 4, label: 'Execution Detail' },
    { n: 5, label: 'Milestone & Release Readiness' },
    ...(tierLevel >= 3 ? [
      { n: 6, label: 'Risk Assessment' },
      { n: 7, label: 'Team Performance' },
    ] : []),
    { n: tierLevel >= 3 ? 8 : 6, label: 'Test Case Appendix' },
  ];

  return `
<!-- Fix 4: Tall cover header with dark navy gradient, inline styles to guarantee rendering -->
<div style="height:160px;background:linear-gradient(135deg,#1e3a5f 0%,#2d5a87 60%,#1e3a5f 100%);padding:0 80px;display:flex;flex-direction:column;justify-content:center;flex-shrink:0;">
  <div style="display:flex;justify-content:space-between;align-items:center;width:100%;margin-bottom:18px;">
    <span style="font-size:14px;font-weight:700;color:#fff;letter-spacing:.3px;">Testably</span>
    <span style="font-size:10px;color:rgba(255,255,255,.8);">Report Generated: ${today}</span>
  </div>
  <div style="font-size:24px;font-weight:700;color:#fff;margin-bottom:5px;">${e(data.projectName)}</div>
  <div style="font-size:13px;color:rgba(255,255,255,.85);">Quality Executive Report</div>
</div>

<div class="pdf-content" style="padding-top:16px;">
  <div class="sec-title" style="margin-top:0;">Release Readiness</div>
  <div style="background:${releaseBg};border:2px solid ${releaseBorder};border-radius:10px;padding:14px 18px;display:flex;align-items:center;gap:18px;margin-bottom:12px;">
    <!-- Fix 2: Flex centering for icon circle -->
    <div style="width:44px;height:44px;border-radius:50%;background:${releaseColor};display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:22px;font-weight:700;color:#fff;line-height:1;">
      ${releaseIcon}
    </div>
    <div>
      <div style="font-size:15px;font-weight:700;color:${releaseColor};">${releaseLabel}</div>
      <div style="font-size:12px;font-weight:700;color:rgb(15,23,42);margin-top:2px;">Score: ${data.releaseScore} / 100</div>
      <div style="font-size:10px;color:rgb(100,116,139);margin-top:2px;">
        ${data.releaseStatus === 'RELEASE_READY' ? 'Project meets quality gates for release' : data.releaseStatus === 'CONDITIONAL' ? 'Conditional release — some gates not met' : 'Project does not meet release criteria'}
      </div>
    </div>
  </div>

  <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:14px;">
    <div class="kpi-card" style="text-align:center;padding:8px 10px;">
      <div class="kpi-label">Pass Rate (40%)</div>
      <div style="font-size:13px;font-weight:700;color:${pctColor(data.passRate)};">${data.passRate.toFixed(1)}%</div>
    </div>
    <div class="kpi-card" style="text-align:center;padding:8px 10px;">
      <div class="kpi-label">Critical Pass (25%)</div>
      <div style="font-size:13px;font-weight:700;color:rgb(15,23,42);">${scoreBreak.critBugResolution.toFixed(0)}%</div>
    </div>
    <div class="kpi-card" style="text-align:center;padding:8px 10px;">
      <div class="kpi-label">Coverage (20%)</div>
      <div style="font-size:13px;font-weight:700;color:${pctColor(scoreBreak.coverageRate)};">${scoreBreak.coverageRate.toFixed(0)}%</div>
    </div>
    <div class="kpi-card" style="text-align:center;padding:8px 10px;">
      <div class="kpi-label">Milestone (15%)</div>
      <div style="font-size:13px;font-weight:700;color:${pctColor(scoreBreak.milestoneProgress)};">${scoreBreak.milestoneProgress.toFixed(0)}%</div>
    </div>
  </div>

  <div class="sec-title">Key Performance Indicators</div>
  <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:14px;">
    ${kpiItems.map(k => `
    <div class="kpi-card">
      <div class="kpi-label">${e(k.label)}</div>
      <div class="kpi-val">${e(k.val)}${k.sub ? `<span style="font-size:11px;font-weight:400;color:rgb(100,116,139);"> ${e(k.sub)}</span>` : ''}</div>
      ${deltaHtml(k.delta, k.positive)}
    </div>`).join('')}
  </div>

  ${data.risks.length > 0 ? `
  <div class="sec-title">Risk Highlights</div>
  <div style="margin-bottom:14px;">
    ${data.risks.slice(0, 3).map(r => `
    <div style="display:flex;align-items:flex-start;gap:10px;padding:5px 0;border-bottom:1px solid rgb(241,245,249);">
      <span style="width:10px;height:10px;border-radius:50%;background:${riskColorMap[r.severity] || 'rgb(234,179,8)'};flex-shrink:0;margin-top:3px;display:inline-block;"></span>
      <span style="font-size:10px;color:rgb(15,23,42);">${e(r.message)}</span>
    </div>`).join('')}
  </div>` : ''}

  <div class="sec-title">Table of Contents</div>
  <div style="background:rgb(248,250,252);border:1px solid rgb(226,232,240);border-radius:6px;padding:12px 16px;">
    ${tocPages.map(p => `
    <div style="display:flex;align-items:center;padding:4px 0;border-bottom:1px dashed rgb(226,232,240);">
      <span style="font-size:10px;color:rgb(15,23,42);">${e(p.label)}</span>
      <span style="flex:1;border-bottom:1px dotted rgb(203,213,225);margin:0 8px;height:1px;"></span>
      <span style="font-size:10px;font-weight:600;color:rgb(99,102,241);">${p.n}</span>
    </div>`).join('')}
  </div>
</div>

<div class="pdf-footer">
  <span>${e(data.projectName)}</span>
  <span>Generated by Testably — ${today}</span>
  <span>Page ${pageNum} of ${totalPages}</span>
</div>`;
}
