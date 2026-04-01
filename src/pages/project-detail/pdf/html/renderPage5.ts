import { PdfData } from '../pdfTypes';
import { e, pctColor, fmtDate } from './htmlUtils';

function buildBurndownSvg(data: PdfData, w: number, h: number): string {
  const pts = data.burndownData;
  if (pts.length < 2) {
    return `<div style="display:flex;align-items:center;justify-content:center;height:${h}px;font-size:11px;color:rgb(100,116,139);">No burndown data available.</div>`;
  }
  const totalTCs = data.burndownTotalTCs || 1;
  const n = pts.length - 1;
  const today = fmtDate();

  const toX = (i: number) => ((i / n) * w).toFixed(1);
  const toY = (v: number) => (h - (v / totalTCs) * h).toFixed(1);

  // Grid lines
  const gridLines = [0, 0.25, 0.5, 0.75, 1.0].map(f => {
    const gy = (h - f * h).toFixed(1);
    return `<line x1="0" y1="${gy}" x2="${w}" y2="${gy}" stroke="rgb(226,232,240)" stroke-width="0.5" stroke-dasharray="3,2"/>`;
  }).join('');

  // Y labels
  const yLabels = [0, 0.25, 0.5, 0.75, 1.0].map(f => {
    const gy = (h - f * h).toFixed(1);
    const val = Math.round(totalTCs * f);
    return `<text x="-5" y="${gy}" font-size="9" fill="rgb(100,116,139)" text-anchor="end" dominant-baseline="middle">${val}</text>`;
  }).join('');

  // Ideal line
  const idealLine = `<line x1="0" y1="0" x2="${w}" y2="${h}" stroke="rgb(100,116,139)" stroke-width="1" stroke-dasharray="6,4"/>`;

  // Actual line + dots
  const actualPts = pts.map((pt, i) => `${toX(i)},${toY(pt.remaining)}`).join(' ');
  const actualLine = `<polyline fill="none" stroke="rgb(99,102,241)" stroke-width="2" points="${actualPts}"/>`;
  const actualDots = pts.filter((_, i) => i % Math.max(1, Math.floor(n / 8)) === 0 || i === n)
    .map((pt, _, arr, i2 = pts.indexOf(pt)) =>
      `<circle cx="${toX(i2)}" cy="${toY(pt.remaining)}" r="3" fill="rgb(99,102,241)"/>`
    ).join('');

  // Today marker
  let todayLine = '';
  let todayIdx = pts.length - 1;
  for (let i = 0; i < pts.length; i++) {
    if (pts[i].date <= today) todayIdx = i;
  }
  const todayX = parseFloat(toX(todayIdx));
  if (todayX > 0 && todayX < w - 1) {
    todayLine = `
      <line x1="${todayX.toFixed(1)}" y1="0" x2="${todayX.toFixed(1)}" y2="${h}" stroke="rgb(239,68,68)" stroke-width="1" stroke-dasharray="3,2"/>
      <text x="${todayX.toFixed(1)}" y="-5" font-size="9" fill="rgb(239,68,68)" text-anchor="middle">Today</text>`;
  }

  // X-axis labels
  const interval = Math.max(1, Math.floor(n / 5));
  const xLabels = pts.filter((_, i) => i % interval === 0 || i === n).map((pt, _, arr, i2 = pts.indexOf(pt)) => {
    const d = new Date(pt.date);
    const lbl = `${d.getMonth() + 1}/${d.getDate()}`;
    return `<text x="${toX(i2)}" y="${h + 14}" font-size="9" fill="rgb(100,116,139)" text-anchor="middle">${lbl}</text>`;
  }).join('');

  return `<svg width="${w}" height="${h + 20}" viewBox="-30 -16 ${w + 35} ${h + 36}" overflow="visible">
  ${gridLines}
  ${yLabels}
  ${idealLine}
  ${actualLine}
  ${actualDots}
  ${todayLine}
  ${xLabels}
  <line x1="0" y1="${h}" x2="${w}" y2="${h}" stroke="rgb(226,232,240)" stroke-width="0.5"/>
</svg>`;
}

export function renderPage5(data: PdfData, pageNum: number, totalPages: number, tierLevel: number): string {
  const today = fmtDate();

  const badgeColors: Record<string, { bg: string; text: string }> = {
    'On Track':  { bg: 'rgb(236,253,245)', text: 'rgb(16,163,127)' },
    'At Risk':   { bg: 'rgb(255,251,235)', text: 'rgb(245,158,11)' },
    'Overdue':   { bg: 'rgb(254,242,242)', text: 'rgb(239,68,68)' },
    'Completed': { bg: 'rgb(238,242,255)', text: 'rgb(99,102,241)' },
  };

  const maxCards = tierLevel <= 1 ? 1 : 4;
  const cards = data.milestoneCards.slice(0, maxCards);

  const statusIconColors: Record<string, string> = {
    pass: 'rgb(16,163,127)',
    warn: 'rgb(249,115,22)',
    fail: 'rgb(239,68,68)',
  };
  const statusIcons: Record<string, string> = { pass: '✓', warn: '!', fail: '✕' };
  const verdictColors: Record<string, string> = {
    PASS: 'rgb(16,163,127)', WARN: 'rgb(249,115,22)', FAIL: 'rgb(239,68,68)',
  };

  const milestoneName = data.burndownMilestoneName.length > 30
    ? data.burndownMilestoneName.slice(0, 27) + '...'
    : data.burndownMilestoneName;

  const CW = 634;

  return `
<div class="pdf-header">
  <span class="logo">Testably</span>
  <span class="page-title">Milestone &amp; Release Readiness</span>
</div>

<div class="pdf-content">
  <div class="sec-title" style="margin-top:0;">Milestone Overview</div>
  <div style="display:grid;grid-template-columns:repeat(${cards.length > 1 ? 2 : 1},1fr);gap:10px;margin-bottom:14px;">
    ${cards.map(m => {
      const bc = badgeColors[m.status] || badgeColors['On Track'];
      const barFillPct = Math.min(m.progress, 100);
      const dSign = m.daysRemaining >= 0 ? '-' : '+';
      const dueColor = m.status === 'Overdue' ? 'rgb(239,68,68)' : 'rgb(100,116,139)';
      return `
    <div style="background:#fff;border:1px solid rgb(226,232,240);border-radius:8px;padding:14px;position:relative;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px;">
        <div style="font-size:12px;font-weight:700;color:rgb(15,23,42);flex:1;padding-right:8px;">${e(m.name.length > 28 ? m.name.slice(0, 25) + '...' : m.name)}</div>
        <span style="background:${bc.bg};color:${bc.text};font-size:9px;font-weight:700;padding:3px 8px;border-radius:6px;white-space:nowrap;">${e(m.status)}</span>
      </div>
      <div style="font-size:11px;font-weight:700;color:rgb(15,23,42);margin-bottom:4px;">Progress: ${m.progress}%</div>
      <div style="height:6px;background:rgb(241,245,249);border-radius:3px;overflow:hidden;margin-bottom:10px;">
        <div style="width:${barFillPct}%;height:100%;background:rgb(${m.progressColor.join(',')});border-radius:3px;"></div>
      </div>
      <div style="font-size:10px;color:${dueColor};margin-bottom:3px;">Due: ${e(m.dueDate)} (D${dSign}${Math.abs(m.daysRemaining)})</div>
      <div style="font-size:10px;color:rgb(100,116,139);margin-bottom:3px;">Remaining: ${m.remainingTCs} TCs</div>
      <div style="font-size:10px;color:rgb(100,116,139);margin-bottom:3px;">Velocity: ${m.velocity > 0 ? m.velocity.toFixed(1) : '0.0'} TC/day</div>
      <div style="font-size:10px;color:rgb(100,116,139);">Est. Completion: ${m.velocity > 0 ? e(m.estCompletion) : 'N/A'}</div>
    </div>`;
    }).join('')}
  </div>

  ${tierLevel >= 3 ? `
  <div class="sec-title">Burndown — ${e(milestoneName)}</div>
  <div style="padding:8px 0;margin-bottom:4px;">
    ${buildBurndownSvg(data, CW, 160)}
  </div>
  <div style="text-align:center;font-size:9px;color:rgb(100,116,139);margin-bottom:14px;">
    <span style="margin-right:16px;color:rgb(100,116,139);">- - - Ideal</span>
    <span style="color:rgb(99,102,241);">— Actual</span>
    ${data.burndownData.length > 1 ? '<span style="margin-left:16px;color:rgb(239,68,68);">| Today</span>' : ''}
  </div>` : ''}

  ${data.qualityGates.length > 0 ? `
  <div class="sec-title">Release Quality Gates</div>
  <table class="pdf-table" style="font-size:10px;">
    <thead>
      <tr><th style="width:35%;">Gate</th><th style="width:12%;text-align:center;">Status</th><th style="width:16%;">Threshold</th><th style="width:16%;">Actual</th><th style="width:21%;">Verdict</th></tr>
    </thead>
    <tbody>
      ${data.qualityGates.map(g => `
      <tr>
        <td>${e(g.name)}</td>
        <td style="text-align:center;">
          <!-- Fix 2: flex centering for status icon circle -->
          <span style="display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;border-radius:50%;background:${statusIconColors[g.status] || statusIconColors.pass};color:#fff;font-size:11px;font-weight:700;line-height:1;">
            ${statusIcons[g.status] || '?'}
          </span>
        </td>
        <td class="c-light">${e(g.threshold)}</td>
        <td class="c-light">${e(g.actual)}</td>
        <td style="font-weight:700;color:${verdictColors[g.verdict] || 'rgb(15,23,42)'};">${e(g.verdict)}</td>
      </tr>`).join('')}
    </tbody>
  </table>` : ''}
</div>

<div class="pdf-footer">
  <span>${e(data.projectName)}</span>
  <span>Generated by Testably — ${today}</span>
  <span>Page ${pageNum} of ${totalPages}</span>
</div>`;
}
