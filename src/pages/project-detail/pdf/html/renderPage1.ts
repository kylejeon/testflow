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
    // 감소가 긍정적인 지표: delta <= 0 일 때 green
    { label: 'Failed TCs', val: `${data.failedCount}`, delta: data.failedDelta, positive: data.failedDelta <= 0 },
    { label: 'Blocked', val: `${data.blockedCount}`, delta: data.blockedDelta, positive: data.blockedDelta <= 0 },
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
<div style="height:120px;background:linear-gradient(135deg,rgb(99,102,241) 0%,rgb(79,70,229) 50%,rgb(99,102,241) 100%);padding:20px 60px 0;display:block;">
  <div style="display:table;width:100%;margin-bottom:18px;">
    <span style="display:table-cell;vertical-align:middle;font-size:14px;font-weight:700;color:#fff;letter-spacing:.3px;">Testably</span>
    <span style="display:table-cell;vertical-align:middle;text-align:right;font-size:10px;color:rgba(255,255,255,.8);">Report Generated: ${today}</span>
  </div>
  <div style="font-size:24px;font-weight:700;color:#fff;margin-bottom:5px;">${e(data.projectName)}</div>
  <div style="font-size:13px;color:rgba(255,255,255,.85);">Quality Executive Report</div>
</div>

<div class="pdf-content" style="padding-top:16px;">
  <div class="sec-title" style="margin-top:0;">Release Readiness</div>
  <div style="background:${releaseBg};border:2px solid ${releaseBorder};border-radius:10px;padding:14px 18px;margin-bottom:12px;">
    <div style="display:table;width:100%;">
      <div style="display:table-cell;vertical-align:middle;width:62px;">
        <div style="width:44px;height:44px;border-radius:50%;background:${releaseColor};font-size:22px;font-weight:700;color:#fff;text-align:center;line-height:44px;">${releaseIcon}</div>
      </div>
      <div style="display:table-cell;vertical-align:middle;padding-left:18px;">
        <div style="font-size:15px;font-weight:700;color:${releaseColor};">${releaseLabel}</div>
        <div style="font-size:12px;font-weight:700;color:rgb(15,23,42);margin-top:2px;">Score: ${data.releaseScore} / 100</div>
        <div style="font-size:10px;color:rgb(100,116,139);margin-top:2px;">
          ${data.releaseStatus === 'RELEASE_READY' ? 'Project meets quality gates for release' : data.releaseStatus === 'CONDITIONAL' ? 'Conditional release — some gates not met' : 'Project does not meet release criteria'}
        </div>
      </div>
    </div>
  </div>

  <table style="width:100%;table-layout:fixed;border-collapse:collapse;margin-bottom:14px;">
    <tr>
      <td style="width:25%;vertical-align:top;padding-right:4px;">
        <div class="kpi-card" style="text-align:center;padding:8px 10px;">
          <div class="kpi-label">Pass Rate (40%)</div>
          <div style="font-size:13px;font-weight:700;color:${pctColor(data.passRate)};">${data.passRate.toFixed(1)}%</div>
        </div>
      </td>
      <td style="width:25%;vertical-align:top;padding:0 2px;">
        <div class="kpi-card" style="text-align:center;padding:8px 10px;">
          <div class="kpi-label">Critical Pass (25%)</div>
          <div style="font-size:13px;font-weight:700;color:rgb(15,23,42);">${scoreBreak.critBugResolution.toFixed(0)}%</div>
        </div>
      </td>
      <td style="width:25%;vertical-align:top;padding:0 2px;">
        <div class="kpi-card" style="text-align:center;padding:8px 10px;">
          <div class="kpi-label">Coverage (20%)</div>
          <div style="font-size:13px;font-weight:700;color:${pctColor(scoreBreak.coverageRate)};">${scoreBreak.coverageRate.toFixed(0)}%</div>
        </div>
      </td>
      <td style="width:25%;vertical-align:top;padding-left:4px;">
        <div class="kpi-card" style="text-align:center;padding:8px 10px;">
          <div class="kpi-label">Milestone (15%)</div>
          <div style="font-size:13px;font-weight:700;color:${pctColor(scoreBreak.milestoneProgress)};">${scoreBreak.milestoneProgress.toFixed(0)}%</div>
        </div>
      </td>
    </tr>
  </table>

  <div class="sec-title">Key Performance Indicators</div>
  <table style="width:100%;table-layout:fixed;border-collapse:collapse;margin-bottom:14px;">
    <tr>
      ${kpiItems.slice(0, 3).map((k, i) => `
      <td style="width:33.33%;vertical-align:top;${i < 2 ? 'padding-right:5px;' : ''}${i > 0 ? 'padding-left:5px;' : ''}">
        <div class="kpi-card">
          <div class="kpi-label">${e(k.label)}</div>
          <div class="kpi-val">${e(k.val)}${k.sub ? `<span style="font-size:11px;font-weight:400;color:rgb(100,116,139);"> ${e(k.sub)}</span>` : ''}</div>
          ${deltaHtml(k.delta, k.positive)}
        </div>
      </td>`).join('')}
    </tr>
    <tr>
      ${kpiItems.slice(3, 6).map((k, i) => `
      <td style="width:33.33%;vertical-align:top;padding-top:5px;${i < 2 ? 'padding-right:5px;' : ''}${i > 0 ? 'padding-left:5px;' : ''}">
        <div class="kpi-card">
          <div class="kpi-label">${e(k.label)}</div>
          <div class="kpi-val">${e(k.val)}${k.sub ? `<span style="font-size:11px;font-weight:400;color:rgb(100,116,139);"> ${e(k.sub)}</span>` : ''}</div>
          ${deltaHtml(k.delta, k.positive)}
        </div>
      </td>`).join('')}
    </tr>
  </table>

  ${data.risks.length > 0 ? `
  <div class="sec-title">Risk Highlights</div>
  <div style="margin-bottom:14px;">
    ${data.risks.slice(0, 3).map(r => `
    <div style="display:table;width:100%;padding:5px 0;border-bottom:1px solid rgb(241,245,249);">
      <span style="display:table-cell;vertical-align:middle;width:18px;">
        <span style="width:10px;height:10px;border-radius:50%;background:${riskColorMap[r.severity] || 'rgb(234,179,8)'};display:inline-block;"></span>
      </span>
      <span style="display:table-cell;vertical-align:middle;font-size:10px;color:rgb(15,23,42);">${e(r.message)}</span>
    </div>`).join('')}
  </div>` : ''}

  <div class="sec-title">Table of Contents</div>
  <div style="background:rgb(248,250,252);border:1px solid rgb(226,232,240);border-radius:6px;padding:12px 16px;">
    ${tocPages.map(p => `
    <div style="display:table;width:100%;padding:4px 0;border-bottom:1px dashed rgb(226,232,240);">
      <span style="display:table-cell;vertical-align:middle;font-size:10px;color:rgb(15,23,42);">${e(p.label)}</span>
      <span style="display:table-cell;vertical-align:middle;width:1%;white-space:nowrap;font-size:10px;font-weight:600;color:rgb(99,102,241);text-align:right;">${p.n}</span>
    </div>`).join('')}
  </div>
</div>

<div class="pdf-footer">
  <span style="position:absolute;left:80px;top:0;height:48px;line-height:48px;">${e(data.projectName)}</span>
  <span style="position:absolute;left:0;right:0;top:0;height:48px;line-height:48px;text-align:center;">Generated by Testably — ${today}</span>
  <span style="position:absolute;right:80px;top:0;height:48px;line-height:48px;">Page ${pageNum} of ${totalPages}</span>
</div>`;
}
